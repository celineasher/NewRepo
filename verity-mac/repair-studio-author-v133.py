#!/usr/bin/env python3
"""Versioned, idempotent fix for Studio .Author property and malformed script generation.

Applies to the bridge itself. Validates both generated plans and approved code;
retries invalid generation once. Refuses unknown versions rather than overwriting.
"""
from pathlib import Path
import py_compile
import re
import shutil
import sys

MARKER = '# Verity Studio property guard v1.3.3'

GUARD = '''# Verity Studio property guard v1.3.3
# A defensive check, not a complete Luau typechecker. A generic Author field
# on a plain table is valid Luau but is deliberately rejected for Studio edits.
def validate_generated_luau(code: str) -> None:
    forbidden = re.search(r"\\.\\s*Author\\b|\\[\\s*['\\\"]Author['\\\"]\\s*\\]", code, flags=re.I)
    if forbidden:
        raise MCPError(
            "Invalid Luau property: .Author (or [\\\"Author\\\"]) is not a Script/LocalScript property. "
            "Do not assign or read Author as a property; use "
            "script:SetAttribute('Author', 'Verity') or script:GetAttribute('Author'). "
            "No Studio changes were applied."
        )

'''

WRAPPER = '''# v1.3.3: one repair attempt; never auto-apply without user review.
def generate_code(instruction: str, model: str) -> tuple[str, str]:
    correction = (
        "\\nREQUIRED VALIDATION: The previous draft attempted an invalid .Author "
        "property read/write. Lua Instances of Script/LocalScript lack Author. "
        "Use SetAttribute('Author', 'Verity') only if author metadata is needed. "
        "Do NOT include any .Author or [\\\"Author\\\"] access at all. "
        "If creating a death/touch brick use a server Script in Workspace; "
        "never a LocalScript under a Workspace part. Return revised JSON."
    )
    for attempt in range(2):
        try:
            summary, code = _generate_code_once(
                instruction if attempt == 0 else instruction + correction, model
            )
            validate_generated_luau(code)
            return summary, code
        except MCPError as error:
            if "Author" not in str(error) or attempt:
                raise
    raise MCPError("Unable to generate valid Luau without invalid Author property.")

'''


def patch(text: str) -> str:
    if MARKER in text:
        return text
    generator = '\ndef generate_code(instruction: str, model: str) -> tuple[str, str]:\n'
    if text.count(generator) != 1:
        raise RuntimeError('Unexpected Studio generator. Nothing was changed.')

    start = text.find('\ndef validate_generated_luau(code: str) -> None:')
    end = text.find(generator)
    if start != -1:
        if end <= start:
            raise RuntimeError('Unexpected existing validator layout')
        # Replace narrow validator from 1.3.2, retaining all other bridge code.
        text = text[:start] + '\n' + GUARD + text[end:]
    else:
        # Older Studio Mode installations might not have the v1.3.2 guard.
        text = text.replace(generator, '\n' + GUARD + generator, 1)

    text = text.replace(generator,
                        '\ndef _generate_code_once(instruction: str, model: str) -> tuple[str, str]:\n', 1)
    needle = '\n\nclass State:\n'
    if text.count(needle) != 1:
        raise RuntimeError('Unexpected bridge State structure')
    text = text.replace(needle, '\n\n' + WRAPPER + needle, 1)
    apply_sig = '    def execute_code(self, studio_id: str, code: str) -> dict:\n'
    if text.count(apply_sig) != 1:
        raise RuntimeError('Cannot locate apply-time safety check')
    if apply_sig + '        validate_generated_luau(code)\n' not in text:
        text = text.replace(apply_sig,
                            apply_sig + '        validate_generated_luau(code)\n', 1)
    # Encourage correct Roblox instance properties even for a 1.3.0 bridge.
    original_prompt = 'and create normal Script/LocalScript instances using .Source as needed. '
    if original_prompt in text and 'DO NOT have an Author property' not in text:
        text = text.replace(original_prompt, original_prompt +
            'Never read or assign Script.Author or LocalScript.Author. '
            'Use SetAttribute for optional Author metadata. '
            'For Workspace touch events create a server Script, not LocalScript. ', 1)
    compile(text, '<StudioBridge-1.3.3>', 'exec')
    return text


def main():
    if len(sys.argv) != 2:
        raise SystemExit('Usage: python3 repair_v133.py /path/to/studio_agent.py')
    destination = Path(sys.argv[1])
    before = destination.read_text(encoding='utf-8')
    after = patch(before)
    if before == after:
        print('[Verity Studio] Property guard v1.3.3 already installed.')
        return
    backup = destination.with_suffix('.v132-before-v133.bak')
    if not backup.exists():
        shutil.copy2(destination, backup)
    temp = destination.with_suffix('.v133.tmp')
    temp.write_text(after, encoding='utf-8')
    try:
        py_compile.compile(str(temp), doraise=True)
        temp.replace(destination)
    finally:
        temp.unlink(missing_ok=True)
    print('[Verity Studio] v1.3.3 installed: stronger invalid-property rejection and retry-once generation.')

if __name__ == '__main__':
    main()
