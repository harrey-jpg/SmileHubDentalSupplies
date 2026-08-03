# SmileHub v4.1 fixes

- Checkout phone verification now happens inline; no Profile/Change Password redirect.
- Routine click notifications are suppressed. Important errors, verification, profile-save, and order messages remain.
- Notification preferences are under Profile.
- SmileBot local fallback now handles greetings, vague questions, checkout problems, product guidance, budgets, and follow-up context.
- Real generative AI still requires the secure `/api/ai/chat` Firebase Function and a server-side provider key.
