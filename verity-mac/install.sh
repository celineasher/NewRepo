#!/usr/bin/env bash
# Verity v1.2.3 stable GitHub installer. Rebuilds patched source once.
set -euo pipefail

ROOT='https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac'
info() { printf '\n[Verity] %s\n' "$*"; }
fail() { printf '\n[Verity] ERROR: %s\n' "$*" >&2; exit 1; }

launch=1
case "${1:-}" in
  '') ;;
  --no-launch) launch=0 ;;
  --show-source) printf '%s\n' "${ROOT}/install-verity.sh"; exit 0 ;;
  -h|--help) printf 'Usage: bash install.sh [--no-launch]\n'; exit 0 ;;
  *) fail "Unknown argument: $1" ;;
esac

[[ "$(uname -s)" == Darwin ]] || fail 'Verity requires macOS.'
mac_major="$(sw_vers -productVersion | cut -d. -f1)"
[[ "$mac_major" =~ ^[0-9]+$ ]] && (( mac_major >= 13 )) || fail 'Requires macOS 13 or newer.'
if ! command -v xcrun >/dev/null || ! xcrun --find swift >/dev/null 2>&1; then
  fail 'Xcode Command Line Tools missing. Run xcode-select --install, then reinstall.'
fi
for utility in curl awk tail base64 shasum unzip patch rsync ditto open; do
  command -v "$utility" >/dev/null 2>&1 || fail "Missing utility: $utility"
done

workspace="$(mktemp -d "${TMPDIR:-/tmp}/verity-github.XXXXXXXX")" || fail 'Failed to create temporary directory.'
cleanup() { rm -rf "$workspace"; }
trap cleanup EXIT

info 'Downloading Verity source and voice trigger patch from GitHub…'
curl --proto '=https' --tlsv1.2 -fsSL --retry 2 "${ROOT}/install-verity.sh" -o "$workspace/bundle-installer.sh"
curl --proto '=https' --tlsv1.2 -fsSL --retry 2 "${ROOT}/wake-greeting-v1.2.3.patch" -o "$workspace/fix.patch"

line="$(awk '/^__VERITY_PAYLOAD_BEGIN__$/ { print NR + 1; exit }' "$workspace/bundle-installer.sh")"
expected="$(awk -F "'" '/^expected=/ { print $2; exit }' "$workspace/bundle-installer.sh")"
[[ -n "$line" && "$expected" =~ ^[0-9a-f]{64}$ ]] || fail 'Invalid bundled source metadata.'
tail -n "+$line" "$workspace/bundle-installer.sh" | base64 -D > "$workspace/source.zip" || fail 'Could not decode source archive.'
actual="$(shasum -a 256 "$workspace/source.zip" | awk '{print $1}')"
[[ "$actual" == "$expected" ]] || fail 'Bundled source SHA-256 verification failed.'

mkdir -p "$workspace/unpacked"
unzip -q "$workspace/source.zip" -d "$workspace/unpacked" || fail 'Cannot extract source.'
bundle="$workspace/unpacked/VerityMac"
[[ -f "$bundle/Package.swift" && -f "$bundle/build.command" ]] || fail 'Invalid source directory.'
(cd "$bundle" && patch -p1 < "$workspace/fix.patch") || fail 'Voice patch cannot be applied; refusing to build unpatched source.'
grep -q 'Say hello to me briefly and ask how you can help.' "$bundle/Sources/Verity/VoiceController.swift" || fail 'Voice fix validation failed.'

source_dir="$HOME/Library/Application Support/Verity/Source"
mkdir -p "$source_dir"
rsync -a "$bundle/" "$source_dir/"
info 'Building Verity v1.2.3…'
(cd "$source_dir" && VERITY_SKIP_LAUNCH=1 bash ./build.command) || fail 'Swift build failed; previous app has not been replaced.'
built="$source_dir/dist/Verity.app"
[[ -x "$built/Contents/MacOS/Verity" ]] || fail 'Build did not produce an executable.'

if command -v pgrep >/dev/null 2>&1 && pgrep -x Verity >/dev/null 2>&1; then
  fail 'Quit Verity from its menu bar icon, then run this command again. The rebuilt app is saved in Source/dist.'
fi
apps="$HOME/Applications"
mkdir -p "$apps"
destination="$apps/Verity.app"
staged="$apps/.Verity.new.$$.app"
backup="$apps/.Verity.previous.$$.app"
rm -rf "$staged"
ditto "$built" "$staged" || fail 'Cannot stage app for installation.'
if [[ -e "$destination" ]]; then
  [[ -d "$destination" ]] || fail 'Installation path is not an app bundle.'
  mv "$destination" "$backup"
fi
if ! mv "$staged" "$destination"; then
  [[ ! -d "$backup" ]] || mv "$backup" "$destination"
  fail 'Cannot install app. Previous version was restored.'
fi
[[ ! -d "$backup" ]] || rm -rf "$backup"

mkdir -p "$HOME/bin"
cat > "$HOME/bin/verity-update" <<'UPDATER'
#!/usr/bin/env bash
set -euo pipefail
url='https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac/install.sh'
tmp="$(mktemp "${TMPDIR:-/tmp}/verity-update.XXXXXXXX")"
trap 'rm -f "$tmp"' EXIT
curl --proto '=https' --tlsv1.2 -fsSL "$url" -o "$tmp"
bash "$tmp" "$@"
UPDATER
chmod +x "$HOME/bin/verity-update"
info "Verity v1.2.3 installed to $destination"
info 'Run the same GitHub installation command for future updates, or bash ~/bin/verity-update.'
if (( launch == 1 )); then open "$destination" || info 'App installed; open it from ~/Applications.'; fi
