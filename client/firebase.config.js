// Import the functions you need from the SDKs you need
import { initializeApp } from 'firebase/app';
import { getStorage, ref } from 'firebase/storage';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBBwWXtZBgNbAho0hzMazhdoxtJgP11dpA",
  authDomain: "chat-app-ef696.firebaseapp.com",
  projectId: "chat-app-ef696",
  storageBucket: "chat-app-ef696.firebasestorage.app",
  messagingSenderId: "462015065759",
  appId: "1:462015065759:web:e8b0a790eaf8ff0786bcaa",
  measurementId: "G-HB5E4B9WQ7"
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
