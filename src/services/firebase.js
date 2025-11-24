import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyC5Ua2IheCtaxD_NWCcXGvQfOIZzki9xZY",
  authDomain: "english-japanese-chat.firebaseapp.com",
  projectId: "english-japanese-chat",
  storageBucket: "english-japanese-chat.firebasestorage.app",
  messagingSenderId: "606699036024",
  appId: "1:606699036024:web:8c09eebdf0660ca5a93c8d",
  measurementId: "G-HFT2VD3DPL"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// 간단한 Firebase Auth 초기화 (AsyncStorage 문제 해결을 위해 기본 설정으로)
export const auth = getAuth(app);
export const db = getFirestore(app);
