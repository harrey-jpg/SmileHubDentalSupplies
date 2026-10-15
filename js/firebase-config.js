var firebaseConfig = {
  apiKey: "AIzaSyDzd-_1VWdkDBTuMTq520Yt_pXaLC-Pimk",
  authDomain: "smilehub-ecommerce.firebaseapp.com",
  projectId: "smilehub-ecommerce",
  storageBucket: "smilehub-ecommerce.firebasestorage.app",
  messagingSenderId: "177683041939",
  appId: "1:177683041939:web:09b57fbc044e5f604ec766"
};

// Only the dedicated local payment preview uses the isolated demo project.
var localPaymongo = ['localhost', '127.0.0.1'].indexOf(location.hostname) !== -1 && location.port === '5500';
if (localPaymongo) {
  firebaseConfig = { apiKey: 'demo-key', authDomain: 'demo-smilehub-local.firebaseapp.com', projectId: 'demo-smilehub-local' };
}
firebase.initializeApp(firebaseConfig);
if (localPaymongo) {
  firebase.auth().useEmulator('http://127.0.0.1:19099');
  firebase.firestore().useEmulator('127.0.0.1', 18081);
}
