#!/usr/bin/env bash
# Verity Studio v1.3.4 — fix empty DeepSeek R1 / Ollama Luau output.
# Only modifies local Python Studio bridge. Does not rebuild Verity or edit a game.
set -euo pipefail

info() { printf '\n[Verity Studio] %s\n' "$*"; }
fail() { printf '\n[Verity Studio] ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$(uname -s)" == "Darwin" ]] || fail "This repair requires macOS."
for tool in curl shasum awk python3 launchctl mktemp; do
  command -v "$tool" >/dev/null 2>&1 || fail "Missing $tool."
done

bridge="$HOME/Library/Application Support/Verity/StudioBridge/studio_agent.py"
agent="$HOME/Library/LaunchAgents/com.local.verity.studio-bridge.plist"
[[ -f "$bridge" && -f "$agent" ]] || fail "Studio Mode bridge missing. Install Studio Mode first."

tmp="$(mktemp -t verity-ollama-fix)"
trap 'rm -f "$tmp"' EXIT
url='https://raw.githubusercontent.com/celineasher/NewRepo/b7f140330aba388a2cf22fdc18e5e664bdc98d10/verity-mac/repair-ollama-luau-v134.py'
expected='15f5bbd2e4c2ccd7cfe86a195ed87170310a75285adb7490f3a669aca00bb7ec'
info "Downloading version-pinned Ollama/DeepSeek generation fix..."
curl --proto '=https' --tlsv1.2 -fsSL --retry 3 "$url" -o "$tmp" || fail "Download failed."
actual="$(shasum -a 256 "$tmp" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  info "Expected SHA-256: $expected"
  info "Received SHA-256: $actual"
  fail "The patch checksum did not match. Nothing was changed."
fi
python3 -m py_compile "$tmp" || fail "Downloaded patch is invalid."
info "Patching the local Studio bridge..."
python3 "$tmp" "$bridge" || fail "Installed bridge source was not recognized. No restart attempted."
python3 -m py_compile "$bridge" || fail "Bridge syntax check failed."
info "Restarting Studio bridge to clear pending previews..."
domain="gui/$(id -u)"
launchctl bootout "$domain" "$agent" >/dev/null 2>&1 || true
launchctl bootstrap "$domain" "$agent" || fail "Could not restart bridge. See ~/Library/Logs/verity-studio-error.log."
info "Done. Generate a NEW Studio preview in Verity. Do not apply an old preview."
