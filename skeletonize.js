import { Note, LyricGroup, BAR } from "./sheet.js";

/** Return the number of sixteenth notes */
export function countSixteenths(notes) {
  const durationToQuarters = {
    'b': 0, // Bar note has 0 length
    '16': 1,
    '8': 2,
    '4': 4,
    '2': 8,
    '1': 16
  }
  let count = 0;
  for (const note of notes) {
    count += durationToQuarters[note.duration];
  }
  return count;
}

function merge(toMerge, newGroup, first) {
  if (toMerge.length == 0) {
    return [];
  }
  // Figure out which gongche note to use.
  const oldGroup = toMerge[0].lyricGroup;
  const skeletonNote = first
    ? oldGroup.children[0]
    : oldGroup.children[oldGroup.children.length - 1];
  const gongche = skeletonNote.gongche;
  const sixteenths = countSixteenths(toMerge);
  return outputNotes(sixteenths, newGroup, gongche);

}
/** Return an array of notes, for a particular # of sixteenths and gongche. */
function outputNotes(sixteenths, newGroup, gongche) {
  const result = [];
  if (sixteenths > 32) {
    alert(`Merged duration exceeded whole note: ${sixteenths}`);
    sixteenths = 32;
  }
  for (const size of [16, 16, 8, 4, 2, 1]) {
    if (sixteenths >= size) {
      const duration = `${16 / size}`;
      const newNote = new Note(gongche);
      newGroup.addNote(newNote);
      newNote.setDuration(duration);
      result.push(newNote);
      sixteenths -= size;
    }
  }
  return result;
}

/** @param first Whether to fix the tone to the first or last note. */
export function skeletonize(rhythmized, first = true) {
  let result = [];
  let lastGroup = rhythmized[0].lyricGroup; // The lyric group of the previous note.
  let newGroup = new LyricGroup(lastGroup.lyric); // The new group for the merged notes.
  let toMerge = [];
  for (const note of rhythmized) {
    if (note == BAR || note.getLyric() == 'R') {
      // Merge and push the previous section.
      const merged = merge(toMerge, newGroup, first)
      result = result.concat(merged);
      // Push the bar or rest, unchanged.
      result.push(note);
      // Start an empty new merge section, keeping the previous lyric group.
      toMerge = [];
    } else if (note.lyricGroup == lastGroup) {
      toMerge.push(note);
    } else {
      // Merge and push the previous section.
      const merged = merge(toMerge, newGroup, first)
      result = result.concat(merged);
      // Start a new note
      toMerge = [note];
      lastGroup = note.lyricGroup;
      newGroup = new LyricGroup(lastGroup.lyric);
    }
  }
  if (toMerge.length >= 1) {
    // Push any remaining notes.
    const merged = merge(toMerge, newGroup, first)
    result = result.concat(merged);
  }
  return result;
}
