#!/usr/bin/env python3
"""Idempotent Verity Studio bridge hotfix: reject invalid Script.Author access."""
from __future__ import annotations

from pathlib import Path
import py_compile
import shutil
import sys

MARKER = 'Verity Studio Luau property validation v1.3.2'
PROMPT_OLD = 'and create normal Script/LocalScript instances using .Source as needed. '
PROMPT_NEW = (
    'and create normal Script/LocalScript instances using .Source as needed. '
    'Script and LocalScript instances DO NOT have an Author property: '
    'do not read or assign .Author on scripts. For optional metadata use '
    'Instance:SetAttribute for Author metadata and GetAttribute to read it. '
    'A Workspace part touch/death handler belongs in a server Script '
    '(RunContext Server), NOT a LocalScript inside Workspace. '
)

VALIDATOR = r'''# Verity Studio Luau property validation v1.3.2

def validate_generated_luau(code: str) -> None:
    """Reject a known AI-generated Roblox API error before sending it to Studio."""
    # This targets script-like variable names. Arbitrary Lua dictionaries
    # may legitimately have a custom Author field.
    invalid = re.search(
        r"\b(?:script|[A-Za-z_]\w*Script)\s*\.\s*Author\b",
        code,
        flags=re.I,
    )
    if not invalid:
        created_scripts = re.findall(
            r"\b([A-Za-z_]\w*)\s*=\s*Instance\.new\s*\(\s*['\"](?:LocalScript|Script)['\"]",
            code,
            flags=re.I,
        )
        for variable in created_scripts:
            if re.search(r"\b" + re.escape(variable) + r"\s*\.\s*Author\b", code, flags=re.I):
                invalid = True
                break
    if invalid:
        raise MCPError(
            "Luau preview rejected before applying: Script/LocalScript has "
            "no .Author property. Regenerate without .Author, or use "
            "SetAttribute('Author', 'Verity'). Nothing was changed in Studio."
        )

'''


def patch(text: str) -> str:
    if MARKER in text:
        print('[Verity Studio] Luau metadata validation is already installed.')
        return text
    needle = '\ndef generate_code(instruction: str, model: str) -> tuple[str, str]:\n'
    if text.count(needle) != 1:
        raise ValueError('Unknown bridge layout: cannot safely add validator')
    text = text.replace(needle, '\n' + VALIDATOR + needle, 1)
    if text.count(PROMPT_OLD) != 1:
        raise ValueError('Unexpected Studio system prompt; no changes made')
    text = text.replace(PROMPT_OLD, PROMPT_NEW, 1)
    needle2 = '    code = obj["code"].strip()\n'
    if text.count(needle2) != 1:
        raise ValueError('Unknown generator structure; no changes made')
    text = text.replace(needle2, needle2 + '    validate_generated_luau(code)\n', 1)
    needle3 = '    def execute_code(self, studio_id: str, code: str) -> dict:\n'
    if text.count(needle3) != 1:
        raise ValueError('Unknown MCP client structure; no changes made')
    text = text.replace(needle3, needle3 + '        validate_generated_luau(code)\n', 1)
    return text


def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 verity-studio-luau-guard-v132.py /path/to/studio_agent.py')
    path = Path(sys.argv[1])
    if not path.is_file():
        raise SystemExit('Studio bridge missing; install Studio Mode first')
    original = path.read_text(encoding='utf-8')
    updated = patch(original)
    if updated == original:
        return
    compile(updated, str(path), 'exec')
    backup = path.with_suffix('.v131-before-luau-guard.bak')
    if not backup.exists():
        shutil.copy2(path, backup)
    tmp = path.with_suffix('.v132.tmp')
    tmp.write_text(updated, encoding='utf-8')
    try:
        py_compile.compile(str(tmp), doraise=True)
        tmp.replace(path)
    finally:
        if tmp.exists():
            tmp.unlink()
    print('[Verity Studio] Installed script-property validation and safer Luau prompt.')

if __name__ == '__main__':
    main()
