firebase.initializeApp({
  apiKey: 'AIzaSyCKjEsP_YFyT45ULNihdDkDptXHcapoXLE',
  authDomain: 'minotaur-153205.firebaseapp.com',
  projectId: 'minotaur-153205'
});

// Initialize Cloud Firestore through Firebase
var db = firebase.firestore();

// Disable deprecated features
db.settings({
  timestampsInSnapshots: true
});

function saveSong(song) {
  db.collection("songs").doc(song.id).set(song.toJson());
}

async function loadSongs() {
  const songsMap = new Map();
  const songsQuery = await db.collection("songs").get();
  songsQuery.forEach(doc => {
    songsMap.set(doc.id, doc.data());
  });
  return songsMap;
}
