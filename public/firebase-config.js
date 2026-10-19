// Public Firebase web configuration. These values are safe to use in browser code.
// Access control is enforced by Firestore Security Rules, never by hiding this config.
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {
  getAuth,
  GoogleAuthProvider,
  setPersistence,
  browserLocalPersistence,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';

export const firebaseConfig = {
  apiKey: 'AIzaSyBQp9hBPcUt-96EqWTiND76hcWBf5nSnQ',
  authDomain: 'dailydeals-bd.firebaseapp.com',
  projectId: 'dailydeals-bd',
  storageBucket: 'dailydeals-bd.firebasestorage.app',
  messagingSenderId: '727834363393',
  appId: '1:727834363393:web:2a45c1c9f5f6b07e3fa200',
  measurementId: 'G-G98HCT4XKN',
};

export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
export const googleProvider = new GoogleAuthProvider();
setPersistence(auth, browserLocalPersistence).catch(() => {});
