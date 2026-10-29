import { initializeApp } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.5.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDmV5x9BUN0XEB_FtGzXZ4CoOdSyCYyCeY",
  authDomain: "fitness-tracker-4b508.firebaseapp.com",
  projectId: "fitness-tracker-4b508",
  storageBucket: "fitness-tracker-4b508.firebasestorage.app",
  messagingSenderId: "151294201149",
  appId: "1:151294201149:web:26a7970246e707910c4954"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
