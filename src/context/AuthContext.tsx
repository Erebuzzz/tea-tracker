'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, FieldValue } from 'firebase/firestore';
import { auth, db } from '@/config/firebase';
import { User, AuthContextType } from '@/types';

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signup: async () => {},
  login: async () => {},
  logout: async () => {},
  loginWithGoogle: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Define weekly tea limits
  const weeklyLimits = [
    { week: 1, minCups: 3, maxCups: 4 },
    { week: 2, minCups: 2, maxCups: 3 },
    { week: 3, minCups: 1, maxCups: 2 },
    { week: 4, minCups: 0, maxCups: 1 },
    { week: 5, minCups: 0, maxCups: 0 },
  ];

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userData = await getUserData(firebaseUser);
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const getUserData = async (firebaseUser: FirebaseUser): Promise<User> => {
    // Create a user object from Firebase Auth data
    const user: User = {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      displayName: firebaseUser.displayName || undefined,
      photoURL: firebaseUser.photoURL || undefined,
    };

    return user;
  };

  const createUserDocument = async (userId: string, userData: { email: string; displayName?: string; photoURL?: string; lastLogin?: Date | FieldValue }) => {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        ...userData,
        teaWeeklyLimits: weeklyLimits,
        planStartDate: serverTimestamp(),
        notifications: {
          email: true,
          push: true,
          reminders: true
        },
        createdAt: serverTimestamp(),
      });
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      
      // Create user document in Firestore
      await createUserDocument(credential.user.uid, {
        email,
        displayName: credential.user.displayName || undefined,
        photoURL: credential.user.photoURL || undefined,
      });
    } catch (error) {
      console.error("Error signing up:", error);
      throw error;
    }
  };

  const login = async (email: string, password: string) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Error logging in:", error);
      throw error;
    }
  };

  const loginWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Create or update user document
      await createUserDocument(result.user.uid, {
        email: result.user.email || '',
        displayName: result.user.displayName || undefined,
        photoURL: result.user.photoURL || undefined,
        lastLogin: serverTimestamp(),
      });
    } catch (error) {
      console.error("Error with Google login:", error);
      throw error;
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error logging out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signup, login, logout, loginWithGoogle }}>
      {children}
    </AuthContext.Provider>
  );
};