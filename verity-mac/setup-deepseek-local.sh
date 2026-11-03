#!/usr/bin/env bash
# Verity — install DeepSeek R1 8B to the external Athar SSD.
# Safe model relocation: preserves existing models and keeps a local backup.
set -euo pipefail

SSD='/Volumes/Athar SSD'
MODEL='deepseek-r1:8b'
DEFAULT_MODELS="$HOME/.ollama/models"

info() { printf '\n[Verity / DeepSeek] %s\n' "$*"; }
fail() { printf '\n[Verity / DeepSeek] ERROR: %s\n' "$*" >&2; exit 1; }

case "${1:-}" in
  '') ;;
  --dry-run) DRY_RUN=1 ;;
  --help|-h)
    printf 'Usage: bash setup-deepseek-local.sh [--dry-run]\nInstalls DeepSeek R1 8B using Ollama with model storage on the Athar SSD.\nExisting model folders are backed up, not deleted. No sudo.\n'
    exit 0 ;;
  *) fail "Unknown option: $1" ;;
esac

[[ "$(uname -s)" == 'Darwin' ]] || fail 'This setup runs on macOS only.'
[[ -d "$SSD" ]] || fail "SSD not found at $SSD. Connect and mount Athar SSD in Finder, then rerun."
# A disconnected external drive can leave an ordinary directory in /Volumes.
mount | grep -F " on $SSD (" >/dev/null || fail "The directory $SSD is not an actively mounted volume. Reconnect the SSD."
[[ -w "$SSD" ]] || fail "The SSD is read-only or inaccessible: $SSD"

command -v curl >/dev/null 2>&1 || fail 'curl is required.'
command -v rsync >/dev/null 2>&1 || fail 'rsync is required.'
command -v launchctl >/dev/null 2>&1 || fail 'launchctl is required on macOS.'

CURRENT_MODELS="$(launchctl getenv OLLAMA_MODELS 2>/dev/null || true)"
if [[ -n "$CURRENT_MODELS" && "$CURRENT_MODELS" == "$SSD/"* ]]; then
  TARGET="$CURRENT_MODELS"
elif [[ -d "$SSD/Ollama/models" ]]; then
  TARGET="$SSD/Ollama/models"
elif [[ -d "$SSD/Ollama/blobs" || -d "$SSD/Ollama/manifests" ]]; then
  TARGET="$SSD/Ollama"
else
  TARGET="$SSD/Ollama/models"
fi

info "External SSD: $SSD"
info "Selected model-storage folder: $TARGET"
info "Model to install: $MODEL (approximately 5.2 GB)"
if [[ "${DRY_RUN:-0}" == 1 ]]; then
  info 'Dry-run mode: no files or settings were changed.'
  exit 0
fi

# Find Ollama even when Ollama.app itself is installed on the external drive.
APP=''
for candidate in \
  "$SSD/Ollama.app" \
  "$SSD/Ollama/Ollama.app" \
  '/Applications/Ollama.app' \
  "$HOME/Applications/Ollama.app"; do
  if [[ -d "$candidate" ]]; then APP="$candidate"; break; fi
done

if command -v ollama >/dev/null 2>&1; then
  OLLAMA="$(command -v ollama)"
elif [[ -n "$APP" && -x "$APP/Contents/Resources/ollama" ]]; then
  OLLAMA="$APP/Contents/Resources/ollama"
else
  fail "Cannot find Ollama's CLI. Verify Ollama.app is installed and launches from the SSD."
fi

# Avoid altering model storage while an Ollama process is writing to it.
if pgrep -x Ollama >/dev/null 2>&1; then
  info 'Asking Ollama.app to quit before switching storage…'
  osascript -e 'tell application "Ollama" to quit' >/dev/null 2>&1 || true
  for ((i=0; i<20; i++)); do
    if ! pgrep -x Ollama >/dev/null 2>&1; then break; fi
    sleep 1
  done
  if pgrep -x Ollama >/dev/null 2>&1; then
    fail 'Ollama is still running. Quit it using the menu-bar icon, then rerun this script.'
  fi
fi
if curl -fsS --max-time 2 'http://127.0.0.1:11434/api/tags' >/dev/null 2>&1; then
  fail 'An Ollama server is still running. Stop it (Ctrl+C in the terminal running ollama serve) and rerun. No model files were changed.'
fi

mkdir -p "$TARGET" "$HOME/.ollama"
[[ -w "$TARGET" ]] || fail "Model-storage folder is not writable: $TARGET"

# Preserve any models from an existing custom launchctl storage directory.
if [[ -n "$CURRENT_MODELS" && "$CURRENT_MODELS" != "$TARGET" && -d "$CURRENT_MODELS" ]]; then
  if [[ "$(cd "$CURRENT_MODELS" && pwd -P)" != "$(cd "$TARGET" && pwd -P)" ]]; then
    info "Copying models from your previously configured Ollama storage ($CURRENT_MODELS). Originals will remain untouched."
    rsync -a --ignore-existing "$CURRENT_MODELS/" "$TARGET/" || fail 'Could not copy existing custom model storage.'
  fi
fi

# The default Ollama path also points to the SSD after logout/reboot.
if [[ -d "$DEFAULT_MODELS" ]] && \
   [[ "$(cd "$DEFAULT_MODELS" && pwd -P)" == "$(cd "$TARGET" && pwd -P)" ]]; then
  info 'Your default Ollama model path already points to the selected SSD folder.'
else
  if [[ -e "$DEFAULT_MODELS" || -L "$DEFAULT_MODELS" ]]; then
    if [[ -d "$DEFAULT_MODELS" ]]; then
      info 'Copying existing Mac models to the SSD without overwriting anything already there…'
      rsync -a --ignore-existing "$DEFAULT_MODELS/" "$TARGET/" || fail 'Model migration failed; original model directory was not changed.'
    fi
    backup="$HOME/.ollama/models.before-ssd.$(date +%Y%m%d-%H%M%S).$$"
    mv "$DEFAULT_MODELS" "$backup" || fail 'Could not preserve the old local model folder.'
    if ! ln -s "$TARGET" "$DEFAULT_MODELS"; then
      mv "$backup" "$DEFAULT_MODELS" || true
      fail 'Could not link Ollama model storage to the SSD. Original path was restored if possible.'
    fi
    info "Previous Mac models retained as a backup at: $backup"
  else
    ln -s "$TARGET" "$DEFAULT_MODELS" || fail 'Could not create Ollama model-storage symlink.'
  fi
fi

launchctl setenv OLLAMA_MODELS "$TARGET" || fail 'Could not configure the Ollama model storage path.'
info 'Starting Ollama with SSD-backed storage…'

if [[ -n "$APP" ]]; then
  open "$APP" || fail "Could not open Ollama.app from $APP"
elif open -a Ollama >/dev/null 2>&1; then
  :
else
  log="$HOME/Library/Logs/verity-ollama-ssd.log"
  mkdir -p "$(dirname "$log")"
  nohup env OLLAMA_MODELS="$TARGET" "$OLLAMA" serve >>"$log" 2>&1 </dev/null &
  info "Started the Ollama server from the CLI; log file: $log"
fi

ready=0
for ((i=0; i<45; i++)); do
  if curl -fsS --max-time 2 'http://127.0.0.1:11434/api/tags' >/dev/null 2>&1; then
    ready=1; break
  fi
  sleep 1
done
[[ "$ready" == 1 ]] || fail 'Ollama did not start. Open Ollama from your SSD and rerun the script.'

info "Downloading $MODEL directly into the SSD-backed Ollama storage…"
"$OLLAMA" pull "$MODEL" || fail 'DeepSeek download failed. Reconnect SSD/check storage and rerun.'
"$OLLAMA" list | awk -v model="$MODEL" 'NR > 1 && $1 == model { found=1 } END { exit !found }' \
  || fail 'DeepSeek is not listed in Ollama after downloading.'

expected_manifest="$TARGET/manifests/registry.ollama.ai/library/deepseek-r1/8b"
if [[ ! -f "$expected_manifest" ]]; then
  fail "DeepSeek is listed, but its manifest was not found in the selected SSD folder ($TARGET). An existing server may still be using another directory."
fi

info 'Success: DeepSeek R1 8B is installed on Athar SSD.'
printf '\n  Model directory: %s\n' "$TARGET"
printf '  Model:           %s\n' "$MODEL"
printf '\n[Verity / DeepSeek] Open Verity → Voice Studio Settings → AI Provider: Ollama (local).\n'
printf '[Verity / DeepSeek] Refresh models, then select deepseek-r1:8b.\n'
printf '[Verity / DeepSeek] Keep Athar SSD connected whenever you use Ollama.\n'

if [[ -d "$HOME/Applications/Verity.app" ]]; then
  open "$HOME/Applications/Verity.app" || true
fi
