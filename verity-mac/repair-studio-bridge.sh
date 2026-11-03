#!/usr/bin/env bash
# Verity Studio MCP bridge 1.3.1: repair the existing installation in-place.
# No Swift rebuild or sudo required. Does not change your Verity AI settings.
set -euo pipefail
notice() { printf '\n[Verity Studio] %s\n' "$*"; }
fail() { printf '\n[Verity Studio] ERROR: %s\n' "$*" >&2; exit 1; }
[[ "$(uname -s)" == "Darwin" ]] || fail 'This repair runs on macOS.'
for cmd in curl shasum python3 launchctl; do command -v "$cmd" >/dev/null || fail "Missing command: $cmd"; done

bridge="$HOME/Library/Application Support/Verity/StudioBridge/studio_agent.py"
agent="$HOME/Library/LaunchAgents/com.local.verity.studio-bridge.plist"
[[ -f "$bridge" ]] || fail 'Studio Mode bridge not installed. Run the Verity Studio Mode installer first.'
[[ -f "$agent" ]] || fail 'Studio Mode LaunchAgent missing. Run the Studio Mode installer first.'

tempdir="$(getconf DARWIN_USER_TEMP_DIR 2>/dev/null || echo /tmp)"
temp="$(mktemp "$tempdir/verity-studio-fix.XXXXXXXX")"
trap 'rm -f "$temp"' EXIT
url='https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/fix-studio-bridge-1.3.1.py'
curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error --retry 2 "$url" -o "$temp" \
  || fail 'Could not download the patch from GitHub.'
expected='777cf011be9025a9af81e00b3092866b0e06d2df98586b950633a8348b3d47ae'
[[ ${#expected} -eq 64 ]] || fail 'Invalid pinned patch checksum.'
actual="$(shasum -a 256 "$temp" | awk '{print $1}')"
[[ "$actual" == "$expected" ]] || fail 'Patch hash mismatch; refusing to execute it.'
notice 'Applying bounded Studio MCP timeouts and local diagnostics.'
python3 "$temp" "$bridge" || fail 'Bridge patch failed; previous app was not modified.'
python3 -m py_compile "$bridge" || fail 'Patched bridge failed Python syntax verification.'

domain="gui/$(id -u)"
notice 'Restarting the local bridge (Verity app remains installed).'
launchctl bootout "$domain" "$agent" >/dev/null 2>&1 || true
if ! launchctl bootstrap "$domain" "$agent"; then
  fail 'LaunchAgent restart failed. See ~/Library/Logs/verity-studio-error.log.'
fi

notice 'Checking local bridge health and Studio MCP connectivity.'
python3 - <<'PY'
from pathlib import Path
import json, time, urllib.request, urllib.error
secret = (Path.home() / "Library/Application Support/Verity/studio-bridge.token")
if not secret.is_file():
    print("[Verity Studio] Token missing; inspect ~/Library/Logs/verity-studio-error.log")
    raise SystemExit(0)
headers={"X-Verity-Token":secret.read_text().strip()}
base="http://127.0.0.1:8767"
for i in range(20):
    try:
        req=urllib.request.Request(base+"/health",headers=headers)
        with urllib.request.urlopen(req,timeout=1.5) as res:
            body=json.load(res)
        print("[Verity Studio] Local bridge: OK")
        break
    except Exception:
        time.sleep(.2)
else:
    print("[Verity Studio] Local bridge is not responding. Check ~/Library/Logs/verity-studio-error.log")
    raise SystemExit(0)

try:
    req=urllib.request.Request(base+"/status",headers=headers)
    with urllib.request.urlopen(req,timeout=16) as res:
        status=json.load(res)
    if status.get("connected"):
        studios=status.get("studios",[])
        print(f"[Verity Studio] Roblox Studio MCP: CONNECTED to {len(studios)} place(s)")
        for studio in studios:
            print("[Verity Studio] Place:",studio.get("name","Unknown"))
    else:
        print("[Verity Studio] Bridge OK, but Roblox Studio has no connected places.")
        print("[Verity Studio] Open a place → Assistant → ... → Manage MCP Servers → toggle Studio MCP OFF and ON.")
except urllib.error.HTTPError as e:
    try: message=json.load(e).get("message",str(e))
    except Exception: message=str(e)
    print("[Verity Studio] Studio MCP error:",message)
except Exception as e:
    print("[Verity Studio] Studio MCP request failed:",e)
PY

notice 'Repair installed. Reopen Verity or switch Studio Mode OFF then ON to retry.'
notice 'If Studio still shows no clients, toggle its MCP server OFF then ON and check the green client indicator.'
