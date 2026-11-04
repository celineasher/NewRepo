import SwiftUI
import AppKit

// Verity Pixel Motion v1.4 — dynamic 128px yellow sphere with sharp pixel art.
// Only draws a sprite stage; PetView retains voice controls and window dragging.
private enum MascotSprites {
    static var images: [String: NSImage] = [:]
    static func image(_ name: String) -> NSImage {
        if let cached = images[name] { return cached }
        guard let url = Bundle.main.url(forResource: name, withExtension: "png", subdirectory: "Sprites"),
              let sprite = NSImage(contentsOf: url) else {
            return NSImage(size: NSSize(width: 128, height: 128))
        }
        images[name] = sprite
        return sprite
    }
}
private struct MascotPose {
    var sprite: String = "idle"
    var angle: Double = 0
    var x: CGFloat = 0
    var y: CGFloat = 0
    var stretchX: CGFloat = 1
    var stretchY: CGFloat = 1
    var shadowScale: CGFloat = 1
    var light: Double = 0.12

    static func calculate(time: Double, store: VerityStore) -> MascotPose {
        var p = MascotPose()
        if !store.animationsEnabled {
            p.sprite = store.isSpeaking ? "talk3" :
                       store.isGenerating ? "thinking" :
                       store.isListening ? "listening" : "idle"
            return p
        }
        let clock = time.truncatingRemainder(dividingBy: 50_000)
        let breathing = sin(clock * 1.83)
        p.y = CGFloat(-2.7 * breathing)
        p.angle = sin(clock * 0.85) * 2.1
        p.stretchX = CGFloat(1 + breathing * 0.009)
        p.stretchY = CGFloat(1 - breathing * 0.008)

        if store.isSpeaking {
            let syllable = Int(floor(clock * 9.5))
            let mouths = ["talk1", "talk3", "talk5", "talk2", "talk4", "talk2", "talk3", "talk1"]
            p.sprite = mouths[syllable % mouths.count]
            p.angle = sin(clock * 6.8) * 3.4
            p.y = CGFloat(-4.2 * sin(clock * 6.6))
            p.stretchY = CGFloat(1 + 0.018 * sin(clock * 9.5))
            p.light = 0.25
            return p
        }
        if store.isGenerating {
            let cycle = clock.truncatingRemainder(dividingBy: 3.7)
            p.sprite = cycle < 0.40 ? "blink_half" : cycle < 1.35 ? "thinking" : "look_left"
            p.angle = -3 + sin(clock * 1.4) * 1.8
            p.light = 0.12
            return p
        }
        if store.isListening {
            p.sprite = Int(clock * 1.9) % 9 == 0 ? "surprised" : "listening"
            p.angle = sin(clock * 2.2) * 1.3
            p.y = CGFloat(-2.9 * sin(clock * 2.7))
            p.light = 0.32
            return p
        }

        let blink = clock.truncatingRemainder(dividingBy: 5.7)
        let mood = clock.truncatingRemainder(dividingBy: 39)
        if blink < 0.10 {
            p.sprite = "blink_half"
        } else if blink < 0.20 {
            p.sprite = "blink"
        } else if blink < 0.30 {
            p.sprite = "blink_half"
        } else if mood > 26.2 && mood < 27.3 {
            p.sprite = mood < 26.65 ? "grin" : "grin_eyes"
        } else if mood > 8.5 && mood < 9.1 {
            p.sprite = "look_left"
        } else if mood > 10.7 && mood < 11.3 {
            p.sprite = "look_right"
        } else if mood > 34.0 && mood < 34.55 {
            p.sprite = "happy"
        }

        // Smooth anticipation -> rotation -> elastic landing.
        let roll = clock.truncatingRemainder(dividingBy: 23)
        if roll >= 18.4 && roll < 21.35 {
            let t = roll - 18.4
            if t < 0.43 {
                let u = t / 0.43, ease = u * u * (3 - 2 * u)
                p.angle = -13 * ease
                p.stretchX = CGFloat(1 + 0.12 * ease)
                p.stretchY = CGFloat(1 - 0.12 * ease)
                p.y = CGFloat(4 * ease)
                p.x = CGFloat(-8 * ease)
            } else if t < 2.02 {
                let u = (t - 0.43) / 1.59, ease = u * u * (3 - 2 * u)
                p.angle = -13 + 373 * ease
                p.x = CGFloat(-8 + 19 * ease)
                p.y = CGFloat(-19 * sin(u * .pi) - 2)
                p.shadowScale = CGFloat(1 - 0.20 * sin(u * .pi))
            } else {
                let u = (t - 2.02) / 0.93
                let decay = exp(-4.2 * u)
                p.angle = 360 + 7 * sin(u * .pi * 3) * decay
                p.x = CGFloat(11 * (1 - u))
                p.y = CGFloat(-8 * abs(sin(u * .pi * 2)) * decay)
                p.stretchX = CGFloat(1 + 0.10 * sin(u * .pi * 2) * decay)
                p.stretchY = CGFloat(1 - 0.10 * sin(u * .pi * 2) * decay)
            }
        }
        return p
    }
}

struct VerityMascotStage: View {
    @ObservedObject var store: VerityStore
    let time: Double

    var body: some View {
        let pose = MascotPose.calculate(time: time, store: store)
        ZStack {
            Ellipse()
                .fill(Color.black.opacity(0.31))
                .frame(width: 112, height: 15)
                .scaleEffect(x: pose.shadowScale, y: 1)
                .blur(radius: 8)
                .offset(y: 60)

            if store.animationsEnabled && (store.isSpeaking || store.isListening) {
                Circle()
                    .stroke(Color(red: 1, green: 0.78, blue: 0.17).opacity(pose.light), lineWidth: 1.2)
                    .frame(width: 150, height: 150)
                    .scaleEffect(CGFloat(1.03 + 0.035 * sin(time * 4.2)))
                    .offset(y: -9)
            }

            Image(nsImage: MascotSprites.image(pose.sprite))
                .resizable()
                .interpolation(.none)
                .frame(width: 164, height: 164)
                .scaleEffect(x: pose.stretchX, y: pose.stretchY)
                .rotationEffect(.degrees(pose.angle))
                .offset(x: pose.x, y: pose.y - 13)
                .shadow(color: Color(red: 1, green: 0.78, blue: 0.08)
                    .opacity(pose.light), radius: store.isListening ? 13 : 5)

            if store.animationsEnabled && store.isSpeaking {
                Image(systemName: "sparkle")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(Color(red: 1, green: 0.87, blue: 0.26))
                    .opacity(0.54 + 0.37 * sin(time * 3.3))
                    .offset(x: 76, y: -58)
                    .allowsHitTesting(false)
            }
        }
        .frame(width: 200, height: 167)
        .accessibilityLabel("Verity pixel mascot")
    }
}
