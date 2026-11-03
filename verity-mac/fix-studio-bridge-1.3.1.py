#!/usr/bin/env python3
"""Idempotent hotfix for Verity Studio Mode v1.3.0 MCP bridge."""
from pathlib import Path
import py_compile
import sys
import shutil

path=Path(sys.argv[1]); s=path.read_text()
if 'def _readline_with_timeout(self, method:' in s:
    print('[Verity Studio] MCP timeout patch already installed')
    sys.exit(0)

changes = [
('import re\nimport secrets\n','import re\nimport queue\nimport secrets\n'),
('''                line = self.proc.stdout.readline()
''','''                line = self._readline_with_timeout(method, deadline)
'''),
('''            while True:
                line = self._readline_with_timeout(method, deadline)
''','''            deadline = time.monotonic() + (120.0 if method == "tools/call" and params.get("name") == "execute_luau" else 12.0)
            while True:
                line = self._readline_with_timeout(method, deadline)
'''),
('''    def _write(self, msg: dict):
''','''    def _readline_with_timeout(self, method: str, deadline: float) -> str:
        proc = self.proc
        assert proc is not None and proc.stdout is not None
        mailbox: queue.Queue = queue.Queue(maxsize=1)
        def read():
            try:
                mailbox.put(proc.stdout.readline())
            except Exception as e:
                mailbox.put(e)
        threading.Thread(target=read, name="verity-studiomcp-read", daemon=True).start()
        delay = max(0.0, deadline - time.monotonic())
        try:
            value = mailbox.get(timeout=delay)
        except queue.Empty as exc:
            self.close()
            raise MCPError(f"StudioMCP did not respond to {method} within 12 seconds. Check Studio Assistant → Manage MCP Servers and toggle it OFF then ON. See ~/Library/Logs/verity-studiomcp-stderr.log") from exc
        if isinstance(value, BaseException):
            raise MCPError(f"StudioMCP stdout failed: {value}")
        return value

    def _write(self, msg: dict):
'''),
('''    def __init__(self):
        self.proc: subprocess.Popen[str] | None = None
''','''    def __init__(self):
        self._stderr_log = None
        self.proc: subprocess.Popen[str] | None = None
'''),
('''            self.tools = {}

    def connect(self):
''','''            self.tools = {}
            if self._stderr_log is not None:
                self._stderr_log.close()
                self._stderr_log = None

    def connect(self):
'''),
('''            # Never execute a shell command or user-provided binary path.
            self.proc = subprocess.Popen([str(binary)], stdin=subprocess.PIPE,
                                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
                                         bufsize=1, text=True, encoding="utf-8")
''','''            # Log StudioMCP stderr, so startup problems are diagnosable.
            log_path = Path.home() / "Library" / "Logs" / "verity-studiomcp-stderr.log"
            log_path.parent.mkdir(parents=True, exist_ok=True)
            self._stderr_log = log_path.open("a")
            self.proc = subprocess.Popen([str(binary)], stdin=subprocess.PIPE,
                                         stdout=subprocess.PIPE, stderr=self._stderr_log,
                                         bufsize=1, text=True, encoding="utf-8")
'''),
('''        if self.path != "/status":
''','''        if self.path == "/health":
            self._write(200, {"ok": True, "message": "Local Verity bridge is running."})
            return
        if self.path != "/status":
'''),
]
for old,new in changes:
    if old not in s:
        raise SystemExit('[Verity Studio] Unexpected bridge source; refusing an unsafe patch: '+repr(old[:70]))
    s=s.replace(old,new,1)
backup=path.with_suffix('.py.pre-fix.bak')
if not backup.exists():
    shutil.copyfile(path,backup)
tmp=path.with_suffix('.py.tmp')
tmp.write_text(s)
try:
    py_compile.compile(str(tmp), doraise=True)
except Exception:
    tmp.unlink(missing_ok=True)
    raise
path.write_text(s)
print('[Verity Studio] Patched bridge with bounded MCP calls, diagnostics, and health check.')
