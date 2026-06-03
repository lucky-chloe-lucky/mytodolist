// ── Firebase configuration ───────────────────────────────────────────
//
// HOW TO ENABLE CLOUD SYNC (Google login + real-time sync across devices):
//
//   1. Go to https://console.firebase.google.com and create a project.
//   2. Add a "Web app" → copy the firebaseConfig values it shows you.
//   3. In the console: Build → Authentication → enable "Google" sign-in.
//   4. Build → Firestore Database → create database (production mode is fine;
//      paste the security rules from README into Rules tab).
//   5. Paste your values below (or set them as VITE_FIREBASE_* env vars in
//      a .env.local file — those take priority).
//
// Until real values are filled in, the app runs in LOCAL mode using the
// browser's localStorage (single device, no login). Everything still works.

const env = import.meta.env

export const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: env.VITE_FIREBASE_APP_ID ?? '',
}

// Cloud mode turns on only when the essential keys are present.
export const isCloudConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId,
)
