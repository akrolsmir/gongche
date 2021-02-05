## Nine Modes

Find sheet music for classical Chinese opera, at http://ninemodes.org

## Tech stack

Nine Modes is built on top of:

- VueJS on the frontend
- Github Pages for hosting
- Firestore for the database
- Google Vision APIs for Chinese character OCR
- Vexflow for rendering the sheet music
- Tone.js for playing back songs
- Chart.js for rendering analysis in the Query Engine

The site is entirely static (there's no build process!)
To test the site locally, just clone the code, then spin up a local server.
E.g.:

```
git clone https://github.com/akrolsmir/gongche.git
cd gongche
python -m http.server 8020
```

And then open http://localhost:8020.

While developing: Prettier is mandatory, VSCode is recommended.

To deploy: just push to master, and Github Pages will update the site!

## Code structure

### Pages that a user can see

- `query.html`: the Query Engine, which lets users explore the entire set of 6586 songs,
  and do some analysis on them. Also serves as the main entry point Ninemodes.
- `sheet.html`: An individual song piece, converted to staff and Jianpu notation
- `prosody.html`: The prosody (poetic) information on a group of pieces
- `edit/index.html`: The tool that an assistant can use to convert a scanned PDF of
  Gongche pieces into the data format used by all the other tools. Built on top of HTML Canvas.
- `debugz.html`: A internal page that shows which songs have errors, which need to be corrected by the assistant

### Javascript files of interest

- `models/song.js`: The data object representing each song, which is synced to Firestore
- `rhythmize.js`: Encodes the assumptions we made to assign note durations to Gongche pieces (which do not have fixed durations)
- `playback.js`: Code that uses Tone.js to play back the sheet music
- `skeletonize.js`: A way to only play only the first or last note in a group (slur) of notes, for Casey's analysis
- `lines.js`: THe basic unit of song analysis, used by prosody and the Query Engine

### Assets

- `assets/book (X).pdf`: The series of scanned collection
- `mulu.js`: "Mulu" means "Table of Contents"; this contains the metadata for all songs,
  as well as `getSongTables()` to load all 6500+ songs into memory for the Query Engine and editing tools
- `rhyme_dictionary.js`: A mapping of Chinese words to their classic pronounciations, for analysis
- `translations.js`: i18n constants so users can toggle between an English and Chinese UI

Other dev notes:

- Nine Modes is set up to be a Progressive Web App (PWA), so it can be used offline.
  Because of this, you may need to hard refresh or disable cache to see your code updates
- The project started with the editing tool first, than prosody, then sheet music, and finally the Query Engine.
  Code quality and practices are better with the newer file
