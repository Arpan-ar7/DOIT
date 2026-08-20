importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js");

// Same config as index.html — must match exactly.
firebase.initializeApp({
  apiKey: "AIzaSyBiA5kDMENLX62T5GANg43oYV0XAlfYPiU",
  authDomain: "unicart-campus-dilivery.firebaseapp.com",
  projectId: "unicart-campus-dilivery",
  storageBucket: "unicart-campus-dilivery.firebasestorage.app",
  messagingSenderId: "688052407794",
  appId: "1:688052407794:web:c5c14ba485f5e3ce6d2f6b",
  measurementId: "G-1B6NW54WX2"

});

const messaging = firebase.messaging();

// Handles notifications that arrive while the tab isn't focused.
messaging.onBackgroundMessage((payload) => {
  console.log("Background message received:", payload);
  const { title, body } = payload.notification || {};
  self.registration.showNotification(title || "New notification", {
    body: body || "",
  });
});
