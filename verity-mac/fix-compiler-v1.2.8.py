#!/usr/bin/env python3
"""Verity v1.2.8: repair output-tone type-checking in the exact v1.2.7 source."""
from pathlib import Path
import sys

root = Path(sys.argv[1]).resolve()
monitor = root / "Sources/Verity/LiveMicMonitor.swift"
version = root / "Sources/Verity/Version.swift"
builder = root / "build.command"
assert all(p.is_file() for p in (monitor, version, builder)), "Incomplete Verity source"
src = monitor.read_text()
begin = "    /// Audibly tests the chosen device independently of microphone and recognizer."
assert src.count(begin) == 1, "Unexpected LiveMicMonitor.swift structure"
assert "func testOutput(_ output: AudioDeviceID?)" in src
assert "playbackQueue.async { [self] in" in src[src.index(begin):], "Expected v1.2.7 implementation not found"
fixed = r'''    /// Audibly tests the chosen device independently of microphone and recognizer.
    /// Keep the dispatched closure trivial so the Swift type checker remains bounded.
    func testOutput(_ output: AudioDeviceID?) {
        playbackQueue.async { [weak self] in
            self?.performOutputTest(output)
        }
    }

    /// Executed on playbackQueue; never on the UI thread or real-time mic callback.
    private func performOutputTest(_ output: AudioDeviceID?) {
        stopTone()
        guard let stereo = AVAudioFormat(standardFormatWithSampleRate: 48_000, channels: 2),
              let buffer = AVAudioPCMBuffer(pcmFormat: stereo, frameCapacity: 14_400) else {
            statusHandler("Output test: could not create a test signal.")
            return
        }
        fillTestTone(buffer)
        do {
            let created = try makePlaybackEngine(format: stereo, output: output, volume: 0.45)
            toneEngine = created.0
            tonePlayer = created.1
            created.1.scheduleBuffer(buffer)
            statusHandler("Playing a short test tone to the selected output…")
            playbackQueue.asyncAfter(deadline: .now() + 0.7) { [weak self] in
                self?.finishOutputTest(engine: created.0)
            }
        } catch {
            stopTone()
            statusHandler("Output test failed: \(error.localizedDescription)")
        }
    }

    private func fillTestTone(_ buffer: AVAudioPCMBuffer) {
        let frameCount: Int = 14_400
        buffer.frameLength = AVAudioFrameCount(frameCount)
        guard let channels = buffer.floatChannelData else { return }
        let frequency: Float = 523.25
        let sampleRate: Float = 48_000
        let amplitude: Float = 0.20
        for index in 0..<frameCount {
            let attack: Float = min(1.0, Float(index) / 700.0)
            let release: Float = min(1.0, Float(frameCount - index) / 700.0)
            let envelope: Float = max(0.0, min(attack, release))
            let angle: Float = (Float(index) * 2.0 * Float.pi * frequency) / sampleRate
            let sample: Float = sin(angle) * amplitude * envelope
            channels[0][index] = sample
            channels[1][index] = sample
        }
    }

    private func finishOutputTest(engine testedEngine: AVAudioEngine) {
        guard toneEngine === testedEngine else { return }
        stopTone()
        statusHandler("Output test completed. If silent, check the actual headphone jack and Mac output volume.")
    }

    private func stopTone() {
        tonePlayer?.stop()
        toneEngine?.stop()
        tonePlayer = nil
        toneEngine = nil
    }
}
'''
monitor.write_text(src[:src.index(begin)] + fixed)
v = version.read_text()
assert 'static let current = "1.2.7"' in v, "Wrong source version"
version.write_text(v.replace('static let current = "1.2.7"', 'static let current = "1.2.8"'))
b = builder.read_text()
assert '<key>CFBundleShortVersionString</key><string>1.2.7</string>' in b
builder.write_text(b.replace('<key>CFBundleShortVersionString</key><string>1.2.7</string>', '<key>CFBundleShortVersionString</key><string>1.2.8</string>'))
print("Verity 1.2.8 output-tone compiler fix applied.")
