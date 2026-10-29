"""Apex Hub local server — serves the website and connects the contact form to the agency dashboard.

    python server.py                 # http://localhost:5500
    python server.py --port 8000 --host 0.0.0.0   # reachable from other devices on your network

No packages needed (Python 3.9+). Everything is stored as JSON in ./data (git-ignored):
    users.json    team logins (password hashes)     agency.json   dashboard data
    inbox.json    enquiries waiting for the dashboard   secret.key    signs sign-in tokens

The first run creates the admin login from APEXHUB_ADMIN_EMAIL / APEXHUB_ADMIN_PASSWORD
(default admin@apexhub.info / demo1234). Add a teammate with:  python server.py --add-user email "Full name"
"""
import argparse, base64, getpass, hashlib, hmac, json, os, re, secrets, threading, time
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

ROOT = Path(__file__).resolve().parent
DATA = ROOT / 'data'
TOKEN_TTL = 12 * 3600            # sign-ins last 12 hours
MAX_BODY = 5 * 1024 * 1024       # dashboard state can be a few hundred KB; leads are tiny
EMAIL = re.compile(r'^[^\s@]+@[^\s@]+\.[^\s@]+$')
FIELDS = {'name': 120, 'email': 200, 'service': 120, 'message': 4000, 'source': 160}

lock = threading.Lock()
changed = threading.Condition(lock)   # wakes the live-update streams
events = {'agency': 0, 'inbox': 0}    # bumped on every change
hits = {}                             # ip -> recent lead timestamps (rate limit)


def read(name, default):
    try:
        return json.loads((DATA / name).read_text('utf-8'))
    except (FileNotFoundError, json.JSONDecodeError):
        return default


def write(name, value):
    tmp = DATA / (name + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False), 'utf-8')
    tmp.replace(DATA / name)          # atomic, so a crash never leaves half a file


def hash_pw(password, salt=None):
    salt = salt or secrets.token_bytes(16)
    return salt.hex() + ':' + hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 200_000).hex()


def check_pw(password, stored):
    salt, _ = stored.split(':')
    return hmac.compare_digest(hash_pw(password, bytes.fromhex(salt)), stored)


def secret():
    path = DATA / 'secret.key'
    if not path.exists():
        path.write_bytes(secrets.token_bytes(32))
    return path.read_bytes()


def make_token(email):
    body = base64.urlsafe_b64encode(json.dumps({'e': email, 'x': int(time.time()) + TOKEN_TTL}).encode()).decode()
    return body + '.' + hmac.new(secret(), body.encode(), 'sha256').hexdigest()


def token_user(token):
    try:
        body, sig = token.split('.')
        if not hmac.compare_digest(sig, hmac.new(secret(), body.encode(), 'sha256').hexdigest()):
            return None
        claim = json.loads(base64.urlsafe_b64decode(body))
        user = read('users.json', {}).get(claim['e'])
        return user and claim['x'] > time.time() and {**user, 'email': claim['e']}
    except (ValueError, KeyError, TypeError):
        return None


def bump(kind):
    events[kind] += 1
    changed.notify_all()


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(ROOT), **kw)

    # ---------- helpers ----------
    def send_json(self, status, value=None):
        body = b'' if value is None else json.dumps(value).encode()
        self.send_response(status)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Cache-Control', 'no-store')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        size = int(self.headers.get('Content-Length') or 0)
        if size > MAX_BODY:
            raise ValueError('too large')
        return json.loads(self.rfile.read(size) or b'{}')

    def user(self):
        auth = self.headers.get('Authorization', '')
        token = auth[7:] if auth.startswith('Bearer ') else parse_qs(urlsplit(self.path).query).get('token', [''])[0]
        return token_user(token)

    def end_headers(self):
        if not self.path.startswith('/api/'):
            self.send_header('Cache-Control', 'no-cache')   # always serve the latest JS/CSS while developing
        super().end_headers()

    def log_message(self, fmt, *args):   # keep sign-in tokens out of the console
        print('%s  %s' % (self.log_date_time_string(), (fmt % args).split('?')[0]))

    # ---------- routes ----------
    def do_GET(self):
        path = urlsplit(self.path).path
        if path.rstrip('/') == '/data' or path.startswith('/data/') or path.endswith('.py') or '/.' in path:
            return self.send_error(HTTPStatus.NOT_FOUND)
        if path == '/api/health':
            return self.send_json(200, {'ok': True})
        if path.startswith('/api/'):
            user = self.user()
            if not user:
                return self.send_json(401, {'error': 'Sign in again.'})
            if path == '/api/me':
                return self.send_json(200, {'email': user['email'], 'name': user['name'], 'role': user['role']})
            if path == '/api/agency':
                with lock:
                    return self.send_json(200, read('agency.json', {'rev': 0, 'data': None}))
            if path == '/api/events':
                return self.stream()
            return self.send_json(404, {'error': 'Not found'})
        return super().do_GET()

    def do_HEAD(self):
        if urlsplit(self.path).path.startswith(('/data/', '/api/')):
            return self.send_error(HTTPStatus.NOT_FOUND)
        return super().do_HEAD()

    def do_POST(self):
        path = urlsplit(self.path).path
        try:
            body = self.body()
        except (ValueError, json.JSONDecodeError):
            return self.send_json(400, {'error': 'Send JSON.'})
        if path == '/api/leads':
            return self.new_lead(body)
        if path == '/api/login':
            users = read('users.json', {})
            email = str(body.get('email', '')).strip().lower()
            user = users.get(email)
            if not user or not check_pw(str(body.get('password', '')), user['hash']):
                time.sleep(0.6)                        # slow down password guessing
                return self.send_json(401, {'error': 'That email and password don\'t match.'})
            return self.send_json(200, {'token': make_token(email), 'name': user['name'], 'role': user['role']})
        if not self.user():
            return self.send_json(401, {'error': 'Sign in again.'})
        if path == '/api/inbox/take':                 # hand queued enquiries to the dashboard, once
            with lock:
                items = read('inbox.json', [])
                if items:
                    write('inbox.json', [])
            return self.send_json(200, {'items': items})
        return self.send_json(404, {'error': 'Not found'})

    def do_PUT(self):
        if urlsplit(self.path).path != '/api/agency':
            return self.send_json(404, {'error': 'Not found'})
        if not self.user():
            return self.send_json(401, {'error': 'Sign in again.'})
        try:
            body = self.body()
        except (ValueError, json.JSONDecodeError):
            return self.send_json(400, {'error': 'Send JSON.'})
        if not isinstance(body.get('data'), dict):
            return self.send_json(400, {'error': 'Missing data.'})
        with lock:
            current = read('agency.json', {'rev': 0, 'data': None})
            # Someone saved since this browser last loaded: send back the newer copy instead of overwriting it
            if current['data'] is not None and body.get('rev') != current['rev'] and not body.get('force'):
                return self.send_json(409, current)
            rev = current['rev'] + 1
            write('agency.json', {'rev': rev, 'data': body['data']})
            bump('agency')
        return self.send_json(200, {'rev': rev})

    def new_lead(self, body):
        if body.get('website'):                        # honeypot field that only bots fill in
            return self.send_json(201, {'ok': True})
        ip, now = self.client_address[0], time.time()
        with lock:
            recent = [t for t in hits.get(ip, []) if now - t < 600]
            if len(recent) >= 5:
                return self.send_json(429, {'error': 'Too many requests. Please try again in a few minutes.'})
            hits[ip] = recent + [now]
        lead = {k: str(body.get(k, '')).strip()[:n] for k, n in FIELDS.items()}
        if not lead['name'] or not EMAIL.match(lead['email']):
            return self.send_json(400, {'error': 'Please add your name and a valid email.'})
        lead['ts'] = int(now * 1000)
        with lock:
            write('inbox.json', read('inbox.json', []) + [lead])
            bump('inbox')
        print('  New enquiry from', lead['name'])
        return self.send_json(201, {'ok': True})

    def stream(self):
        """Server-sent events: tells signed-in dashboards when data or the inbox changes."""
        self.send_response(200)
        self.send_header('Content-Type', 'text/event-stream')
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        with lock:
            seen = dict(events)
            rev = read('agency.json', {'rev': 0})['rev']
        try:
            self.wfile.write(f'event: agency\ndata: {rev}\n\n'.encode())
            if read('inbox.json', []):
                self.wfile.write(b'event: inbox\ndata: 1\n\n')
            self.wfile.flush()
            while True:
                with lock:
                    changed.wait(timeout=20)
                    now = dict(events)
                    rev = read('agency.json', {'rev': 0})['rev']
                out = ''
                if now['agency'] != seen['agency']:
                    out += f'event: agency\ndata: {rev}\n\n'
                if now['inbox'] != seen['inbox']:
                    out += 'event: inbox\ndata: 1\n\n'
                seen = now
                self.wfile.write((out or ': ping\n\n').encode())
                self.wfile.flush()
        except (BrokenPipeError, ConnectionResetError, ConnectionAbortedError):
            pass


def ensure_admin():
    users = read('users.json', None)
    if users is None:
        email = os.environ.get('APEXHUB_ADMIN_EMAIL', 'admin@apexhub.info').lower()
        password = os.environ.get('APEXHUB_ADMIN_PASSWORD', 'demo1234')
        write('users.json', {email: {'name': 'Maya Haddad', 'role': 'Founder · Admin', 'hash': hash_pw(password)}})
        print(f'Created admin login {email}' + (' with the demo password — set APEXHUB_ADMIN_PASSWORD before sharing this server.' if password == 'demo1234' else ''))


def add_user(email, name):
    password = getpass.getpass(f'Password for {email}: ')
    users = read('users.json', {})
    users[email.lower()] = {'name': name, 'role': 'Team', 'hash': hash_pw(password)}
    write('users.json', users)
    print('Saved', email)


if __name__ == '__main__':
    ap = argparse.ArgumentParser(description='Apex Hub local server')
    ap.add_argument('--host', default='127.0.0.1')
    ap.add_argument('--port', type=int, default=5500)
    ap.add_argument('--add-user', nargs=2, metavar=('EMAIL', 'NAME'))
    args = ap.parse_args()
    DATA.mkdir(exist_ok=True)
    if args.add_user:
        add_user(*args.add_user)
    else:
        ensure_admin()
        ThreadingHTTPServer.daemon_threads = True
        server = ThreadingHTTPServer((args.host, args.port), Handler)
        print(f'Apex Hub running on http://{"localhost" if args.host == "127.0.0.1" else args.host}:{args.port}  (dashboard: /admin.html)')
        server.serve_forever()
