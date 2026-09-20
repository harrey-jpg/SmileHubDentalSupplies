# v6.5.3 Cart resurrection fix

Root cause:
- Checkout and Cart did not load `firebase-sync.js`.
- Local cart changes were not persisted to Firestore.
- Product pages later loaded Firebase sync and restored stale remote items.

Fix:
- Added Firebase cart sync to Checkout and Cart.
- Cache-busted the sync script.
- Normal checkout now clears local + Firestore cart.
- Manual cart removals now persist.
- Buy Now still preserves the normal cart.
