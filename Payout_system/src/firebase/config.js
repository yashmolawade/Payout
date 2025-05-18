import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import {
  getFirestore,
  collection,
  getDocs,
  query,
  limit,
  enableIndexedDbPersistence,
  enableMultiTabIndexedDbPersistence,
  CACHE_SIZE_UNLIMITED,
} from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyB_QsIxGdzSBGdwhtbNQUV0K4GcJ2amzDo",
  authDomain: "payout-2.firebaseapp.com",
  projectId: "payout-2",
  storageBucket: "payout-2.firebasestorage.app",
  messagingSenderId: "743805068795",
  appId: "1:743805068795:web:187baed199b89e1883975e",
  measurementId: "G-VP50RXPF6Q",
  databaseURL: "https://payout-2-default-rtdb.firebaseio.com/",
};

// Prevent multiple initializations in dev mode / hot reloads
const app = initializeApp(firebaseConfig);

const auth = getAuth(app);
const db = getFirestore(app);
const analytics = getAnalytics(app);
const database = getDatabase(app); // Add Realtime Database

// Enable offline persistence with unlimited cache size
try {
  enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED,
  }).catch((err) => {
    if (err.code === "failed-precondition") {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.log("Persistence failed: Multiple tabs open");
      // Try enabling multi-tab persistence instead
      enableMultiTabIndexedDbPersistence(db, {
        cacheSizeBytes: CACHE_SIZE_UNLIMITED,
      }).catch((err) => {
        console.error("Failed to enable multi-tab persistence:", err);
      });
    } else if (err.code === "unimplemented") {
      // The current browser does not support all of the features required to enable persistence
      console.log("Persistence not supported by this browser");
    } else {
      console.error("Unknown persistence error:", err);
    }
  });
} catch (err) {
  console.error("Error setting up persistence:", err);
}

// Verify that the audit_logs collection exists and is accessible
const verifyAuditLogsCollection = async () => {
  try {
    // Query the collection to check if it exists and is accessible
    const auditLogsRef = collection(db, "audit_logs");
    const testQuery = query(auditLogsRef, limit(1));
    await getDocs(testQuery);
    console.log("Audit logs collection verification successful");
    return true;
  } catch (error) {
    console.error("Error verifying audit logs collection:", error);
    // The collection will be created automatically when the first document is added
    return false;
  }
};

// Run verification on app startup
verifyAuditLogsCollection();

export { app, auth, db, analytics, database };
