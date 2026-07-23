# SmileHub Dental Supplies — Frontend Demo

This version uses only plain HTML, CSS, and JavaScript.

## Start page

Open `homepage.html` or `index.html`.

For the most consistent browser storage behavior, open the folder with the VS Code **Live Server** extension. The project also includes a same-tab fallback for browsers that treat separate `file://` pages differently.

## Demo accounts

### Customer

- Email: `customer@smilehub.ph`
- Password: `demo123`

### Administrator

- Email: `admin@smilehub.ph`
- Password: `admin123`

## Access rules

When signed out, visitors can only use:

- `homepage.html`
- `login.html`
- `register.html`

Opening any shop, customer, company, or admin page sends the visitor to the login page. Add-to-cart and wishlist buttons on the landing page also require customer login.

Customer accounts can use the catalog, product page, cart, checkout, wishlist, orders, and `profile.html`.

The admin account can open `admin.html`. Customer accounts cannot open the admin dashboard.

## Customer profile

`profile.html` allows the customer to:

- Edit first name and last name
- Change email address
- Change phone number
- Update the default delivery address
- Change the account password
- Log out

Profile information is stored in the browser for this frontend demonstration.

## Important note

This is frontend-only access control. It is useful for demonstrating page flow, but it is not secure authentication. Real security requires a backend, database, password hashing, and server-side authorization.
