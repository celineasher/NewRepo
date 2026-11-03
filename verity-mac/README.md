# Verity for macOS — GitHub installer

Pixel-art macOS desktop companion using Ollama for local AI chat. Verity includes a floating smiley pet, hands-free and wake-word speech, push-to-talk, mute/unmute, microphone selection and testing, and optional Fish Audio speech.

## Install and update

Quit the running Verity app from its menu-bar icon, then run the **same command every time**:

```bash
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install.sh | bash
```

The small [install.sh](install.sh) downloads the latest [install-verity.sh](install-verity.sh). The latter verifies its bundled Swift source and compiles the app locally on macOS 13+ using Xcode Command Line Tools. GitHub-based installer updates can be made without changing this command.

After a successful installation, `bash ~/bin/verity-update` also fetches this GitHub installer.

## Verity 1.2.3: wake-word greeting fix

The previous launcher failed with `build.command.rej` because it tried to patch a versioned source file with mismatched version context. That **external patch step has been removed from the online launcher**. The installer now applies a strictly checked greeting-source update and version marker before compilation.

With Voice Studio set to **Wake word** and the microphone unmuted, saying “Hello Verity” or “Hey Verity” on its own is treated as a greeting command. Hands-free mode accepts spoken questions without a wake phrase. Enable spoken replies, verify Ollama is running, and test microphone levels if no reply is heard.

## What to edit for future releases

- `install.sh`: Stable download/update entry point; rarely needs changing.
- `install-verity.sh`: Versioned install/build process and bundled application source; must be repackaged when changing Swift.
- The installed editable Swift files live at `~/Library/Application Support/Verity/Source/`.

This repository is public. **Never commit private Fish Audio API keys or credentials.**

## Requirements

- macOS 13 or later
- Xcode Command Line Tools / Swift compiler
- Ollama installed with a suitable local model
- Microphone and speech recognition permissions when using voice

The installer and Swift source have undergone static validation, but this update has not yet been compiled or voice-tested on your personal Mac.
