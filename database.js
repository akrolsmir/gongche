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

db.enablePersistence({ experimentalTabSynchronization: true })
  .catch(function (err) {
    if (err.code == 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled
      // in one tab at a a time.
      console.warn('Failed to enbable persistence!');
    } else if (err.code == 'unimplemented') {
      // The current browser does not support all of the
      // features required to enable persistence
      console.warn('Persistence not implemented!');
    }
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

async function loadSong(id) {
  const doc = await db.collection("songs").doc(id).get();
  if (doc.exists) {
    return doc.data();
  } else {
    alert(`No song data was found for id '${id}'.`);
    throw `No song data was found for id '${id}'.`;
  }
}
