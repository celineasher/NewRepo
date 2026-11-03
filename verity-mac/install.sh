#!/usr/bin/env bash
# Permanent Verity macOS entry point: fetches the newest published installer on each run.
set -euo pipefail

ROOT='https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac'
if [[ "${1:-}" == "--show-source" ]]; then
  printf "%s\n" "${ROOT}/install-verity.sh"
  exit 0
fi
[[ "$(uname -s)" == Darwin ]] || { printf "[Verity] ERROR: macOS required.\n" >&2; exit 1; }
command -v curl >/dev/null 2>&1 || { printf "[Verity] ERROR: curl is required.\n" >&2; exit 1; }
workspace="$(mktemp -d "${TMPDIR:-/tmp}/verity-updater.XXXXXXXX")"
trap 'rm -rf "$workspace"' EXIT
installer="$workspace/install-verity.sh"
printf "[Verity] Downloading latest Verity installer from GitHub...\n"
curl --proto "=https" --tlsv1.2 --fail --location --silent --show-error --retry 2 --connect-timeout 15 "${ROOT}/install-verity.sh" -o "$installer"
[[ -s "$installer" ]] || { printf "[Verity] ERROR: downloaded installer is empty.\n" >&2; exit 1; }
[[ "$(head -n 1 "$installer")" == "#!/usr/bin/env bash" ]] || { printf "[Verity] ERROR: downloaded file is not a Bash script.\n" >&2; exit 1; }
bash "$installer" "$@"
