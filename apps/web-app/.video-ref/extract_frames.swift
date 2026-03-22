import AVFoundation
import AppKit

let args = CommandLine.arguments
guard args.count >= 2 else {
  fputs("usage: extract_frames.swift <input.mov> <outdir>\n", stderr)
  exit(1)
}
let inputPath = args[1]
let outDir = args[2]
let url = URL(fileURLWithPath: inputPath)
let asset = AVURLAsset(url: url)
let gen = AVAssetImageGenerator(asset: asset)
gen.appliesPreferredTrackTransform = true
gen.requestedTimeToleranceBefore = .zero
gen.requestedTimeToleranceAfter = .zero

let seconds: [Double] = [0.3, 2.0, 5.0, 9.0, 14.0, 17.0]
for (i, sec) in seconds.enumerated() {
  let t = CMTime(seconds: sec, preferredTimescale: 600)
  do {
    let cg = try gen.copyCGImage(at: t, actualTime: nil)
    let rep = NSBitmapImageRep(cgImage: cg)
    guard let png = rep.representation(using: .png, properties: [:]) else { continue }
    let out = "\(outDir)/frame_\(String(format: "%02d", i))_t\(Int(sec))s.png"
    try png.write(to: URL(fileURLWithPath: out))
    print(out)
  } catch {
    fputs("frame \(sec)s: \(error)\n", stderr)
  }
}
