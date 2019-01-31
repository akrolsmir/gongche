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

// Input: String "四上 、一四上 。六尺 工尺 、工 。尺上_ 。上尺 工尺 、工六工 。"
// Output: Complete rhythm information
function rhythmize4(input) {
  // input = input.replace(/\s/g, ''); // Remove whitespace
  let output = [];
  let block = [];
  let lastBeat = 1 % 4;
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    if (symbol == "、") {
      blockDuration = between(lastBeat, 1);
      assignLengths4(block, blockDuration, output);
      lastBeat = 1;
      block = [];
      output.push(BAR);
    }
    else if (symbol == "。") {
      blockDuration = between(lastBeat, 3);
      assignLengths4(block, blockDuration, output);
      lastBeat = 3;
      block = [];
    }
    else if (symbol == "_") {
      blockDuration = between(lastBeat, 1);
      assignLengths4(block, blockDuration, output);
      // TODO extend marked (prev) note into end of measure
      output.push(BAR);
      lastBeat = 1;
      block = [new RestNote()]; 
    }
    else if (symbol == "[") {
      blockDuration = between(lastBeat, 3);
      // Add the marked (next) note to the block
      i++;
      const markedNote = input[i];
      block.push(markedNote);
      assignLengths4(block, blockDuration, output);
      // Also sure the marked note sustains to 3
      const copy = markedNote.getCopy();
      copy.setDuration('4'); // Set to 1 quarter 
      output.push([copy, 1]);
      lastBeat = 4;
      block = [];
    }
    else {
      block.push(symbol);
    }
  }
  console.log('rhythmized');
  console.log(output);
  return output.map(entry => Array.isArray(entry) ? entry[0] : entry);
}

// Output is just for debugging
function assignLengths4(block, quarters, output) {
  if (block.length == 0 || block.length > 8) {
    throw `Invalid block length ${block.length}`
  }
  // TODO does this work for 3 quarters?
  const fractions = lengthSplits[block.length];
  for (let i = 0; i < block.length; i++) {
    // TODO better OOP version
    output.push([block[i], fractions[i] * quarters]);

    block[i].setDuration(convertToDuration(fractions[i] * quarters));
  }
}

function convertToDuration(quarters) {
  // E.g. 2 quarters = Half ('2'), half a quarter = Eighth ('8')
  return '' + (4 / quarters);
}

// How to divide up a section, for various lengths of time
// TODO does this work for 3 quarters?
const lengthSplits = [
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

// Return the duration between the marked quarter beats.
// Assumes that no length exceeds 3 beats.
function between(lastBeat, thisBeat, quarters = 4) {
  const length = thisBeat - lastBeat;
  return length > 0 ? length : length + quarters;
}
