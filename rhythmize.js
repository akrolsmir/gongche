import { TimeSignature, BAR, RestNote } from "./sheet.js";

export function rhythmize(input, timeSignature) {
  switch (timeSignature) {
    case TimeSignature.FOUR_FOUR:
      return rhythmizeFixed(input, timeSignature);
    case TimeSignature.EIGHT_FOUR:
      return rhythmizeFixed(input, timeSignature);
    case TimeSignature.FREE:
      return rhythmizeFree(input);
  }
}

function rhythmizeFree(input) {
  let output = [];
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    if (symbol == "_") {
      // Last note in a measure is a whole note.
      output[output.length - 1].setDuration('1');
      output.push(BAR);
    } else {
      // All other notes in free rhythm are quarter notes.
      try {
        symbol.setDuration('4');
      } catch (e) {
        throw `Invalid symbol "${symbol}" in free rhythm piece at position ${i + 1}.`;
      }
      output.push(symbol);
    }
  }
  return output;
}

function getBeatForSymbol(symbol, timeSignature, lastBeat) {
  const beats4 = {
    "、": 1,
    "。": 3,
    "_": 1,  // Extend to measure, then rest on 1
    "▯": 3, // Sustain past 3
    "L": 1,  // Sustain past 1
  }
  const beats8 = {
    "、": 1,
    "﹆": 5,
    "。": lastBeat < 3 ? 3 : 7, // Can represent either 3 or 7
    "_": 1, // Extend to measure, then rest on 1
    "▯": lastBeat < 3 ? 3 : 7, // Sustain past midway
    "L": 1, // Sustain past 1
    "╚": 5, // Sustain past 5
  }
  if (timeSignature == TimeSignature.FOUR_FOUR) {
    return beats4[symbol];
  } else {
    return beats8[symbol];
  }
}

// Input: ["、", Note, Note, "。", Note, "_"...]
// Output: ["|", Note, Note, "|"...], and also assign durations
function rhythmizeFixed(input, timeSignature) {
  const ts = timeSignature;
  let output = [];
  let firstBlock = true;
  let block = [];
  let lastBeat = 1;
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    if (getBeatForSymbol(symbol, timeSignature, lastBeat)) {
      if (firstBlock) {
        // Treat the very first block as free rhythm.
        for (const note of block) {
          note.setDuration('4');
          output.push(note);
        }
        output.push(BAR);
        block = [];
        firstBlock = false;
        continue;
      }

      let markedNote;
      if ("▯L╚".includes(symbol)) {
        // Include the marked (next) note in the block.
        i++;
        markedNote = input[i];
        block.push(markedNote);
      }
      
      // Assign durations to each note in this rhythm block.
      [block, lastBeat] = processBlock(block, output, lastBeat, symbol, ts);

      if ("、_L".includes(symbol)) {
        // Add a new bar marker, since we're starting on 1.
        output.push(BAR);
      }

      if (symbol == "_"){
        // Make sure to rest on 1.
        block.push(new RestNote());
      }

      if (markedNote) {
        // Sustain the note an additional quarter-beat by adding a copy.
        const copy = markedNote.getCopy();
        copy.setDuration('4');
        output.push(copy);
        // Also adjust the next beat by 1 quarter.
        lastBeat++;
      }
    } else {
      // Treat this entry as a note.
      block.push(symbol);
    }
  }
  if (block.length > 0) {
    // Add any remaining notes to one last bar.
    [block, lastBeat] = processBlock(block, output, lastBeat, "、", ts);
  }
  return output;
}

function processBlock(block, output, lastBeat, symbol, timeSignature) {
  const thisBeat = getBeatForSymbol(symbol, timeSignature, lastBeat);
  const quarters = timeSignature == TimeSignature.FOUR_FOUR ? 4 : 8;
  assignDurations(block, between(lastBeat, thisBeat, quarters));
  output.push(...block);
  return [[], thisBeat];
}

function assignDurations(block, quarters) {
  if (block.length > 8) {
    throw `Found ${block.length} notes in one fixed rhythm block (max is 8). ` + 
    `Is there a mistaken character in a free rhythm piece? ${formatBlock(block)}`;
  }
  const fractions = divideBlock[block.length];
  for (let i = 0; i < block.length; i++) {
    try {
      block[i].setDuration(convertToDuration(fractions[i] * quarters));
    } catch (e) {
      throw `Invalid symbol "${block[i]}" in fixed rhythm piece (Position ${i + 1} in ${formatBlock(block)}).`;
    }
  }
}

function formatBlock(block) {
  return "[" + block
    .map(note => note.gongche ? note.gongche : note)
    .join(", ") + "]";
}

/**
 * Convert from a length (in # of quarters) to a duration 
 * (e.g. '2' = half note, '8' = eight note)
 */ 
function convertToDuration(quarters) {
  const map = {
    4: '1',
    2: '2',
    1: '4',
    0.5: '8',
    0.25: '16'
  }

  // TODO handle dotted notes
  if (quarters > 4) {
    return '1';
  }
  if (map[quarters]) {
    return map[quarters];
  }
  return '4'; // Default to quarter note when necessary
}

// How to divide up a section, based on the size of a block.
// In general, divide evenly into powers of 2, keeping the first notes longer.
// TODO: Will this work for 3 quarters?
const divideBlock = [
  [],
  [1],
  [1/2, 1/2],
  [1/2, 1/4, 1/4],
  [1/4, 1/4, 1/4, 1/4],
  [1/4, 1/4, 1/4, 1/8, 1/8], 
  [1/4, 1/4, 1/8, 1/8, 1/8, 1/8],
  [1/4, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8],
  [1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8, 1/8]
]

// Return the length between the marked quarter beats.
// Assumes that no length exceeds 3 beats.
function between(lastBeat, thisBeat, quarters = 4) {
  const length = thisBeat - lastBeat;
  return length > 0 ? length : length + quarters;
}
