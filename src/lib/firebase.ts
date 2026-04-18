import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider, signInWithPopup, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, setDoc, getDoc, getDocFromServer } from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const googleProvider = new GoogleAuthProvider();

export async function signInWithGoogle() {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Sync user to firestore
    const userRef = doc(db, "users", user.uid);
    const userDoc = await getDoc(userRef);
    
    if (!userDoc.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        createdAt: new Date().toISOString()
      });
    }
    
    return user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
}

export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error: any) {
    if (error.message?.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

export { onAuthStateChanged };
export type { FirebaseUser };
