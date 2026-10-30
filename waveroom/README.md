# Waveroom Studio

**Waveroom** is a multitrack, browser-based digital audio workstation inspired by the workflow of modern DAWs. It uses the browser's native Web Audio API. No account, server, framework, or build step is required.

## Features
- Eight starter tracks: kick, snare, hi-hat, clap, sub bass, electric keys, lead, and pad
- Add new polyphonic synth tracks
- Editable 16-step piano roll, drag-to-lengthen, move, and remove notes
- Drum step sequencer with individual drum voices
- Eight-bar arrangement with four patterns (A/B/C/D) per track; click clips to switch patterns
- Six melodic presets: electric piano, bass, lead, pad, pluck, organ
- Synth attack, release and filter controls
- Master volume and individual track volume/pan/mute/solo
- BPM 50–240, swing, metronome, loop toggle and position display
- Live playing from the computer keyboard; arm Record to write notes to patterns
- Real-time Web Audio synthesis and offline **44.1 kHz stereo 16-bit WAV** rendering
- Automatic local project persistence and downloadable JSON project backups
- Responsive dark interface; focus mode to expand the piano roll

## Run locally
Open `index.html` in Chrome, Edge or a recent Web Audio-compatible browser. Click Play to unlock audio. The demo project is loaded on first launch. You can alternatively serve the folder using `python3 -m http.server 8000` and open `http://localhost:8000`.

## GitHub Pages
The app lives inside the `waveroom/` folder of this repository, not at its root. To host it publicly: open this repository's **Settings → Pages → Build and deployment**, select **Deploy from a branch**, branch **master**, folder **/(root)** and Save. Once GitHub Pages finishes deploying, the app should be reachable at `https://celineasher.github.io/NewRepo/waveroom/`. This URL is conditional on Pages being enabled; deployment is not automatically confirmed by a source commit.

## Shortcuts
| Action | Shortcut |
| --- | --- |
| Play / pause | Space |
| Stop | Esc |
| Focus / restore editor | F |
| Play chromatic notes from C4 | Z S X D C V G B H N J M , |
| Remove piano note | Double-click or right-click |
| Draw or resize a note | Click / drag in piano roll |

## Project format
Waveroom uses an editable JSON structure with version, tracks, per-track A/B/C/D note patterns, eight arrangement clips per track, instrument settings, BPM and swing. Projects are automatically saved to browser localStorage. Download a JSON backup from **Save** to move projects to another browser.

## Notes and scope
Waveroom is a playable prototype DAW, **not a complete replacement for Ableton Live or FL Studio**. It currently lacks VST/AU plugins, external audio tracks, MIDI file import, multi-song-length editing, and recording audio from a microphone. Generated drum and instrument sounds are procedural synth sounds rather than sampled commercial instruments.

MIT License.
