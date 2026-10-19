// Daily Deals BD — Firebase Web SDK configuration
// Public web-app config. Data access must be protected by Firebase Security Rules.
import { initializeApp, getApp, getApps } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyBQp9hBPcUt-96EqWTiND76hcWBf5nSnqQ',
  authDomain: 'dailydeals-bd.firebaseapp.com',
  projectId: 'dailydeals-bd',
  storageBucket: 'dailydeals-bd.firebasestorage.app',
  messagingSenderId: '727834363393',
  appId: '1:727834363393:web:2a45c1c9f5f6b07e3fa200',
  measurementId: 'G-G98HCT4XKN',
};

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence).catch((error) => {
  console.error('Firebase Auth persistence could not be set:', error);
});
