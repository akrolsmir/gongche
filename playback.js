const VF = Vex.Flow;

/** For slur/tied notes, add a parent pointer to the lyric group. */
function buildParentLinks(lyricGroups) {
  for (const lyricGroup of lyricGroups) {
    if (lyricGroup.children.length > 1) {
      for (const note of lyricGroup.children) {
        note.melodyNote.lyricGroup = lyricGroup;
      }
    }
  }
}

/**
 * @param playbackNotes An array of notes to play while coloring red.
 * @param keySignature A VexFlow key specification, e.g. 'G', 'C#m'
 */
export function schedulePlayback(playbackNotes, lyricGroups, keySignature) {
  buildParentLinks(lyricGroups);
  Tone.Transport.cancel(); // Remove preexisting notes scheduled in Tone.js.
  let elapsed = Tone.Time('4n'); // Start after quarter beat.
  const svgSuperGroup = {children: []}; // Parent of all svg notes.
  const events = [];
  for (let i = 0; i < playbackNotes.length; i++) {
    const note = playbackNotes[i];
    if (note instanceof VF.StaveNote) {
      // Two notes are tied if they share the same key and lyric group.
      const tied = note.lyricGroup
        && i + 1 < playbackNotes.length
        && note.lyricGroup == playbackNotes[i + 1].lyricGroup
        && note.keys[0] == playbackNotes[i + 1].keys[0];
      let duration = Tone.Time(note.duration + 'n');
      if (tied) {
        // Extend this note by the tie. TODO: this fails for multiple ties.
        duration = duration + Tone.Time(playbackNotes[i + 1].duration + 'n');
        i++;
      }
      events.push({ duration, time: elapsed, note });
      svgSuperGroup.children.push(note.svgGroup);
      elapsed = elapsed + Tone.Time(duration);
    }
  }
  const synth = new Tone.Synth().toMaster()
  for (const event of events) {
    Tone.Transport.schedule(function(time) {
      if (event.note.noteType == 'n') {
        // Play the tone for non-rest stave notes.
        const tone = convertTone(event.note, keySignature);
        synth.triggerAttackRelease(tone, event.duration, time);
      }
      // Color the current note red, and all others black.
      colorSvgGroup(svgSuperGroup, 'black');
      colorSvgGroup(event.note.svgGroup, 'red');
    }, event.time)
  }
}

/** Return the note for Tone.js to play, adding #/b based on key signature. */
function convertTone(melodyNote, keySignature) {
  const keySpec = VF.keySignature.keySpecs[keySignature];
  let scale = '';
  if (keySpec.acc == '#') {
    const SHARPS_ORDER = 'fcgdaeb';
    scale = SHARPS_ORDER.substring(0, keySpec.num);
  } else if (keySpec.acc == 'b') {
    const FLATS_ORDER = 'beadgcf';
    scale = FLATS_ORDER.substring(0, keySpec.num);
  }
  const noteKey = melodyNote.keys[0]; // e.g. 'e/4'
  const accidental = scale.includes(noteKey[0]) ? keySpec.acc : '';
  return noteKey.replace('/', accidental);
}

function colorSvgGroup(svgGroup, color) {
  if (svgGroup.getAttribute) {
    // Could also include stroke for stems, but the middle C ledger is Gray.
    const fill = svgGroup.getAttribute('fill');
    if (fill && fill != 'none') {
      svgGroup.setAttribute('fill', color);
    }
  }
  if (svgGroup.children) {
    for (const child of svgGroup.children) {
      colorSvgGroup(child, color);
    }
  }
}
