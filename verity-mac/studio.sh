#!/usr/bin/env bash
# Verity Studio Mode — stable terminal download-and-install launcher.
# Download the complete self-contained installer into a temporary file,
# because that installer reads its own embedded archive from disk.
set -euo pipefail

[[ "$(uname -s)" == "Darwin" ]] || { echo "[Verity Studio] macOS required." >&2; exit 1; }
for cmd in curl mktemp bash; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "[Verity Studio] Missing $cmd" >&2; exit 1; }
done

installer="$(mktemp "${TMPDIR:-/tmp}/verity-studio-install.XXXXXXXX")"
trap 'rm -f "$installer"' EXIT
url='https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install-studio-mode.sh'

printf '[Verity Studio] Downloading Studio Mode installer from GitHub...\n'
curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error --retry 2 "$url" -o "$installer"
[[ -s "$installer" ]] || { echo '[Verity Studio] Empty installer download.' >&2; exit 1; }
[[ "$(head -n 1 "$installer")" == '#!/usr/bin/env bash' ]] || { echo '[Verity Studio] Invalid installer.' >&2; exit 1; }
grep -q '^__VERITY_STUDIO_PAYLOAD__$' "$installer" || { echo '[Verity Studio] Missing bundled Studio Mode payload.' >&2; exit 1; }
bash -n "$installer"
# Once the v1.3.0 app is installed, upgrade its Python MCP transport in-place.
# This is only a bridge repair; it does not recompile or replace the Mac app.
bash "$installer" "$@"
repair_url='https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/repair-studio-bridge.sh'
repair="$(mktemp "${TMPDIR:-/tmp}/verity-bridge-fix.XXXXXXXX")"
trap 'rm -f "$installer" "$repair"' EXIT
printf '[Verity Studio] Installing MCP timeout/diagnostic fix…\n'
curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error --retry 2 "$repair_url" -o "$repair"
bash -n "$repair"
bash "$repair"
