#!/usr/bin/env bash
# Verity Pixel Motion v1.4 — native macOS mascot visuals upgrade.
# Rebuilds existing Verity from user-installed source, preserving
# Ollama/DeepSeek, speech, Studio Mode and previous preferences.
set -euo pipefail

info(){ printf '\n[Verity Mascot] %s\n' "$*"; }
fail(){ printf '\n[Verity Mascot] ERROR: %s\n' "$*" >&2; exit 1; }

[[ "$(uname -s)" == "Darwin" ]] || fail "This installer requires macOS."
command -v xcrun >/dev/null 2>&1 && xcrun --find swift >/dev/null 2>&1 || fail "Install Xcode Command Line Tools first."
for tool in curl python3 shasum awk rsync ditto open; do
  command -v "$tool" >/dev/null 2>&1 || fail "Missing $tool"
done

launch=1
if [[ "$#" -gt 0 ]]; then
  case "$1" in
    --no-launch) launch=0 ;;
    -h|--help) printf 'Usage: bash install.sh [--no-launch]\n'; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
fi

if pgrep -x Verity >/dev/null 2>&1; then
  fail "Quit Verity using its menu bar icon, then retry. Your installed app is untouched."
fi
source_dir="$HOME/Library/Application Support/Verity/Source"
[[ -f "$source_dir/Package.swift" && -f "$source_dir/Sources/Verity/Views.swift" ]] \
  || fail "Verity editable source missing. Install the main Verity app before this mascot upgrade."

work="$(mktemp -d -t verity-mascot)" || fail "Cannot create build folder."
trap 'rm -rf "$work"' EXIT
mkdir -p "$work/build"
rsync -a --exclude='.build' --exclude='dist' "$source_dir/" "$work/build/" \
  || fail "Could not prepare a source copy."

# Exact repository commit with version-pinned sources.
root='https://raw.githubusercontent.com/celineasher/NewRepo/2c61f6a2937e586bf52eee0d0958de3833200e7f/verity-mac/mascot-v1.4'
fetch(){
  local filename="$1" sha="$2" out="$work/$1" actual
  curl --proto '=https' --tlsv1.2 -fsSL --retry 3 "$root/$filename" -o "$out" \
    || fail "Download failed: $filename"
  actual="$(shasum -a 256 "$out" | awk '{print $1}')"
  if [[ "$sha" != "$actual" ]]; then
    info "Expected checksum: $sha"
    info "Received checksum: $actual"
    fail "File integrity check failed: $filename"
  fi
}
info "Downloading verified yellow-smiley artwork and motion code…"
fetch 'VerityMascotStage.swift' '7b92d5ed46a9ffd218434f4638f741e850f408429a559137b5d2851db76ed3b4'
fetch 'generate-sprites.py' '2cf75b4b54d728dbc15819eb6b87512a82586cf91f3c07aebac9d99bbeb4de5a'
fetch 'patch-mascot.py' '21e3c0b70e3b40331446f60c487a81d75c19a7382960ab197e8d3edff11061e1'

python3 -m py_compile "$work/generate-sprites.py" "$work/patch-mascot.py" \
  || fail "Sprite generator or source patch failed syntax verification."
python3 "$work/generate-sprites.py" "$work/build" || fail "Could not generate pixel-art sprites."
mkdir -p "$work/build/Sources/Verity"
cp "$work/VerityMascotStage.swift" "$work/build/Sources/Verity/VerityMascotStage.swift"
python3 "$work/patch-mascot.py" "$work/build" || fail "Existing PetView is not compatible; nothing was installed."
[[ -f "$work/build/Sprites/grin.png" && -f "$work/build/Sprites/blink.png" && -f "$work/build/Sprites/talk5.png" ]] \
  || fail "Expected sprite frames were not generated."
grep -Fq 'VerityMascotStage(store: store, time: time)' "$work/build/Sources/Verity/Views.swift" \
  || fail "Mascot view was not installed into PetView."

info "Compiling upgraded Verity while preserving the installed version's AI and Studio code…"
(cd "$work/build" && VERITY_SKIP_LAUNCH=1 bash ./build.command) \
  || fail "Swift compilation failed. Your old Verity app is unchanged."
built="$work/build/dist/Verity.app"
[[ -x "$built/Contents/MacOS/Verity" && -f "$built/Contents/Resources/Sprites/grin.png" ]] \
  || fail "Built app did not contain the expected mascot assets."

apps="$HOME/Applications"
mkdir -p "$apps"
destination="$apps/Verity.app"
staged="$apps/.Verity.mascot.new.$$.app"
backup="$apps/.Verity.mascot.backup.$$.app"
ditto "$built" "$staged" || fail "Could not stage new app."
if [[ -e "$destination" ]]; then
  [[ -d "$destination" ]] || fail "Existing Verity path is not an app directory."
  mv "$destination" "$backup" || fail "Could not preserve previous Verity app."
fi
if ! mv "$staged" "$destination"; then
  [[ ! -d "$backup" ]] || mv "$backup" "$destination"
  fail "Installation failed and previous app was restored."
fi
[[ ! -d "$backup" ]] || rm -rf "$backup"

# Commit source only after the new app builds and installs successfully.
rsync -a --exclude='.build' --exclude='dist' "$work/build/" "$source_dir/" \
  || info "App installed, but editable source sync failed."
info "Verity Pixel Motion v1.4 installed in $destination"
info "DeepSeek/Ollama preferences, Studio MCP bridge, microphone settings, and chat remain unchanged."
if (( launch == 1 )); then
  open "$destination" || info "Open ~/Applications/Verity.app manually."
fi
