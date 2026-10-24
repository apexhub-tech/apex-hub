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
  *.html              26 working templates (SaaS apps, websites, online stores)
  css/                One stylesheet per template
  js/                 One script per template
  shared/             Code shared by all templates
    app-kit.js/.css   Modals, toasts, saved data, charts, keyboard shortcuts
    shop-kit.js       Cart, quick view, wishlist, checkout, order history
    template-bar.css  The "← Apex Hub templates" bar on every template
    thumb.js          Preview mode used by the gallery thumbnails
```

### Templates

| Type | Templates |
|---|---|
| SaaS apps | POS & inventory, QR menu & table ordering, CRM, invoicing, clinic booking, gym management, online academy, social media scheduler, delivery tracking |
| Websites | Mediterranean restaurant, fast food, coffee chain, fine dining, hotel & resort, real estate, fitness club, spa & salon, law firm, photography portfolio |
| Online stores | Fashion, sneaker drops, bakery, grocery delivery, electronics, furniture, skincare |

Every template works as a demo: data (orders, bookings, carts and so on) is saved in the visitor's browser with `localStorage`, and each one has a "Reset demo" option. Checkouts are demos and take no real payment. The test card is `4242 4242 4242 4242`.

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
