#!/usr/bin/env bash
# Point an existing Verity installation at local DeepSeek R1 8B.
# This never downloads models, moves SSD files, or modifies your other Ollama models.
set -euo pipefail

MODEL="deepseek-r1:8b"
APP="$HOME/Applications/Verity.app"
BUNDLE_ID="com.local.verity.companion"
API="http://127.0.0.1:11434/api/tags"

info() { printf '\n[Verity / DeepSeek] %s\n' "$*"; }
fail() { printf '\n[Verity / DeepSeek] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "This script is for macOS."
[[ -d "$APP" ]] || fail "Verity.app not found in ~/Applications. Install Verity first."
command -v python3 >/dev/null 2>&1 || fail "Python 3 (from Xcode Command Line Tools) is required."
command -v curl >/dev/null 2>&1 || fail "curl is required."
command -v defaults >/dev/null 2>&1 || fail "macOS defaults tool is missing."

if [[ -x /usr/libexec/PlistBuddy ]]; then
  bundle_id="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$APP/Contents/Info.plist" 2>/dev/null || true)"
  [[ "$bundle_id" == "$BUNDLE_ID" ]] || fail "Unexpected app identifier ($bundle_id); refusing to alter another app's settings."
fi

# This verifies the SSD-backed Ollama instance instead of triggering a new download.
if ! curl -fsS --connect-timeout 3 --max-time 5 "$API" >/dev/null 2>&1; then
  info "Ollama is not responding. Attempting to start the Ollama macOS app…"
  open -a Ollama || fail "Start Ollama manually; then rerun this script."
  ready=0
  for ((i=0; i<20; i++)); do
    if curl -fsS --connect-timeout 2 --max-time 3 "$API" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  [[ "$ready" == 1 ]] || fail "Ollama did not start. Confirm Athar SSD is connected, then open Ollama and rerun."
fi

if ! curl -fsS --connect-timeout 3 --max-time 8 "$API" |
  python3 -c '
import json,sys
models=json.load(sys.stdin).get("models", [])
sys.exit(0 if any(m.get("name")=="deepseek-r1:8b" for m in models) else 1)
'; then
  fail "Ollama does not list deepseek-r1:8b. Check the model download finished and Athar SSD is connected. Run: ollama list"
fi

info "DeepSeek R1 8B is available in Ollama."
# Quit before writing preferences so running Verity cannot overwrite the selection.
if pgrep -x Verity >/dev/null 2>&1; then
  info "Closing Verity before updating its model selection…"
  pkill -TERM -x Verity || fail "Could not quit Verity. Quit it from the menu bar and rerun."
  for ((i=0; i<20; i++)); do
    if ! pgrep -x Verity >/dev/null 2>&1; then break; fi
    sleep 1
  done
  ! pgrep -x Verity >/dev/null 2>&1 || fail "Verity is still running; quit it manually before continuing."
fi

# The model key is defined in Sources/Verity/VerityStore.swift.
defaults write "$BUNDLE_ID" "verity.model" -string "$MODEL"

# Versions with a cloud-provider switch store a provider rawValue. Read the
# relevant key from installed Swift source where available, then set Ollama.
STORE="$HOME/Library/Application Support/Verity/Source/Sources/Verity/VerityStore.swift"
provider_key="$(
  python3 - "$STORE" <<'PY'
from pathlib import Path
import re,sys
p=Path(sys.argv[1])
s=p.read_text() if p.is_file() else ""
for line in s.splitlines():
    if ('AIProvider(rawValue:' in line or 'aiProvider =' in line or 'selectedAIProvider =' in line) and 'forKey:' in line:
        m=re.search(r'forKey:\s*"(verity\.[^"]+)"',line)
        if m:
            print(m.group(1))
            break
PY
)"
if [[ -z "$provider_key" ]]; then
  provider_key="verity.aiProvider"
fi
defaults write "$BUNDLE_ID" "$provider_key" -string "ollama"

info "Configured: AI provider = Ollama (local), model = $MODEL"
info "Using whichever Ollama model directory is already configured (including Athar SSD)."
open "$APP" || fail "Settings saved, but Verity could not launch."
info "Verity launched. Refresh the Ollama model list if its picker still shows an old selection."
