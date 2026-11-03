#!/usr/bin/env bash
# Verity • Local DeepSeek R1 8B setup
# Downloads a local model into Ollama; does not modify Verity preferences.
set -euo pipefail

MODEL="deepseek-r1:8b"
say() { printf '\n[Verity / DeepSeek] %s\n' "$*"; }
fail() { printf '\n[Verity / DeepSeek] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "This setup is intended for macOS."

if command -v ollama >/dev/null 2>&1; then
  OLLAMA="$(command -v ollama)"
elif [[ -x "/Applications/Ollama.app/Contents/Resources/ollama" ]]; then
  OLLAMA="/Applications/Ollama.app/Contents/Resources/ollama"
elif [[ -x "$HOME/Applications/Ollama.app/Contents/Resources/ollama" ]]; then
  OLLAMA="$HOME/Applications/Ollama.app/Contents/Resources/ollama"
else
  fail "Ollama is not installed. Download it at https://ollama.com/download/mac, launch Ollama, and rerun."
fi

command -v curl >/dev/null 2>&1 || fail "curl is required."

if ! curl --silent --show-error --fail --max-time 3 "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
  say "Starting the Ollama macOS application…"
  if [[ -d "/Applications/Ollama.app" || -d "$HOME/Applications/Ollama.app" ]]; then
    open -a Ollama || fail "Could not launch Ollama. Open it manually, then rerun."
  else
    fail "Ollama's local server is not running. Start it in another Terminal with: ollama serve"
  fi
  ready=0
  for ((attempt=1; attempt<=30; attempt++)); do
    if curl --silent --fail --max-time 2 "http://127.0.0.1:11434/api/tags" >/dev/null 2>&1; then
      ready=1
      break
    fi
    sleep 1
  done
  [[ "$ready" == 1 ]] || fail "Ollama did not become reachable on http://127.0.0.1:11434."
fi

say "Installing $MODEL (approximately 5.2 GB of model data)."
"$OLLAMA" pull "$MODEL" || fail "Model download failed. Check network and free disk space, then rerun."

say "Verifying the model is installed…"
"$OLLAMA" list | awk -v model="$MODEL" 'NR>1 && $1==model {found=1} END {exit !found}' \
  || fail "$MODEL was not listed by Ollama after download."

say "DeepSeek is installed and ready."
printf '\n[Verity / DeepSeek] To use it in Verity:\n'
printf '  1. Open Verity → Voice Studio Settings → AI Provider: Ollama (local).\n'
printf '  2. Refresh Ollama Models.\n'
printf '  3. Select deepseek-r1:8b in the Ollama model selector.\n'
printf '  4. Start a chat or enable hands-free voice.\n'
printf '\n[Verity / DeepSeek] To test in Terminal: ollama run deepseek-r1:8b\n'
if [[ -d "$HOME/Applications/Verity.app" ]]; then
  say "Launching Verity."
  open "$HOME/Applications/Verity.app" || true
else
  say "Verity.app is not installed in ~/Applications. Install it separately using its GitHub installer."
fi
