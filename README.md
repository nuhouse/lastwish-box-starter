# Lastwish Box

A secure, mobile-friendly web vault for storing your personal messages, documents, videos, and more—all powered by Firebase!

## Features

- Secure Google or email/password login
- Sidebar with all core features (Personal Messages live, others ready)
- Add, view, and delete text messages, images, videos, files
- Mobile-first layout
- Easy to customize and expand

## Deploy Instructions

1. Clone this repository:
    ```
    git clone https://github.com/nuhouse/lastwish-box-starter.git
    cd lastwish-box-starter
    ```

2. Install dependencies:
    ```
    npm install
    ```

3. Add your `.env` file (see example in repo or Firebase config).

4. Build the app for production:
    ```
    npm run build
    ```

5. Deploy to Firebase Hosting:
    ```
    firebase login
    firebase init   # (select 'Hosting', choose your Firebase project, public dir = build, single-page app = yes)
    firebase deploy
    ```

## Customizing

- Replace `/public/logo-placeholder.png` with your real logo.
- Update brand colors in `/src/styles/main.css`.
- Enable other features by duplicating the pattern in `PersonalMessages.js`.

---

## **Support**

If you get stuck, open an issue or contact your developer!

