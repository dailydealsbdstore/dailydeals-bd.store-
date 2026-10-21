import { auth, googleProvider, db } from '/firebase-config.js';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
  sendPasswordResetEmail,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { setMessage } from './common.js';

let mode = 'login';
const form = document.querySelector('#authForm');
const message = document.querySelector('#authMessage');

function setMode(next) {
  mode = next;
  document.querySelectorAll('.auth-tab').forEach((button) => {
    button.classList.toggle('active', button.dataset.mode === mode);
  });
  document.querySelector('#authTitle').textContent = mode === 'login'
    ? 'আপনার অ্যাকাউন্টে লগইন করুন'
    : 'নতুন অ্যাকাউন্ট তৈরি করুন';
  document.querySelector('#authIntro').textContent = mode === 'login'
    ? 'অর্ডার ও অ্যাকাউন্টের তথ্য এক জায়গায় রাখুন।'
    : 'অর্ডার সংরক্ষণ ও অর্ডার হিস্টোরি দেখতে অ্যাকাউন্ট তৈরি করুন।';
  document.querySelector('#nameField').classList.toggle('hidden', mode !== 'register');
  document.querySelector('#authSubmit').textContent = mode === 'login' ? 'লগইন করুন' : 'অ্যাকাউন্ট তৈরি করুন';
  document.querySelector('#forgotPassword').classList.toggle('hidden', mode !== 'login');
  document.querySelector('#password').autocomplete = mode === 'login' ? 'current-password' : 'new-password';
  setMessage(message, '');
}

document.querySelectorAll('.auth-tab').forEach((button) => {
  button.addEventListener('click', () => setMode(button.dataset.mode));
});

// Account-prompt links can open the registration tab directly.
if (new URLSearchParams(location.search).get('mode') === 'register') setMode('register');

function goAfterLogin() {
  const next = new URLSearchParams(location.search).get('next');
  location.href = next && next.startsWith('/') ? next : '/account.html';
}

/**
 * Create/update users/{uid} after login or registration.
 * Merge is important: it preserves user-entered fields such as phone/address.
 * No password or admin role is ever written to the user profile.
 */
async function upsertCustomerProfile(user) {
  const profileRef = doc(db, 'users', user.uid);
  const current = await getDoc(profileRef);
  const oldData = current.exists() ? current.data() : {};
  const profile = {
    uid: user.uid,
    email: user.email || oldData.email || '',
    providerIds: (user.providerData || []).map((provider) => provider.providerId),
    emailVerified: Boolean(user.emailVerified),
    lastLoginAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  const displayName = (user.displayName || oldData.displayName || '').trim();
  const photoURL = user.photoURL || oldData.photoURL || '';
  if (displayName) profile.displayName = displayName;
  if (photoURL) profile.photoURL = photoURL;
  if (!current.exists()) profile.createdAt = serverTimestamp();

  await setDoc(profileRef, profile, { merge: true });
}

async function finishAuth(user, successText) {
  try {
    await upsertCustomerProfile(user);
    setMessage(message, `${successText} গ্রাহকের প্রোফাইল Firebase-এ সংরক্ষিত হয়েছে।`, 'success');
  } catch (error) {
    console.error('Could not create/update Firestore users profile:', error);
    const detail = error?.code === 'permission-denied'
      ? ' Firestore Rules-এ users/{UID} ডকুমেন্টে নিজের UID-কে create/update করার অনুমতি আছে কি না দেখুন।'
      : ' ইন্টারনেট ও Firestore Rules পরীক্ষা করুন।';
    setMessage(message, `${successText} কিন্তু users/{UID} প্রোফাইল সংরক্ষণ হয়নি।${detail}`, 'error');
  }
  window.setTimeout(goAfterLogin, 1200);
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = document.querySelector('#authSubmit');
  button.disabled = true;
  setMessage(message, 'প্রসেস হচ্ছে...');

  try {
    const email = document.querySelector('#email').value.trim();
    const password = document.querySelector('#password').value;
    let user;

    if (mode === 'register') {
      const name = document.querySelector('#displayName').value.trim();
      if (name.length < 2) throw new Error('আপনার নাম লিখুন।');
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(credential.user, { displayName: name });
      user = credential.user;
      await finishAuth(user, 'অ্যাকাউন্ট তৈরি হয়েছে।');
    } else {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      user = credential.user;
      await finishAuth(user, 'লগইন সফল।');
    }
  } catch (error) {
    const messages = {
      'auth/email-already-in-use': 'এই ইমেইল দিয়ে আগে থেকেই অ্যাকাউন্ট আছে।',
      'auth/invalid-email': 'ইমেইল ঠিকানা সঠিক নয়।',
      'auth/weak-password': 'আরও শক্তিশালী পাসওয়ার্ড দিন (কমপক্ষে ৮ অক্ষর)।',
      'auth/invalid-credential': 'ইমেইল বা পাসওয়ার্ড সঠিক নয়।',
      'auth/popup-closed-by-user': 'Google লগইন বাতিল হয়েছে।',
      'auth/operation-not-allowed': 'Firebase Console-এ এই লগইন পদ্ধতি চালু নেই।',
      'auth/unauthorized-domain': 'Firebase Authentication Authorized Domains-এ এই ডোমেইন যোগ করুন।',
    };
    setMessage(message, messages[error.code] || error.message || 'অ্যাকাউন্টে লগইন করা যায়নি।', 'error');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#googleLogin').addEventListener('click', async () => {
  const button = document.querySelector('#googleLogin');
  button.disabled = true;
  setMessage(message, 'Google লগইন হচ্ছে...');
  try {
    const result = await signInWithPopup(auth, googleProvider);
    await finishAuth(result.user, 'Google লগইন সফল।');
  } catch (error) {
    setMessage(message, ({
      'auth/popup-closed-by-user': 'Google লগইন বাতিল হয়েছে।',
      'auth/unauthorized-domain': 'Firebase Authorized Domains-এ সাইটের ডোমেইন যোগ করতে হবে।',
    }[error.code] || error.message || 'Google লগইন করা যায়নি.'), 'error');
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#forgotPassword').addEventListener('click', async () => {
  const email = document.querySelector('#email').value.trim();
  if (!email) {
    setMessage(message, 'আগে ইমেইল লিখুন, তারপর পাসওয়ার্ড রিসেট করুন।', 'error');
    return;
  }
  try {
    await sendPasswordResetEmail(auth, email);
    setMessage(message, 'পাসওয়ার্ড রিসেটের ইমেইল পাঠানো হয়েছে।', 'success');
  } catch (error) {
    setMessage(message, error.message || 'পাসওয়ার্ড রিসেট ইমেইল পাঠানো যায়নি।', 'error');
  }
});
