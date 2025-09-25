import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);

// 🔑 Call Cloud Function securely
async function callCloudFunction(url, data = {}) {
  if (!auth.currentUser) throw new Error("Not authenticated");
  const idToken = await auth.currentUser.getIdToken();

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) throw new Error(`Cloud Function failed: ${res.status} ${res.statusText}`);
  return res.json();
}

// 🔑 Login + init user
async function loginWithGoogle() {
  const result = await signInWithPopup(auth, provider);
  const user = result.user;

  // 🔥 Call initUser Cloud Function
  await callCloudFunction(import.meta.env.VITE_INIT_USER_URL, {});
  return user;
}

// 🔑 Logout
async function logout() {
  return signOut(auth);
}

export { auth, db, storage, loginWithGoogle, logout, callCloudFunction };
