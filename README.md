# Apex Hub — Website & Template Gallery

The website for **Apex Hub Technology**, a digital agency offering websites by industry, SaaS products with ready-made templates, and digital marketing (content, graphics and video).

The site is plain HTML, CSS and JavaScript: no build step and no dependencies.

## What's inside

```
index.html            Landing page (services, template gallery, packages, contact)
css/style.css         Landing page styles
js/main.js            Gallery filters, packages comparison, contact form
logo.jpg              Brand logo
templates/
  *.html              29 working templates (SaaS apps, websites, online stores)
  *-admin.html        The admin side of each SaaS app (staff panel, CRM, studio…)
  css/                One stylesheet per page
  js/                 One script per page, plus *-data.js shared by a SaaS app's two sides
  shared/             Code shared by all templates
    app-kit.js/.css   Modals, toasts, saved data, live sync, notifications, sign-in, charts, shortcuts
    admin-shell.css   Sidebar + top bar layout used by some admin panels
    pay-kit.js/.css   Payments: cards, PromptPay & Thai banking, KBZPay/WavePay/AYA/CB/MPU, bank transfer
    shop-kit.js       Cart, quick view, wishlist, checkout, order history
    template-bar.css  The "← Apex Hub templates" bar on every template
    thumb.js          Preview mode used by the gallery thumbnails
```

### Templates

| Type | Templates |
|---|---|
| SaaS apps | POS & inventory, QR menu & table ordering, Korean BBQ buffet, Thai restaurant, dim sum restaurant, CRM, invoicing, clinic booking, gym management, online academy, social media scheduler, delivery tracking |
| Websites | Mediterranean restaurant, fast food, coffee chain, fine dining, hotel & resort, real estate, fitness club, spa & salon, law firm, photography portfolio |
| Online stores | Fashion, sneaker drops, bakery, grocery delivery, electronics, furniture, skincare |

Every template works as a demo: data (orders, bookings, carts and so on) is saved in the visitor's browser with `localStorage`, and each one has a "Reset demo" option. Checkouts are demos and take no real payment. The test card is `4242 4242 4242 4242`.

### SaaS apps: client side and admin side

Each SaaS app has two pages that share the same data, like a real product. Open both in separate tabs: whatever the client does shows up live on the admin side (with a notification), and admin changes update the client page instantly.

| App | Client side | Admin side | Demo admin sign-in |
|---|---|---|---|
| Clinic booking | `clinic.html`: patients book, reschedule, cancel | `clinic-admin.html`: front desk calendar, appointments, patients, doctors, booking rules | admin@carepoint.health |
| Delivery tracking | `tracking.html`: track a parcel, delivery options, report a problem | `tracking-admin.html`: shipments, customer issues, notifications | ops@nordhem.store |
| Social media scheduler | `scheduler.html`: client approves posts, requests new ones, reads the report | `scheduler-admin.html`: agency calendar, queue, approvals, analytics | maya@apexstudio.agency |
| Invoicing | `invoices.html`: client pays invoices online, messages the business | `invoices-admin.html`: invoices, editor, clients, messages, reports | owner@apexhub.studio |
| CRM | `crm.html`: quote form, discovery-call booking, online proposals | `crm-admin.html`: pipeline, contacts, activities, reports | adam@apexstudio.agency |
| Gym | `gym-app.html`: member app with digital card, class booking, renewals | `gym-app-admin.html`: check-in, schedule, members, app requests | desk@ironpulse.gym |
| Online academy | `academy.html`: learner courses, lessons, quizzes, questions | `academy-admin.html`: courses & lessons, learners, Q&A, announcements | coach@brightpath.academy |
| QR menu | `qrmenu.html`: guests order from their table, call a waiter, pay | `qrmenu-admin.html`: kitchen display, service calls, tables, menu | floor@oliveandember.com |
| POS | `pos.html`: order ahead for pickup, live order status, rewards | `pos-admin.html`: register, online order queue, inventory, reports | maya@tallycafe.com |

| Korean BBQ buffet | `kbbq.html`: pick a buffet tier, 100-min timer, order by rounds, change grill | `kbbq-admin.html`: floor with timers, kitchen display, service calls, tier prices, today's sales | floor@seoulember.co.th |
| Thai restaurant | `thai.html`: spice level, protein and rice options per dish | `thai-admin.html`: same staff panel, by wok / curry / salad station | kitchen@baansaeng.co.th |
| Dim sum restaurant | `dimsum.html`: tea per person, tick-sheet ordering, prices in kyat | `dimsum-admin.html`: steamer / fryer / wok stations, tea refills | manager@goldenlotus.com.mm |

The three restaurants share one engine (`js/qr-restaurant-core.js`, `qr-restaurant.js`, `qr-restaurant-admin.js`); each brand is a config file (`js/kbbq-data.js`, `thai-data.js`, `dimsum-data.js`) with its menu, rules, currency and taxes.

**Table access.** A printed table QR only identifies the table. Staff seat each party from the staff panel, which creates a 4-digit table PIN; each phone enters it once to order. Paying, closing the table, re-seating it or pressing "New PIN" disconnects every phone, so nobody can keep ordering after they leave (or order onto another party's bill from home). Three wrong PINs lock entry for 30 seconds and alert staff. In this demo the checks run in the browser — a live system must enforce them on the server.

Every demo admin password is `demo1234`; the sign-in screen also has a "Use demo account" button.

### Payments

Every website and online store has a "Pay your way" section, and every checkout lets customers choose:

- **International:** Visa, Mastercard, JCB, UnionPay, AMEX (card brand detected as you type)
- **Thailand:** PromptPay QR, Thai mobile banking (K PLUS, SCB EASY, Bangkok Bank, Krungthai NEXT, Krungsri), TrueMoney Wallet
- **Myanmar:** KBZPay, WavePay, AYA Pay, CB Pay, UAB Pay, MPU cards
- **Also:** bank transfer with slip upload (Thai, Myanmar and SWIFT accounts) and cash

Prices can be in US$, baht (฿) or kyat (Ks); other currencies show an approximate conversion. QR codes and bank accounts are demo placeholders — connect a real payment provider (e.g. Omise/Opn, 2C2P, KBZPay merchant API) before going live.

## Run it locally

Any static file server works. With Python:

```bash
python -m http.server 5500
```

Then open <http://localhost:5500>. Opening `index.html` directly from disk also works, but some browsers block the gallery's live previews that way.

## Before going live

- Replace the placeholder stats, case-study results, prices and contact details (search the code for `TODO`).
- Connect the contact forms, bookings and checkouts to a backend (database, payment provider, email/SMS).
- Photos are loaded from [Unsplash](https://unsplash.com) under the Unsplash License. Download the ones you keep and host them yourself.
