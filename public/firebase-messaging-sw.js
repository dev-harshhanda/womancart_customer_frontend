/* eslint-disable no-undef */
// Firebase Messaging service worker for background notifications.
// Note: This file is served as a static asset, so environment variables
// are not available here at runtime. Configuration is inlined.

importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC7-kPgWvdcn7wpjFLhxffJExQ2jLt2fCA",
  authDomain: "womancart-8aa21.firebaseapp.com",
  projectId: "womancart-8aa21",
  storageBucket: "womancart-8aa21.firebasestorage.app",
  messagingSenderId: "411117053577",
  appId: "1:411117053577:web:05c6d8a2ad405177e18858",
  measurementId: "G-KS357DN6SK",
});

const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
  const notificationTitle = payload.notification?.title || "Womancart";
  const notificationOptions = {
    body: payload.notification?.body || "",
    icon: "/images/home_banner_img.jpg",
    data: payload.data || {},
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});

