# SmileHub current build

Verified visible changes in this package:

- Buy Now appears on the product detail page, product catalog cards, featured products, and new-arrival cards.
- Buy Now sends only the selected product and quantity to checkout without deleting the existing cart.
- Profile first name, last name, birthday, and phone fields are editable.
- Profile photos can be selected, previewed, resized in the browser, saved to the signed-in user's Firestore profile, removed, and displayed again.
- Delivery address remains editable and saved separately.
- Checkout no longer automatically redirects users to Profile when phone verification is missing; it keeps a local draft and displays a verification link.
- Repeated toast messages are deduplicated and routine success messages disappear quickly.

External setup is still required for real SMS quota, production AI, Google Places, payments, and automated email delivery.
