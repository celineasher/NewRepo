#!/usr/bin/env bash
# Verity v1.2.7: SSL 2+ mic channel routing and headphone output test.
set -euo pipefail
ROOT='https://raw.githubusercontent.com/celineasher/NewRepo/master/verity-mac'
BASE_SHA='eb5a4857d8a641088b9364521f4714c711a0cd25773c2738c5050391bc20cb9c'
PATCH_123_SHA='2666396ed7f3af74ae0fc10cddf509010e27a5f7d60877fae5f3171ea10fe58f'
PATCH_124_SHA='5da188808809010a3e3e081add0910b98136aefe429563c99d4477d1177aba7e'
PATCH_125_SHA='cc1e7c15740fa5ed3c6a9b8c35e3640fb19e1af64c2a514c4da369b48e430ed7'
PATCH_126_SHA='077846d342583b3144c4fee99f8e94bf912fd168f9572e68c575287653709cf4'
PATCH_127_SHA='6fdaea7aaef0bbb9f6bc7e418be298e228fcd58efcf6eef0342eb9e7678a94f1'
info() { printf '\n[Verity] %s\n' "$*"; }
fail() { printf '\n[Verity] ERROR: %s\n' "$*" >&2; exit 1; }
launch=1
case "${1:-}" in
  '') ;;
  --no-launch) launch=0 ;;
  --show-source) printf '%s\n' "$ROOT/install-verity.sh"; exit 0 ;;
  -h|--help) printf 'Usage: bash install.sh [--no-launch]\n'; exit 0 ;;
  *) fail "Unknown option: $1" ;;
esac
[[ "$(uname -s)" == 'Darwin' ]] || fail 'This installer requires macOS.'
major="$(sw_vers -productVersion | cut -d. -f1)"
[[ "$major" =~ ^[0-9]+$ ]] && (( major >= 13 )) || fail 'Requires macOS 13 or newer.'
command -v xcrun >/dev/null 2>&1 && xcrun --find swift >/dev/null 2>&1 || fail 'Install Apple Command Line Tools first: xcode-select --install'
for cmd in curl awk tail base64 gzip shasum unzip patch rsync ditto open; do
  command -v "$cmd" >/dev/null 2>&1 || fail "Missing command: $cmd"
done
if command -v pgrep >/dev/null 2>&1 && pgrep -x Verity >/dev/null 2>&1; then
  fail 'Quit Verity from the menu bar before updating.'
fi
work="$(mktemp -d "${TMPDIR:-/tmp}/verity-gh-127.XXXXXXXX")" || fail 'Could not make a temporary build directory.'
trap 'rm -rf "$work"' EXIT
info 'Downloading verified Verity source and version-matched UI and voice updates…'
curl --proto '=https' --tlsv1.2 -fsSL --retry 3 "$ROOT/install-verity.sh" -o "$work/base.sh" || fail 'Failed to download base source.'
line="$(awk '/^__VERITY_PAYLOAD_BEGIN__$/ {print NR + 1; exit}' "$work/base.sh")"
[[ -n "$line" ]] || fail 'Invalid source archive marker.'
tail -n "+$line" "$work/base.sh" | base64 -D > "$work/source.zip" || fail 'Base source could not be decoded.'
source_sha="$(shasum -a 256 "$work/source.zip" | awk '{print $1}')"
[[ "$source_sha" == "$BASE_SHA" ]] || fail 'Base source changed; refusing an incompatible update.'
unzip -q "$work/source.zip" -d "$work" || fail 'Cannot extract source archive.'
bundle="$work/VerityMac"
[[ -f "$bundle/Package.swift" ]] || fail 'Source archive missing Package.swift.'
for release in 123 124 125 126 127; do
  if [[ "$release" == 123 ]]; then
    asset='base-to-v1.2.3.patch.gz.b64'
    expected="$PATCH_123_SHA"
  elif [[ "$release" == 124 ]]; then
    asset='monitor-v1.2.4.patch.gz.b64'
    expected="$PATCH_124_SHA"
  elif [[ "$release" == 125 ]]; then
    asset='ui-stability-v1.2.5.patch.gz.b64'
    expected="$PATCH_125_SHA"
  elif [[ "$release" == 126 ]]; then
    asset='monitor-freeze-v1.2.6.patch.gz.b64'
    expected="$PATCH_126_SHA"
  else
    asset='mic-routing-v1.2.7.patch.gz.b64'
    expected="$PATCH_127_SHA"
  fi
  curl --proto '=https' --tlsv1.2 -fsSL --retry 3 "$ROOT/$asset" -o "$work/$asset" || fail "Could not download $asset"
  base64 -D < "$work/$asset" | gzip -dc > "$work/$release.patch" || fail "Could not decode $asset"
  actual="$(shasum -a 256 "$work/$release.patch" | awk '{print $1}')"
  [[ "$actual" == "$expected" ]] || fail "Source patch checksum mismatch ($asset)."
  (cd "$bundle" && patch --batch --fuzz=0 -p1 < "$work/$release.patch") || fail "Patch for version $release did not match verified source. Existing app was not modified."
done
grep -Fq 'static let current = "1.2.7"' "$bundle/Sources/Verity/Version.swift" || fail 'Unexpected application version.'
grep -Fq 'final class LiveMicMonitor' "$bundle/Sources/Verity/LiveMicMonitor.swift" || fail 'Nonblocking monitor implementation missing.' || fail 'Unexpected application version.'
grep -Fq 'private var monitorSection: some View' "$bundle/Sources/Verity/Views.swift" || fail 'Voice Studio monitor controls are missing.'
info 'Compiling Verity v1.2.7 (SSL microphone routing and monitor output test)…'
(cd "$bundle" && VERITY_SKIP_LAUNCH=1 bash ./build.command) || fail 'Swift compilation failed. The previous app is unchanged.'
built="$bundle/dist/Verity.app"
[[ -x "$built/Contents/MacOS/Verity" ]] || fail 'Build did not create a valid app.'
apps="$HOME/Applications"; mkdir -p "$apps"
destination="$apps/Verity.app"
staged="$apps/.Verity.new.$$.app"
backup="$apps/.Verity.backup.$$.app"
ditto "$built" "$staged" || fail 'Could not stage app.'
if [[ -e "$destination" ]]; then
  [[ -d "$destination" ]] || fail 'Verity.app path is not a directory.'
  mv "$destination" "$backup" || fail 'Could not back up existing app.'
fi
if ! mv "$staged" "$destination"; then
  [[ ! -d "$backup" ]] || mv "$backup" "$destination"
  fail 'Install failed; previous app restored.'
fi
[[ ! -d "$backup" ]] || rm -rf "$backup"
source_dir="$HOME/Library/Application Support/Verity/Source"
mkdir -p "$source_dir"
rsync -a --exclude='.build' --exclude='dist' "$bundle/" "$source_dir/" || info 'App installed but source copy failed.'
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
info "Verity v1.2.7 installed: $destination"
if (( launch == 1 )); then open "$destination" || info 'Open Verity in ~/Applications.'; fi
