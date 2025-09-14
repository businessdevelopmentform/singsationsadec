import { initializeApp } from "firebase/app"
import { getAuth } from "firebase/auth"
import { getDatabase } from "firebase/database"

const firebaseConfig = {
  apiKey: "AIzaSyBOy9Mk1cOUFVoWWNgPCDVL_FD9wdFhTdI",
  authDomain: "singsation-ba9b7.firebaseapp.com",
  databaseURL: "https://singsation-ba9b7-default-rtdb.firebaseio.com",
  projectId: "singsation-ba9b7",
  storageBucket: "singsation-ba9b7.firebasestorage.app",
  messagingSenderId: "527036867491",
  appId: "1:527036867491:android:cf8abf3a9adbc4aa893016",
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app)

// Initialize Realtime Database and get a reference to the service
export const database = getDatabase(app)

export default app
