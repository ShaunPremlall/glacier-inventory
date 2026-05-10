import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyArS9ya19RX4gyInGeZNEyl-1YXS643dqA",
  authDomain: "glacier-inventory-cc41e.firebaseapp.com",
  projectId: "glacier-inventory-cc41e",
  storageBucket: "glacier-inventory-cc41e.firebasestorage.app",
  messagingSenderId: "913205931036",
  appId: "1:913205931036:web:0bbaa77aaec00e5e7bc3d9"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

async function test() {
  try {
    console.log("Attempting login...");
    const cred = await signInWithEmailAndPassword(auth, "merryl@alcinvest.co.za", "Spmp1234##");
    console.log("Login success! UID:", cred.user.uid);
  } catch (e) {
    console.error("Login failed:", e.message);
  }
}

test();
