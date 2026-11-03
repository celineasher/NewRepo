#!/usr/bin/env bash
# Verity Mac — stable GitHub installer and updater.
# Fetches the latest installer from this repository on every run.
set -euo pipefail

REPO_URL="https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac"
if [[ "${1:-}" == "--show-source" ]]; then
  printf '%s\n' "${REPO_URL}/install-verity.sh"
  exit 0
fi

if [[ "$(uname -s)" != "Darwin" ]]; then
  printf 'Verity currently supports macOS only.\n' >&2
  exit 1
fi
if ! command -v curl >/dev/null 2>&1; then
  printf 'curl is required.\n' >&2
  exit 1
fi

WORKDIR="$(mktemp -d "${TMPDIR:-/tmp}/verity-gh.XXXXXXXX")"
trap 'rm -rf "$WORKDIR"' EXIT
INSTALLER="$WORKDIR/install-verity.sh"
printf '[Verity] Downloading the latest installer from GitHub…\n'
curl --proto '=https' --tlsv1.2 --fail --location --silent --show-error \
  --retry 2 --connect-timeout 15 \
  "${REPO_URL}/install-verity.sh" -o "$INSTALLER"
[[ -s "$INSTALLER" ]] || { printf 'Installer download was empty.\n' >&2; exit 1; }
[[ "$(head -n 1 "$INSTALLER")" == '#!/usr/bin/env bash' ]] || {
  printf 'Installer did not contain the expected Bash header.\n' >&2; exit 1;
}
printf '[Verity] Launching installer.\n'
bash "$INSTALLER" "$@"
