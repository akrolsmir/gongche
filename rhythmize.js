function rhythmize(input, timeSignature) {
  switch (timeSignature) {
    case TimeSignature.FOUR_FOUR:
      return rhythmizeBlock(input, timeSignature);
    case TimeSignature.EIGHT_FOUR:
      return rhythmizeBlock(input, timeSignature);
    case TimeSignature.FREE:
      return rhythmizeFree(input);
  }
}

function rhythmizeFree(input) {
  let output = [];
  for (const symbol of input) {
    if (symbol == "_") {
      output.push(BAR);
    } else {
      symbol.setDuration('4'); // All notes in free rhythm are quarter notes.
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
function rhythmizeBlock(input, timeSignature) {
  const ts = timeSignature;
  let output = [];
  let block = [];
  let lastBeat = 1;
  for (let i = 0; i < input.length; i++) {
    const symbol = input[i];
    if (symbol == "、") {
      [block, lastBeat] = processBlock(block, output, lastBeat, symbol, ts);
      // Also add a new bar marker.
      output.push(BAR);
    }
    else if (symbol == "﹆") {
      [block, lastBeat] = processBlock(block, output, lastBeat, symbol, ts);      
    }
    else if (symbol == "。") {
      [block, lastBeat] = processBlock(block, output, lastBeat, symbol, ts);
    }
    else if (symbol == "_") {
      [block, lastBeat] = processBlock(block, output, lastBeat, symbol, ts);
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
      [block, lastBeat] = processBlock(block, output, lastBeat, symbol, ts);
      // Next, add a quarter copy of the marked note, to sustain it.
      const copy = markedNote.getCopy();
      copy.setDuration('4');
      output.push(copy);
      // The next beat is thus also adjusted by 1 quarter.
      lastBeat++;
    }
    else if (symbol == "L") {
      // Include the marked (next) note in the block
      i++;
      const markedNote = input[i];
      block.push(markedNote);
      // Then process as usual.
      [block, lastBeat] = processBlock(block, output, lastBeat, symbol, ts);
      // Add a bar marker.
      output.push(BAR);
      // Next, add a quarter copy of the marked note, to sustain it through 1.
      const copy = markedNote.getCopy();
      copy.setDuration('4');
      output.push(copy);
      // The next beat is thus also adjusted by 1 quarter.
      lastBeat++;
    }
    else if (symbol == "╚") {
      // Include the marked (next) note in the block
      i++;
      const markedNote = input[i];
      block.push(markedNote);
      // Then process as usual.
      [block, lastBeat] = processBlock(block, output, lastBeat, symbol, ts);
      // Next, add a quarter copy of the marked note, to sustain it.
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
  // Add any remaining notes to one last bar.
  if (block.length > 0) {
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
    throw `Invalid block length ${block.length}`
  }
  console.log(block);
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
