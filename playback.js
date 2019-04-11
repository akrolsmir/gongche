const VF = Vex.Flow;

/**
 * @param playbackNotes An array of notes to play while coloring red.
 * @param keySignature A VexFlow key specification, e.g. 'G', 'C#m'
 */
export function schedulePlayback(playbackNotes, keySignature) {
  Tone.Transport.cancel(); // Remove preexisting notes scheduled in Tone.js.
  let elapsed = Tone.Time('4n'); // Start after quarter beat.
  const svgSuperGroup = {children: []}; // Parent of all svg notes.
  const events = [];
  for (const note of playbackNotes) {
    if (note instanceof VF.StaveNote) {
      const duration = note.duration + 'n';
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
