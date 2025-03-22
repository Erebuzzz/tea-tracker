import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: "AIzaSyDXbxeHV1YEN-MILvv3SPdwByg-iuCnymM",
  authDomain: "tea-tracker15.firebaseapp.com",
  projectId: "tea-tracker15",
  storageBucket: "tea-tracker15.firebasestorage.app",
  messagingSenderId: "838355016413",
  appId: "1:838355016413:web:d518c2b2de8f1e07dd1934",
  measurementId: "G-JZ88P2REJ3"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Firebase Cloud Messaging and get a reference to the service
const initMessaging = async () => {
  if (typeof window !== 'undefined' && await isSupported()) {
    return getMessaging(app);
  }
  return null;
};

export { app, auth, db, initMessaging };