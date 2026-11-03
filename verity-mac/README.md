# Verity for macOS — GitHub installer

Pixel-art yellow-smiley desktop AI companion using local Ollama. Includes hands-free conversation, push-to-talk, mute/unmute, microphone selection and live mic testing in Verity v1.2.

## Install or update on macOS

Run the same command every time:

```bash
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install.sh | bash
```

The small `install.sh` is the permanent online entry point. It downloads the current `install-verity.sh` into a temporary file and runs it. The complete Verity v1.2 Swift source and artwork are embedded in `install-verity.sh`; an existing installation is preserved if compilation fails.

Optional: download the script instead of piping it to Bash:

```bash
curl -fL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install.sh -o ~/Downloads/verity-install.sh
bash ~/Downloads/verity-install.sh
```

To build without launching:

```bash
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install.sh | bash -s -- --no-launch
```

## Updating Verity

The online install command stays unchanged. To release a new version, update **this GitHub folder's** `install-verity.sh` with the newly bundled standalone installer. You can edit the small `install.sh` if you want to change the update flow, but it is only the download wrapper; most Swift feature changes belong in the Verity application source rather than the wrapper.

The editable Swift source can be extracted from any installed version at:

```
~/Library/Application Support/Verity/Source/
```

After editing the Swift code, rebuild the embedded installer with an updated ZIP and SHA-256 hash before replacing `install-verity.sh`. Do not change only the hash string without updating the ZIP contents.

GitHub location:
- [Stable entry point](https://github.com/celineasher/NewRepo/blob/master/verity-mac/install.sh)
- [Self-contained Verity v1.2 installer](https://github.com/celineasher/NewRepo/blob/master/verity-mac/install-verity.sh)

## Requirements

- macOS 13+
- Swift compiler provided by Xcode Command Line Tools
- Ollama installed and running with at least one local model
- Microphone and speech-recognition permissions for voice mode

## Security

Review scripts before running; the raw URL downloads whatever is currently in the public GitHub branch. No `sudo` is required. Keep Fish Audio API keys and private user data out of this public repository.

This project has not been compiled or live-tested on macOS by the publishing environment.
