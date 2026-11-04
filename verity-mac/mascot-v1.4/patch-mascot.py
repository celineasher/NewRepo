#!/usr/bin/env python3
"""Upgrade only the animated pet stage in an existing Verity Swift source tree.
The chat window, Ollama/GLM preferences, voice system and Roblox Studio MCP
remain untouched. Designed for v1.2.x and v1.3.0 Studio Mode source.
"""
from pathlib import Path
import sys

if len(sys.argv)!=2:raise SystemExit('Usage: patch-mascot.py /path/to/VerityMac')
root=Path(sys.argv[1]);views=root/'Sources/Verity/Views.swift'
if not views.is_file():raise SystemExit('Verity Views.swift not found')
text=views.read_text(encoding='utf-8')
start=text.find('struct PetView: View {')
stop=text.find('\nstruct ChatView:',start)
if start<0 or stop<0:raise SystemExit('Unrecognized Verity PetView, no changes made')
section=text[start:stop]
target='VerityMascotStage(store: store, time: time)'
if target in section:
    print('[Verity Mascot] Already integrated; refreshing sprite art.')
    raise SystemExit(0)
old_start='                ZStack(alignment: .bottom) {\n'
old_end='                .frame(height: 167)\n'
if section.count(old_start)!=1 or section.count(old_end)!=1:
    raise SystemExit('Unknown PetView structure; refusing to replace controls.')
i=section.index(old_start);j=section.index(old_end,i)
previous=section[i:j]
if 'SpriteLibrary.image(spriteName(at: time))' not in previous:
    raise SystemExit('Unexpected pet artwork implementation; app not altered.')
if '.gesture(DragGesture(' not in section[j:]:
    raise SystemExit('Pet drag behavior missing; app not altered.')
section=section[:i]+'                '+target+'\n'+section[j:]
section=section.replace(
    'TimelineView(.animation(minimumInterval: 1.0 / 24.0, paused: !store.animationsEnabled))',
    'TimelineView(.animation(minimumInterval: 1.0 / 30.0, paused: !store.animationsEnabled))',1)
output=text[:start]+section+text[stop:]
if output.count(target)!=1 or output.count('.gesture(DragGesture(')!=text.count('.gesture(DragGesture('):
    raise SystemExit('Validation failed; refusing to alter Verity.')
views.write_text(output,encoding='utf-8')
print('[Verity Mascot] Pixel Motion v1.4 applied; existing controls and Studio Mode retained.')
