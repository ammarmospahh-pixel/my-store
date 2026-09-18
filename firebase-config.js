// إعدادات الاتصال بالفايربيس
const firebaseConfig = {
  apiKey: "AIzaSyCEBELUtx5bTgOvvE0DsnqSQUN7jgAJuHY",
  authDomain: "progect-market-a.firebaseapp.com",
  databaseURL: "https://progect-market-a-default-rtdb.firebaseio.com",
  projectId: "progect-market-a",
  storageBucket: "progect-market-a.firebasestorage.app",
  messagingSenderId: "958638502458",
  appId: "1:958638502458:web:2028a840186629f70bfb03",
  measurementId: "G-P98615XL70"
};

// تشغيل الفايربيس وإنشاء متغير db
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();