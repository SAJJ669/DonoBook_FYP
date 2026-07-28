# DonoBook — P2P Book Exchange & Donation Platform

DonoBook is a full-stack Progressive Web App (PWA) built to help students share, exchange, and donate books within their local or academic communities. The goal of the platform is simple: make educational resources easier to access while reducing waste.

The project is built using React (TypeScript) on the frontend, Supabase for backend services, and integrates Google Gemini for basic AI-powered book data extraction.

---

## Key Features

### 📚 Smart Book Upload

Users can upload photos of book covers, and the system automatically extracts useful details like title, author, and category using Google Gemini. It works well even with local Pakistani textbooks.

### 💬 Real-Time Chat

DonoBook includes a built-in messaging system where users can talk directly to each other for exchanges or donations. Messages are updated instantly using Supabase Realtime.

### 🔔 Push Notifications

Users receive notifications for new messages and activity even when the app is closed. This is handled through Firebase Cloud Messaging and a serverless function.

### 📱 Progressive Web App (PWA)

The app can be installed on both mobile and desktop like a native app. It also supports background notifications through a service worker.

### 🔐 Authentication & Security

User authentication is managed by Supabase (email/password and Google login). Row Level Security (RLS) ensures users can only access their own data.

---

## System Overview

```
React Frontend  <----->  Supabase (Database + Auth + Realtime)
       |                              |
       |                              ---> Webhook ---> Vercel Function ---> Firebase (FCM)
       |
       ---> Gemini API (for book data extraction)
```

---

## Tech Stack

* **Frontend:** React, TypeScript, Vite
* **Styling:** Tailwind CSS
* **Backend:** Supabase (PostgreSQL, Auth, Realtime)
* **AI Integration:** Google Gemini API
* **Serverless:** Vercel Functions
* **Notifications:** Firebase Cloud Messaging (FCM)
* **PWA Support:** vite-plugin-pwa

---

## Project Structure

```
DonoBook/
├── api/                       # Serverless functions (notifications)
├── public/                    # Static files & service worker
├── src/
│   ├── components/           # UI components
│   ├── context/              # App state (Auth, etc.)
│   ├── lib/                  # API and Supabase setup
│   ├── pages/                # Main pages
│   ├── utils/                # Helper functions (Gemini integration)
│   ├── App.tsx
│   └── main.tsx
├── supabase/                 # Database schema & functions
├── vite.config.ts
└── package.json
```

---

## Getting Started

### Requirements

* Node.js (v18 or above)
* npm or yarn
* Accounts for Supabase, Firebase, Gemini, and Vercel

### Setup

Create a `.env` file and add your keys:

```env
VITE_SUPABASE_URL=your-url
VITE_SUPABASE_ANON_KEY=your-key

VITE_GEMINI_API_KEY=your-key

VITE_FIREBASE_API_KEY=your-key
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_VAPID_KEY=your-vapid-key
```

For Vercel (notifications function), add:

```env
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=your-email
FIREBASE_PRIVATE_KEY=your-private-key
```

---

## Running the Project

```bash
npm install
npm run dev
```

To build:

```bash
npm run build
```

---

## Security Notes

* Row Level Security (RLS) is enabled on all database tables.
* Users can only modify their own data.
* Sensitive operations (like sending notifications) are handled on the server side.

---

## License

This project was created as a Final Year Project (FYP) for academic purposes.
