#!/usr/bin/env python3
"""Verity v1.2.2 hotfix applied after bundled source extraction."""
from pathlib import Path
import sys
root = Path(sys.argv[1]).expanduser()
sources = root / 'Sources' / 'Verity'
def change(file, old, new):
    path = sources / file
    contents = path.read_text()
    if old not in contents:
        raise SystemExit('Verity update stopped: source mismatch in ' + file)
    path.write_text(contents.replace(old, new, 1))

change('VoiceServices.swift', 'req.setValue("s2.1-pro", forHTTPHeaderField: "model")',
       'req.setValue("s2.1-pro-free", forHTTPHeaderField: "model")')
change('VoiceServices.swift',
'''            throw NSError(domain: "Verity.Fish", code: status, userInfo: [NSLocalizedDescriptionKey: "Fish Audio request failed (HTTP \(status)). Check your API key, voice ID, and account usage."])''',
'''            let rawMessage = String(data: data, encoding: .utf8) ?? ""
            let serverMessage = String(rawMessage.prefix(180)).replacingOccurrences(of: "\n", with: " ")
            let details = serverMessage.isEmpty ? "" : " Response: \(serverMessage)"
            throw NSError(domain: "Verity.Fish", code: status, userInfo: [NSLocalizedDescriptionKey: "Fish Audio HTTP \(status). Check free-model access, API key and voice ID.\(details)"])''')
change('VoiceController.swift',
'''                    self.onError?(error.localizedDescription)
                    self.onDone?()
                }
            }
            return''',
'''                    self.onError?("Fish Audio failed: \(error.localizedDescription). Using the built-in Mac voice instead.")
                    self.speak(cleaned, rate: rate, provider: .system, systemVoiceID: systemVoiceID)
                }
            }
            return''')
# Views.swift has multiple layouts across v1.2.1 bundles.
# Keep the core audio fix independent of its presentation layout.
views = (sources / 'Views.swift').read_text()
previewIndex = views.find("Preview Verity's voice")
if previewIndex >= 0:
    print("[Verity] Voice preview UI found; voice failures remain visible in the chat error banner.")
else:
    print("[Verity] Voice preview UI structure differs; core speech repair still applies.")

change('VerityStore.swift',
'''        if voiceEnabled { voice.suspend() }
        isSpeaking = true
        status = "Voice preview…"''',
'''        if voiceEnabled { voice.suspend() }
        lastError = nil
        isSpeaking = true
        status = "Voice preview…"''')
change('Version.swift', '"1.2.1"', '"1.2.2"')
build = root / 'build.command'
contents=build.read_text().replace('<string>1.2.1</string>', '<string>1.2.2</string>')
build.write_text(contents)
print('[Verity] v1.2.2: Fish Audio Free model, visible diagnostics, and macOS voice fallback enabled.')
