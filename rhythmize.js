// const markers4 = {
//   ",": 1, 
//   "L": "Sustain past 1",
//   ".": 3,
//   "[": "Sustain past 3",
//   "_": "Extend to measure, then rest on 1"
// }

// const markers8 = {
//   ",": 1,
//   ",empty": 5,
//   "L": "Sustain past 1",
//   "Lempty": "Sustain past 5",
//   ".": 7,
//   "[]": "Sustain past 7",
//   "_": "Sustain to measure, then rests"
// }

// Input: ["、", Note, Note, "。", Note, "_"...]
// Output: ["|", Note, Note, "|"...], and also assign durations
function rhythmize4(input) {
  let output = [];
  let block = [];
  let lastBeat = 1;
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    if (symbol == "、") {
      [block, lastBeat] = processBlock(block, output, lastBeat, 1);
      // Also add a new bar marker.
      output.push(BAR);
    }
    else if (symbol == "。") {
      [block, lastBeat] = processBlock(block, output, lastBeat, 3);
    }
    else if (symbol == "_") {
      [block, lastBeat] = processBlock(block, output, lastBeat, 1);
      // TODO: Instead, extend marked (prev) note into end of measure
      // Also add a new bar marker and a rest.
      output.push(BAR);
      block.push(new RestNote()); 
    }
    else if (symbol == "▯") {
      // Include the marked (next) note in the block
      i++;
      const markedNote = input[i];
      block.push(markedNote);
      // Then process as usual.
      [block, lastBeat] = processBlock(block, output, lastBeat, 3);
      // Next, add a quarter copy of the marked note, to sustain it through 3.
      const copy = markedNote.getCopy();
      copy.setDuration('4');
      output.push(copy);
      // The next beat is thus also adjusted by 1 quarter.
      lastBeat++;
    }
    else {
      block.push(symbol);
    }
  }
  return output;
}

function processBlock(block, output, lastBeat, thisBeat) {
  assignDurations(block, between(lastBeat, thisBeat));
  output.push(...block);
  return [[], thisBeat];
}

function assignDurations(block, quarters) {
  if (block.length > 8) {
    throw `Invalid block length ${block.length}`
  }
  const fractions = divideBlock[block.length];
  for (let i = 0; i < block.length; i++) {
    block[i].setDuration(convertToDuration(fractions[i] * quarters));
  }
}

/**
 * Convert from a length (in # of quarters) to a duration 
 * (e.g. '2' = half note, '8' = eight note)
 */ 
function convertToDuration(quarters) {
  return '' + (4 / quarters);
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
