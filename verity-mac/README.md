# Verity for macOS — v1.2.4

Native macOS pixel-art AI desktop companion with local Ollama chat, voice conversations, wake-word and push-to-talk modes, selectable microphones, and optional Fish Audio TTS.

## Install or update

Quit Verity from its menu-bar icon, then paste:

```bash
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install.sh | bash
```

To inspect the installer first:

```bash
curl -fL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install.sh -o ~/Downloads/verity-install.sh
less ~/Downloads/verity-install.sh
bash ~/Downloads/verity-install.sh
```

The script verifies a pinned embedded source archive and two exact-match, SHA-256-verified source updates, compiles using the installed Swift compiler, and replaces `~/Applications/Verity.app` only if compilation succeeds. It does not require sudo.

## New: Hear Yourself — Live Mic Monitoring

1. Open **Verity → Voice Studio** and grant microphone/speech-recognition permissions if prompted.
2. Select your **Input Device** and click **Unmute**.
3. In **LIVE MIC MONITOR / OUTPUT**, choose your **Output Device**, preferably headphones or your audio interface's headphone output.
4. Turn on **Hear yourself** and speak normally. Use **Monitor volume** to adjust how loudly you hear your own microphone.
5. Turn off **Hear yourself** for silence. Muting Verity also disables monitoring.

**Use headphones**: monitoring through speakers can produce loud acoustic feedback. The monitor is OFF at launch, pauses while Verity is responding, and in Push to Talk mode only sounds while capturing with TALK held.

The output selector controls **only live mic monitoring**. Voice AI replies and the separate 3-second mic test play through the macOS **System Output** (System Settings → Sound → Output).

Other features remain: Ollama models, optional Fish Audio voice, voice previews, microphone meter and 3-second record/play test.

## Updating source

The stable entry-point file is `install.sh`; the existing `install-verity.sh` is an older, pinned base source archive. The launcher currently applies the following exact-match source updates before building:

- `base-to-v1.2.3.patch.gz.b64`
- `monitor-v1.2.4.patch.gz.b64`

Both are decoded and checked for SHA-256 integrity, so mismatches fail safely instead of installing a partially patched app. For larger future versions, replace the pinned source archive and update the launcher. The **Terminal command stays the same**.

Compiled source is saved to `~/Library/Application Support/Verity/Source`.

## Build verification

The `verity-macos-check.yml` GitHub Actions workflow executes `bash verity-mac/install.sh --no-launch` on macOS, verifies the compiled app is executable, checks its version is `1.2.4`, and asserts that Voice Studio includes the new monitor UI.

This validates compilation, but not live sound routing on a particular Mac, interface, or headset.

## Privacy

No microphone audio is uploaded by the live monitor or mic test. Ollama chat stays local by default. Fish Audio is optional and sends generated reply text to its external server when enabled. Fish Audio API keys are stored in macOS Keychain, not the public repository.
