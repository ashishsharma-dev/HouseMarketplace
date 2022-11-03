// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from 'firebase/firestore'
// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDVhgwamRn4ZDlnKqnllH-WbOYe8qfeA6k",
    authDomain: "house-marketplace-3d7b3.firebaseapp.com",
    projectId: "house-marketplace-3d7b3",
    storageBucket: "house-marketplace-3d7b3.appspot.com",
    messagingSenderId: "195628238089",
    appId: "1:195628238089:web:fd61021a3b1a369ba6bfd8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore()