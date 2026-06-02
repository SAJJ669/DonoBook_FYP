import { initializeApp } from "firebase/app";
import { getMessaging, getToken } from "firebase/messaging";
import { onMessage } from "firebase/messaging";

// Paste your Web App Firebase config here (from Firebase Console Project Settings)
const firebaseConfig = {
  apiKey: "AIzaSyB79kP09MnDG2P-FtshDl9ihO7pcu45UbM",
  authDomain: "donobook-fyp.firebaseapp.com",
  projectId: "donobook-fyp",
  storageBucket: "donobook-fyp.firebasestorage.app",
  messagingSenderId: "179204954432",
  appId: "1:179204954432:web:83ff5022c73fb189b242a5",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

export const requestNotificationPermission = async (userId: string): Promise<string | null> => {
  try {
    // 1. Request permission from the user's browser
    const permission = await Notification.requestPermission();
    
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      
      // 2. Generate the unique FCM token for this specific device
      const token = await getToken(messaging, { 
        vapidKey: 'BOrKJCGlLGqUo41CkfDkZACOma05_By2wOgfIZc4KlrAwlfz6UtzkF9qwYO90uAFm-yb7qhNTsaMmj4Cj6bOSfw'
      });

      if (token) {
        console.log('Your Device FCM Token:', token);
        return token;
      } else {
        console.log('No registration token available.');
        return null;
      }
    } else {
      console.log('Permission denied for notifications.');
      return null;
    }
  } catch (error) {
    console.error('An error occurred while retrieving the token:', error);
    return null;
  }
};

export const setupForegroundMessageListener = () => {
  try {
    onMessage(messaging, (payload) => {
      console.log("Message received in foreground: ", payload);
      
      // Force a native browser alert to prove it works
      const title = payload.notification?.title || payload.data?.title || "New Message";
      const body = payload.notification?.body || payload.data?.body || "You have a new message";
      
      alert(`🔔 ${title}\n${body}`);
    });
  } catch (error) {
    console.error("Foreground listener failed:", error);
  }
};