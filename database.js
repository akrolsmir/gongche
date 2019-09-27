const ENV = "songs"

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
  db.collection(ENV).doc(song.id).set(song.toJson());
}

const EDIT_PASSWORD = 'swordfish';
function hasEditPermission() {
  if (Cookies.get('editpassword') == EDIT_PASSWORD) {
    return true;
  }
  const attempt = window.prompt('Enter the password to save changes:');
  if (!attempt) {
    // User hit "Cancel"; not authorized.
    return false;
  }
  if (attempt != EDIT_PASSWORD) {
    // Incorrect password; recursively retry.
    alert('Incorrect password, try again.');
    return hasEditPermission();
  }
  // Persist password into cookie and proceed.
  Cookies.set('editpassword', attempt);
  return true;
}

async function loadSongs() {
  const songsMap = new Map();
  const songsQuery = await db.collection(ENV).get();
  songsQuery.forEach(doc => {
    songsMap.set(doc.id, doc.data());
  });
  return songsMap;
}

const songFields = [
  'id',
  'title',
  'composer',
  'pageNum',
  // 'lyrics', // TODO: Skipping because it's derivable from fullLyrics
  'melody',
  'region',
  'fullLyrics',
  'modeKey'
]

function toCsv(songsMap) {
  const headings = songFields.join(', ');
  function toLine(song) {
    return songFields.map(field => `"${song[field]}"`).join(', ');
  }
  const lines = Array.from(songsMap.values()).map(toLine).join('\n');
  return headings + '\n' + lines;
}

function makeTextFile(text) {
  const data = new Blob([text], { type: 'text/plain' });

  let textFile = null; // TODO actually prevent leak?
  // If we are replacing a previously generated file we need to
  // manually revoke the object URL to avoid memory leaks.
  if (textFile !== null) {
    window.URL.revokeObjectURL(textFile);
  }

  textFile = window.URL.createObjectURL(data);

  return textFile;
};

async function downloadSongsAsCsv() {
  // TODO: songsMap has incorrect region, modekey, etc. data... 
  // Can correct from mulu fulltable. Or maybe it's okay?
  const songsMap = await loadSongs();
  // const jsonText = JSON.stringify(Object.fromEntries(songsMap));
  const csvText = toCsv(songsMap);
  var link = document.createElement('a');
  link.setAttribute('download', 'gongche-database.csv');
  link.href = makeTextFile(csvText);
  document.body.appendChild(link);

  // Wait for the link to be added to the document
  window.requestAnimationFrame(function () {
    var event = new MouseEvent('click');
    link.dispatchEvent(event);
    document.body.removeChild(link);
  });
}

async function loadSong(id) {
  const doc = await db.collection(ENV).doc(id).get();
  if (doc.exists) {
    return doc.data();
  } else {
    alert(`No song data was found for id '${id}'.`);
    throw `No song data was found for id '${id}'.`;
  }
}
