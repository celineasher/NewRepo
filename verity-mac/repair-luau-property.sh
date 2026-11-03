#!/usr/bin/env bash
# Verity Studio MCP 1.3.2 — safe Luau property validation repair.
# Fixes the bridge, not the Roblox place. No Swift rebuild or sudo.
set -euo pipefail

log(){ printf '\n[Verity Studio] %s\n' "$*"; }
die(){ printf '\n[Verity Studio] ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$(uname -s)" == "Darwin" ]] || die "This repair is only for macOS."
for cmd in curl python3 launchctl mktemp; do
  command -v "$cmd" >/dev/null 2>&1 || die "Missing required command: $cmd"
done

bridge="$HOME/Library/Application Support/Verity/StudioBridge/studio_agent.py"
agent="$HOME/Library/LaunchAgents/com.local.verity.studio-bridge.plist"
[[ -f "$bridge" ]] || die "Studio Mode bridge not found. Install Verity Studio Mode first."
[[ -f "$agent" ]] || die "Studio Mode LaunchAgent not found. Install Verity Studio Mode first."

tmp="$(mktemp -d "$HOME/Library/Caches/verity-studio-guard.XXXXXXXX")" || die "Cannot create temp folder."
trap 'rm -rf "$tmp"' EXIT

# Immutable, reviewed revision of the code-quality patch.
patch_url="https://raw.githubusercontent.com/celineasher/NewRepo/dcab782dc0de35fbb50222c91cbfc77c19982e29/verity-mac/verity-studio-luau-guard-v132.py"
log "Downloading the version-pinned script-property fix…"
curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error --retry 2 "$patch_url" -o "$tmp/fix.py" \
  || die "Could not download patch from GitHub."
grep -Fq "Verity Studio Luau property validation v1.3.2" "$tmp/fix.py" || die "Unexpected patch file."
python3 -m py_compile "$tmp/fix.py" || die "Downloaded patch failed Python syntax validation."

log "Installing validation with a backup of the original bridge…"
python3 "$tmp/fix.py" "$bridge" || die "Patch did not match the installed bridge. Nothing was restarted."
python3 -m py_compile "$bridge" || die "Bridge syntax validation failed."

domain="gui/$(id -u)"
log "Restarting only the Verity Studio bridge…"
launchctl bootout "$domain" "$agent" >/dev/null 2>&1 || true
if ! launchctl bootstrap "$domain" "$agent"; then
  die "Bridge could not restart. View ~/Library/Logs/verity-studio-error.log."
fi
log "Repair installed. Existing Luau edits were not modified."
log "In Verity, generate a NEW Studio preview; do not re-apply the old .Author script."
