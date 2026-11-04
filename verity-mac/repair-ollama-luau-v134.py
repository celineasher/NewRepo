#!/usr/bin/env python3
"""Verity Studio MCP 1.3.4: resilient local Ollama Luau generation.

Install onto an existing 1.3.x studio_agent.py. Preserves preview/approval,
MCP connectivity, and existing code-safety guards. Uses no third-party packages.
"""
from __future__ import annotations

import ast
from pathlib import Path
import py_compile
import shutil
import sys

MARKER = "# Verity Studio Ollama generation v1.3.4"

GENERATOR = r'''def __GENERATOR_NAME__(instruction: str, model: str) -> tuple[str, str]:
    """Generate a reviewed Studio edit without spending DeepSeek tokens on reasoning."""
    # Verity Studio Ollama generation v1.3.4
    import json
    import re
    import time
    import urllib.error
    import urllib.request

    system = (
        "You are a Roblox Studio Luau engineer. Output exactly one JSON object "
        'with two fields: {"summary":"short description","code":"complete Luau script"}. '
        "The code MUST be nonempty runnable Roblox Studio Command Bar Luau in Edit mode. "
        "Use Instance.new, properties and .Source to make objects/scripts. "
        "A Workspace kill brick uses a Script (server), never a LocalScript. "
        "Script/LocalScript have NO Author property. Use SetAttribute for metadata. "
        "Avoid deleting user content; make edits idempotent and scoped to the request. "
        "Never include HTTP, HttpService, loadstring, require(assetId), InsertService, "
        "MarketplaceService, TeleportService, DataStoreService or unbounded loops. "
        "No markdown fences, no explanatory preface, no reasoning, only the JSON object."
    )
    def parse(raw):
        if not isinstance(raw, str) or not raw.strip():
            return None
        content = raw.strip()
        content = re.sub(r"<think>.*?</think>", "", content, flags=re.S | re.I).strip()
        content = re.sub(r"\A"+chr(96)*3+r"(?:json|luau|lua)?\s*", "", content, flags=re.I).strip()
        content = re.sub(chr(96)*3+r"\s*\Z", "", content).strip()
        decoder = json.JSONDecoder()
        try:
            obj = json.loads(content)
        except json.JSONDecodeError:
            obj = None
            # Tolerate a preface or a fenced object; never execute arbitrary prose.
            for index, char in enumerate(content):
                if char != "{":
                    continue
                try:
                    candidate, _ = decoder.raw_decode(content[index:])
                except json.JSONDecodeError:
                    continue
                if isinstance(candidate, dict) and isinstance(candidate.get("code"), str):
                    obj = candidate
                    break
        if not isinstance(obj, dict):
            return None
        code = obj.get("code")
        if not isinstance(code, str) or len(code.strip()) < 15:
            return None
        code = code.strip()
        code = re.sub(r"\A"+chr(96)*3+r"(?:luau|lua)?\s*", "", code, flags=re.I)
        code = re.sub(chr(96)*3+r"\s*\Z", "", code).strip()
        summary = str(obj.get("summary") or "Proposed Roblox Studio edit")[:600]
        return summary, code

    start = time.monotonic()
    deadline = start + 192  # Within Verity's 205-second Studio request timeout.
    diagnostics = []
    for attempt in range(2):
        remaining = deadline - time.monotonic()
        if remaining < 15:
            break
        user_prompt = "Roblox Studio request: " + instruction
        if attempt:
            user_prompt += (
                "\nYOUR LAST RESPONSE HAD NO VALID FINAL LUAU CODE. "
                "Do not think aloud. Reply ONLY with a JSON object containing "
                "nonempty code and summary. Keep the edit small and complete."
            )
        request_data = json.dumps({
            "model": model,
            "stream": False,
            "think": False,
            "format": "json",
            "options": {
                "temperature": 0.1 if attempt == 0 else 0.0,
                "num_predict": 3200 if attempt == 0 else 3800,
            },
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": user_prompt},
            ],
        }).encode("utf-8")
        request = urllib.request.Request(
            "http://127.0.0.1:11434/api/chat",
            request_data,
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(request, timeout=min(155, remaining - 5)) as response:
                payload = json.load(response)
        except (urllib.error.HTTPError, urllib.error.URLError, TimeoutError, ValueError) as exc:
            raise MCPError("Ollama generation request failed: " + str(exc)[:300]) from exc
        if not isinstance(payload, dict):
            raise MCPError("Ollama returned an unexpected API response.")
        msg = payload.get("message") or {}
        if not isinstance(msg, dict):
            msg = {}
        content = msg.get("content") or ""
        result = parse(content)
        if result is not None:
            summary, code = result
            if len(code) > 16000:
                raise MCPError("Generated Luau exceeded 16,000 characters. Request a smaller edit.")
            restricted = [
                r"\bloadstring\s*\(", r"\bHttpService\b", r"\bgame\s*:\s*HttpGet\b",
                r"\brequire\s*\(\s*\d+", r"\bInsertService\b", r"\bMarketplaceService\b",
                r"\bTeleportService\b", r"\bDataStoreService\b", r"\bgame\s*:\s*BindToClose\b",
            ]
            if any(re.search(p, code, flags=re.I) for p in restricted):
                raise MCPError("Generated code used a restricted Roblox API. Nothing was applied.")
            if "validate_generated_luau" in globals():
                validate_generated_luau(code)
            return summary, code
        # Expose only diagnostics; do not log private model reasoning.
        reason = str(payload.get("done_reason") or "unknown")
        if not str(content).strip() and msg.get("thinking"):
            reason += " (thinking-only response)"
        diagnostics.append(reason[:100])
    raise MCPError(
        "DeepSeek did not produce a final Luau JSON response. "
        "Verity requested think=false and retried once. "
        "Reasons: " + ", ".join(diagnostics) +
        ". Try a smaller Studio request or switch Ollama to a coding model such as qwen2.5-coder:7b."
    )

'''

def patch_text(text: str) -> str:
    if MARKER in text:
        return text
    tree = ast.parse(text)
    # The 1.3.3 bridge has a wrapper which retries Author fixes.
    candidates = [
        node for node in tree.body if isinstance(node, ast.FunctionDef)
        and node.name in ("_generate_code_once", "generate_code")
    ]
    chosen = next((node for node in candidates if node.name == "_generate_code_once"), None)
    if chosen is None:
        chosen = next((node for node in candidates if node.name == "generate_code"), None)
    if chosen is None or chosen.end_lineno is None:
        raise RuntimeError("Could not find Verity's Ollama generator; no changes made.")
    if "def execute_code(self, studio_id: str, code: str) -> dict:" not in text:
        raise RuntimeError("Existing Studio MCP apply path missing; refusing an unknown bridge.")
    replacement = GENERATOR.replace("__GENERATOR_NAME__", chosen.name)
    lines = text.splitlines(keepends=True)
    output = "".join(lines[:chosen.lineno-1]) + replacement + "".join(lines[chosen.end_lineno:])
    ast.parse(output)
    return output

def main() -> None:
    if len(sys.argv) != 2:
        raise SystemExit("Usage: repair-ollama-luau-v134.py /path/to/studio_agent.py")
    target = Path(sys.argv[1])
    original = target.read_text(encoding="utf-8")
    edited = patch_text(original)
    if edited == original:
        print("[Verity Studio] Ollama generator v1.3.4 already installed.")
        return
    backup = target.with_suffix(".pre-luau-v134.bak")
    if not backup.exists():
        shutil.copy2(target, backup)
    tmp = target.with_suffix(".v134.tmp")
    try:
        tmp.write_text(edited, encoding="utf-8")
        py_compile.compile(str(tmp), doraise=True)
        tmp.replace(target)
    finally:
        tmp.unlink(missing_ok=True)
    print("[Verity Studio] v1.3.4 installed: DeepSeek think=false, resilient JSON parsing, bounded retry.")

if __name__ == "__main__":
    main()
