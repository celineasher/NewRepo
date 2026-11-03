# Use local DeepSeek R1 8B in Verity

Once DeepSeek R1 8B is installed with Ollama on your Athar SSD, switch Verity's saved AI provider and model using:

```bash
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/use-deepseek-in-verity.sh | bash
```

This **does not redownload the model or rebuild Verity**. It checks the local Ollama models, closes Verity if running, sets the `com.local.verity.companion` preferences to Ollama plus `deepseek-r1:8b`, and reopens Verity. The SSD storage configuration is unchanged. You can still select other models in Verity later.

Manual equivalent: in Verity, choose **Ollama (Local)** as AI Provider, then refresh the models and choose **deepseek-r1:8b**.

---

# Install DeepSeek on Athar SSD

The [local DeepSeek installer](./setup-deepseek-local.sh) now stores DeepSeek R1 8B on the mounted **Athar SSD** rather than assuming the Mac's internal storage. It uses an existing SSD model directory if one is already configured. By default it will create `/Volumes/Athar SSD/Ollama/models` only when needed.

```bash
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/setup-deepseek-local.sh | bash
```

Preview the selected drive path without changing any settings:

```bash
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/setup-deepseek-local.sh | bash -s -- --dry-run
```

**Safety:** The script refuses to run if the SSD is not mounted, asks Ollama to quit before moving model storage, copies old models to the SSD, retains a timestamped backup of the former `~/.ollama/models` path, and creates a symlink to the SSD. It sets `OLLAMA_MODELS` in the current macOS launch session, relaunches Ollama, then verifies that the `deepseek-r1:8b` manifest was written on the SSD. Do not unplug the drive while Ollama is running.

**In Verity:** Select **AI Provider → Ollama (local)**, refresh the models, and choose `deepseek-r1:8b`. This does not install the full DeepSeek V4.1 Flash checkpoint, and Verity itself can remain installed in `~/Applications`.

---

# Local DeepSeek R1 8B for Verity

DeepSeek-R1 8B is a **local Ollama model**, not the DeepSeek V4.1 Flash cloud API. It requires no DeepSeek API key. Approximate download size: 5.2 GB.

## One-command setup for macOS (Ollama already installed)

```bash
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/setup-deepseek-local.sh | bash
```

The setup script checks that Ollama is installed, starts the macOS Ollama app if the server is stopped, downloads `deepseek-r1:8b`, verifies it appears in `ollama list`, and opens Verity if present. It does **not** change your Voice Studio settings or overwrite your other AI models.

To inspect the script before running it:

```bash
curl -fL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/setup-deepseek-local.sh -o ~/Downloads/setup-deepseek-local.sh
less ~/Downloads/setup-deepseek-local.sh
bash ~/Downloads/setup-deepseek-local.sh
```

Once downloaded, open Verity, select **AI Provider: Ollama (local)**, refresh models, choose `deepseek-r1:8b`, and send a chat message. For voice, unmute the microphone and use hands-free or push-to-talk.

Manual install (if preferred):

```bash
ollama pull deepseek-r1:8b
ollama run deepseek-r1:8b
```

The Ollama app or server must stay running while Verity uses the local model. If the model does not appear, check `ollama list` and reload the model list in Verity.

---

# Verity v1.2.6 — Hear Yourself freeze fix

When enabling **Hear Yourself**, Verity now routes microphone sidetone through a **separate output-only audio engine**. CoreAudio output switching and monitor shutdown run on a dedicated audio queue, so toggling monitoring no longer rebuilds the active speech-recognition graph on the UI thread. Mic level monitoring and speech recognition continue independently. Turn live monitoring on only with headphones to avoid feedback.

Update after quitting Verity:

```bash
pkill -x Verity 2>/dev/null || true
curl -fsSL https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install.sh | bash
```

The installer checks the exact base-source hash and patch SHA-256 before replacing your app. Existing preferences, chat history, and Fish Audio key are preserved. The app is compiled on macOS by GitHub Actions; interactive device testing must be done with your Mac's microphones and audio interface.

---

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
