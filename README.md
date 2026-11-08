# IHA Online Shop

A multi-page e-commerce site with a real MySQL database, cart, checkout,
order tracking, and a password-protected admin panel. Built to run on
ordinary PHP + MySQL shared hosting (cPanel, Hostinger, etc.) — no
Node.js or special server setup required.

## What's included

```
index.html            Home page (welcome popup shows here once per visit)
shop.html              All Products — advanced filters (category, price, sort)
jewelry.html           Jewelry category (with price/sort sidebar)
household.html         Household category (with price/sort sidebar)
gadgets.html           Gadgets category (with price/sort sidebar)
dresses.html           Dresses category (with price/sort sidebar)
cart.html              Cart + checkout (Cash on Delivery / EasyPaisa / JazzCash / Bank)
track-order.html       Order tracking by order ID (shows payment status too)
admin.html             Admin panel (password protected)
about.html             About Us
contact.html           Contact Us (working form, saved to database)
faqs.html              FAQs (accordion)
help-center.html       Help Center hub
help/                  Shipping / Return / Privacy / Terms / Warranty / Support pages
assets/css/style.css   Shared styles
assets/js/*.js         Shared front-end logic
assets/images/         Logo + product illustrations
api/                   PHP backend (talks to MySQL)
  config.php           <-- edit this with your database + payment account details
  db.sql               <-- import this into your MySQL database (fresh installs)
  upgrade.sql          <-- run this instead if you already imported an older db.sql
  *.php                API endpoints used by the front-end
```

## Setup on cPanel / Hostinger (step by step)

1. **Create a MySQL database**
   In cPanel: *MySQL Databases* → create a database and a database user,
   and add that user to the database with **All Privileges**.
   Hostinger: *Databases* → *MySQL Databases* → same idea.
   Note down: database name, database username, database password.

2. **Import the schema**
   Open **phpMyAdmin**, select your new (empty) database, go to the
   **Import** tab, and upload `api/db.sql`. This creates the `products`,
   `orders`, `order_items`, `messages`, and `rate_limit_log` tables and
   adds 20 starter products (5 per category).

3. **Set up your admin password (hashed, not plain text)**
   Upload the site first (step 4), then visit
   `https://yourdomain.com/api/tools/generate_hash.php`, type the password
   you want to use, and copy the hash it gives you into
   `$ADMIN_PASSWORD_HASH` in `api/config.php`. **Then delete
   `api/tools/generate_hash.php`** (or the whole `tools` folder) — it has
   no reason to stay reachable once you've used it.

4. **Edit `api/config.php`**
   Fill in your 4 database values, plus `$STORE_EMAIL` and
   `$PAYMENT_DETAILS` (your real EasyPaisa/JazzCash numbers and bank
   account) so customers see the right information at checkout.

5. **Upload everything**
   Upload the entire project folder (all files and subfolders) into
   `public_html` (or a subfolder if you want it at a sub-path) via
   cPanel File Manager or FTP.

6. **Visit your site**
   Go to `https://yourdomain.com/index.html` (or just
   `https://yourdomain.com/` if you rename it appropriately) and it
   should load with the 20 starter products already in place.

7. **Log into the admin panel**
   Go to `/admin.html`, enter the password you chose in step 3, and add
   your real products, prices, stock, and photos. You can paste in image
   URLs, or upload your own images into `assets/images/` via File
   Manager/FTP and reference them like `assets/images/your-photo.jpg`.

## How it works

- **Database**: all products and orders live in MySQL — shared and
  persistent for every visitor, exactly like a real store.
- **Cart**: stored in the visitor's browser (`localStorage`) until they
  check out, since it's personal to them and doesn't need a login.
- **Orders**: created via `api/place_order.php`, which locks stock rows
  during checkout so two people can't both buy the last item.
- **Admin**: `admin.html` is gated by a PHP session — the password check
  happens in `api/admin_login.php`. All the product/order-editing
  endpoints (`manage_product.php`, `update_order_status.php`,
  `admin_orders.php`) refuse to run unless that session is present.
- **Contact messages**: submissions from `contact.html` are saved to the
  `messages` table and (best-effort) emailed to `$STORE_EMAIL` in
  `api/config.php`, if your host's `mail()` function works. Check the
  `messages` table in phpMyAdmin if you're not sure an email arrived.
- **Payment screenshot proof**: for EasyPaisa, JazzCash, and Bank Transfer,
  customers must attach a screenshot of their payment before the order can
  be placed (the reference/transaction ID field stays optional — the
  screenshot is what's required). Cash on Delivery skips this entirely.
  Screenshots are validated server-side (must be a real JPG/PNG/WEBP
  image, max 5MB, random filename — never trusts the uploaded filename)
  and stored in `uploads/payment_proofs/`. In the admin panel, each order
  with a screenshot gets a **"🖼️ View Screenshot"** link; orders missing
  one (for non-COD methods) are flagged so nothing slips through
  unverified.
- **WhatsApp order notifications**: every order in the admin panel now has
  a **"💬 Notify on WhatsApp"** button — click it and WhatsApp opens with
  the customer's number and a pre-filled confirmation message (order ID,
  items, total, payment method, status) ready to send. This works today,
  for free, with zero signup, because WhatsApp doesn't allow businesses to
  auto-message customers who haven't messaged first — that's a WhatsApp
  anti-spam rule, not a limitation here. If you later want it to send
  automatically (no click needed): sign up for the official WhatsApp
  Business Cloud API at business.facebook.com (it has a real free tier),
  get a phone number ID + access token, get a message template approved
  (required for the first message to someone), then fill in the
  `$WHATSAPP_*` settings in `api/config.php` and set `$WHATSAPP_ENABLED`
  to `true`. The code to actually send it is already there and wired up
  — it just does nothing until you turn it on.
- **Categories**: fully dynamic now — no more manual work per category. In
  the admin panel's product form, the category dropdown has a
  **"+ Add new category"** option — pick it, type any new name, save. That
  new category immediately appears in: the main navigation bar on every
  page, the homepage's "Shop Categories" section, and `shop.html`'s filter
  sidebar — automatically, with no file edits needed. Every category
  (old or new) is browsable at `category.html?cat=CategoryName`, which
  reads the name from the URL and shows matching products with the same
  price/sort filters as everywhere else.
- **Advanced filtering**: `shop.html` (All Products) has a full sidebar —
  filter by multiple categories at once, a min/max price range, and sort
  by price or name. Each category page (`jewelry.html`, etc.) has the
  same price + sort sidebar, locked to that one category.
- **Payment methods**: checkout on `cart.html` offers Cash on Delivery,
  EasyPaisa, JazzCash, and Bank Transfer. There's no live payment
  gateway — wallet/bank account numbers are set once in `api/config.php`
  (`$PAYMENT_DETAILS`) and shown automatically at checkout so customers
  can send payment manually. Orders placed with a wallet/bank method
  start as "Pending Confirmation" until you mark them "Paid" in the
  admin panel after checking your account for the payment (customers
  can optionally enter a transaction ID to help you match it up).
- **Welcome popup**: shows once per browser session on the home page with
  a welcome image and message. Edit the image/text directly in `index.html`
  (search for `welcomeOverlay`), or change `SEEN_KEY` behavior if you'd
  rather it show on every visit.

## Security — what's built in

This isn't a "nothing can ever go wrong" claim — no internet-facing site
truly is unhackable — but the common ways small stores actually get
broken into are covered:

- **SQL injection**: every database query uses parameterized/prepared
  statements (PDO), never raw string concatenation of user input.
- **XSS (cross-site scripting)**: anything a visitor could type — names,
  messages, order details — is escaped before being displayed anywhere,
  including in the admin panel.
- **CSRF (cross-site request forgery)**: every admin action that changes
  data (add/edit/delete product, update order status) requires a secret
  token tied to the logged-in session, not just the session cookie alone.
- **Brute-force protection**: admin login is limited to 6 tries per 15
  minutes per IP address. Order tracking, order placement, and the
  contact form are all similarly rate-limited to stop automated abuse.
- **Password storage**: the admin password is stored as a bcrypt hash,
  never in plain text — even if `config.php` ever leaked, the actual
  password isn't recoverable from it.
- **Session security**: session cookies are HttpOnly (JavaScript can't
  read them) and SameSite=Lax (blocks most cross-site attacks); admin
  sessions auto-expire after 30 minutes of inactivity; the session ID is
  regenerated on login to block session-fixation attacks.
- **Input validation**: product categories, image URLs, prices, and
  stock are all validated/whitelisted server-side — not just trusted
  from the browser.
- **Spam protection**: the contact form has a hidden honeypot field that
  quietly blocks simple bots.
- **Security headers**: `X-Content-Type-Options`, `X-Frame-Options`,
  `Referrer-Policy`, and a locked-down `Permissions-Policy` are sent on
  every response.
- **File protection**: `.htaccess` rules block directory browsing,
  direct access to `.sql`/`.log`/`.env` files, and PHP execution inside
  the images folder.
- **Error handling**: PHP errors are logged, never shown to visitors
  (which would otherwise leak file paths or database structure).

### A few things you still need to do yourself
- **Turn on HTTPS/SSL** in cPanel/Hostinger (usually free, one click),
  then uncomment the HTTPS-redirect lines at the bottom of the root
  `.htaccess`.
- **Delete `api/tools/generate_hash.php`** after generating your
  password hash (see step 3 above) — it has no reason to stay reachable.
- **Keep PHP and MySQL updated** — your host usually handles this, but
  check occasionally.
- **Back up your database regularly** via phpMyAdmin's Export tab.
- If you ever suspect a break-in: generate a new password hash and
  update `$ADMIN_PASSWORD_HASH` immediately, and check the
  `orders`/`products` tables in phpMyAdmin for anything unexpected.

## Testing "Add to Cart"

There are 20 sample products already loaded (5 per category), so you can
click around and test the full flow immediately: browse `shop.html` or
any category page → Add to Cart → Cart page → pick a payment method →
Place Order → look it up on Track Order. The homepage also has a
"Featured Products" section with working Add to Cart buttons, so you
don't even need to leave `index.html` to try it.

## Local testing before uploading

If you have PHP installed locally, you can test from inside the project
folder with:
```
php -S localhost:8000
```
then visit `http://localhost:8000`. You'll still need a MySQL server
running locally with the schema imported for the API calls to work.
