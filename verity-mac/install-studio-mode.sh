#!/usr/bin/env bash
# Verity Studio Mode v1.3.0 — safe in-place macOS upgrade.
# Bundles Python MCP bridge and Swift source patch, builds before replacing app.
set -euo pipefail
info() { printf '\n[Verity Studio] %s\n' "$*"; }
fail() { printf '\n[Verity Studio] ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$(uname -s)" == "Darwin" ]] || fail 'macOS only.'
command -v swift >/dev/null 2>&1 || command -v xcrun >/dev/null 2>&1 || fail 'Install Xcode Command Line Tools first.'
for prog in python3 base64 shasum tar ditto rsync open launchctl; do command -v "$prog" >/dev/null || fail "Missing $prog"; done
source_dir="$HOME/Library/Application Support/Verity/Source"
[[ -f "$source_dir/Package.swift" && -f "$source_dir/build.command" ]] || fail 'Verity source missing; install Verity from GitHub first.'
if pgrep -x Verity >/dev/null 2>&1; then
  fail 'Quit Verity from the menu bar first, then rerun this installer.'
fi
work="$(mktemp -d "${TMPDIR:-/tmp}/verity-studio-130.XXXXXXXX")"
trap 'rm -rf "$work"' EXIT
archive_line="$(awk '/^__VERITY_STUDIO_PAYLOAD__$/ { print NR+1; exit }' "$0")"
[[ -n "$archive_line" ]] || fail 'Missing package payload.'
tail -n "+$archive_line" "$0" | base64 -D > "$work/studio.tar.gz" || fail 'Cannot decode package.'
expected="bdc51c4e5d4de6acb257de2530bcbf3292adeedece30d0b97e5a7d12b4afa6b0"
actual="$(shasum -a 256 "$work/studio.tar.gz" | awk '{print $1}')"
[[ "$actual" == "$expected" ]] || fail 'Archive integrity check failed.'
mkdir -p "$work/overlay" "$work/build"
tar -xzf "$work/studio.tar.gz" -C "$work/overlay"
rsync -a --exclude=.build --exclude=dist "$source_dir/" "$work/build/"
info 'Applying Studio Mode to existing Verity source (AI providers retained).'
python3 "$work/overlay/patch_verity_studio.py" "$work/build" || fail 'Source patch failed. Your app is unchanged.'
info 'Compiling Verity with Roblox Studio Mode.'
(cd "$work/build" && VERITY_SKIP_LAUNCH=1 bash ./build.command) || fail 'Swift compilation failed. Your previous app is unchanged.'
built="$work/build/dist/Verity.app"
[[ -x "$built/Contents/MacOS/Verity" ]] || fail 'Build did not produce Verity.app.'
apps="$HOME/Applications"
mkdir -p "$apps"
final="$apps/Verity.app"
new="$apps/.Verity.studio.new.$$.app"
backup="$apps/.Verity.studio.backup.$$.app"
ditto "$built" "$new" || fail 'Cannot stage app.'
[[ ! -e "$final" ]] || mv "$final" "$backup"
if ! mv "$new" "$final"; then
  [[ ! -d "$backup" ]] || mv "$backup" "$final"
  fail 'Installation failed; old app was restored.'
fi
[[ ! -d "$backup" ]] || rm -rf "$backup"
# Commit editable source after successfully installing the application.
rsync -a --exclude=.build --exclude=dist "$work/build/" "$source_dir/"
bridge_dir="$HOME/Library/Application Support/Verity/StudioBridge"
mkdir -p "$bridge_dir"
cp "$work/overlay/studio_agent.py" "$bridge_dir/studio_agent.py"
chmod 700 "$bridge_dir/studio_agent.py"
python_path="$(command -v python3)"
agent="$HOME/Library/LaunchAgents/com.local.verity.studio-bridge.plist"
mkdir -p "$(dirname "$agent")"
# Property list paths escape XML metacharacters.
bridge_xml="$(printf '%s' "$bridge_dir/studio_agent.py" | sed -e 's/\&/\&amp;/g' -e 's/</\&lt;/g')"
python_xml="$(printf '%s' "$python_path" | sed -e 's/\&/\&amp;/g' -e 's/</\&lt;/g')"
cat > "$agent" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0"><dict>
  <key>Label</key><string>com.local.verity.studio-bridge</string>
  <key>ProgramArguments</key><array><string>$python_xml</string><string>$bridge_xml</string></array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><dict><key>SuccessfulExit</key><false/></dict>
  <key>StandardOutPath</key><string>$HOME/Library/Logs/verity-studio.log</string>
  <key>StandardErrorPath</key><string>$HOME/Library/Logs/verity-studio-error.log</string>
</dict></plist>
PLIST
launchctl bootout "gui/$(id -u)" "$agent" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$agent" || info 'Bridge startup needs manual retry: launchctl bootstrap gui/$(id -u) ~/Library/LaunchAgents/com.local.verity.studio-bridge.plist'
info 'Verity Studio Mode installed. Turn on Studio as MCP server in Roblox Studio Assistant settings.'
info 'Open Verity, choose Ollama deepseek-r1:8b, then click STUDIO OFF to enable Studio Mode.'
open "$final" || info 'Open Verity manually from ~/Applications.'
exit 0
__VERITY_STUDIO_PAYLOAD__
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