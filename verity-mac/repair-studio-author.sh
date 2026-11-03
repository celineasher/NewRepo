#!/usr/bin/env bash
# Verity Studio Bridge v1.3.3: patch known invalid Script/LocalScript .Author uses.
# Patches only the user's local Python bridge. No sudo or Swift rebuild.
set -euo pipefail

note(){ printf '\n[Verity Studio] %s\n' "$*"; }
die(){ printf '\n[Verity Studio] ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$(uname -s)" == Darwin ]] || die 'This repair is only for macOS.'
for cmd in curl shasum awk python3 launchctl mktemp; do
  command -v "$cmd" >/dev/null 2>&1 || die "Missing $cmd"
done
bridge="$HOME/Library/Application Support/Verity/StudioBridge/studio_agent.py"
agent="$HOME/Library/LaunchAgents/com.local.verity.studio-bridge.plist"
[[ -f "$bridge" && -f "$agent" ]] || die 'Studio Mode bridge or LaunchAgent missing. Install Studio Mode first.'

tmp="$(mktemp "$HOME/Library/Caches/verity-author-133.XXXXXXXX")" || die 'Could not create temp file.'
trap 'rm -f "$tmp"' EXIT
url='https://raw.githubusercontent.com/celineasher/NewRepo/2cef31ec6af6ddc4a79a6c8caa9faa80850791fb/verity-mac/repair-studio-author-v133.py'
expected='7fd454e00e30bad6b0d7bb4589861209a71e813c8de3614e21f8b2c06dcc3df8'
note 'Downloading the pinned Studio Mode v1.3.3 bridge repair…'
curl --proto '=https' --tlsv1.2 -fsSL --retry 2 "$url" -o "$tmp" || die 'Repair download failed.'
actual="$(shasum -a 256 "$tmp" | awk '{print $1}')"
if [[ "$expected" != "$actual" ]]; then
  note "Expected SHA256: $expected"
  note "Received SHA256: $actual"
  die 'Repair checksum mismatch. No changes made.'
fi
python3 -m py_compile "$tmp" || die 'Downloaded Python patch failed syntax validation.'
note 'Patching the installed Studio bridge (keeping a backup)…'
python3 "$tmp" "$bridge" || die 'Bridge not recognized; nothing restarted.'
python3 -m py_compile "$bridge" || die 'Bridge failed Python compilation.'

domain="gui/$(id -u)"
note 'Restarting the local Studio bridge to clear any stale approved code…'
launchctl bootout "$domain" "$agent" >/dev/null 2>&1 || true
launchctl bootstrap "$domain" "$agent" || die 'LaunchAgent failed. Check ~/Library/Logs/verity-studio-error.log.'
note 'Bridge updated. Generate a NEW Studio preview in Verity, then review and Apply.'
