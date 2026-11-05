// Legend art focus: where each legend printing's art should be cropped when
// it's a deck card's backdrop (`CardBackdrop` in apps/mobile), so every deck
// frames its legend the same way — face centered, face the same size.
//
//   pnpm catalog:legend-focus [--sheet <out.png>]
//
// macOS only (Apple's Vision framework, nothing to install). Reads public data
// only: the legend printings through the publishable key in apps/mobile/.env,
// and their art from the public `card-images` bucket. Writes
// apps/mobile/lib/legendArtFocus.json (commit it). `--sheet` also draws every
// crop on one contact sheet to check by eye.
//
// Per printing: the largest face in the illustration (Vision face detection);
// with none, an upper body's head; with neither (creatures, masks), the area
// Vision rates most eye-catching; with
// none of those, a default. Entries in legendArtFocus.manual.json override the
// detection, for the odd miss.

import AppKit
import Foundation
import Vision

// MARK: - The crop, mirrored by apps/mobile CardBackdrop

/// Card images are 744 × 1039.
let imageRatio = 1039.0 / 744.0
/// The backdrop box (≈70% of a deck card) is about this wide for its height.
let boxAspect = 2.6
/// A face fills this share of the box's height.
let faceShare = 0.55
/// The focus point sits this far across the box (its left part is faded).
let focusAt = 0.62
/// Crop width, as a share of the image width: never tighter (too blurry) or
/// looser (the card frame shows).
let minWidth = 0.42, maxWidth = 0.8
/// The illustration's area on the card, in image fractions: inside the frame,
/// above the text box.
let artLeft = 0.1, artRight = 0.93, artTop = 0.03, artBottom = 0.6

struct Focus: Codable {
  /// Focus point, as fractions of the image's width / height.
  var x: Double
  var y: Double
  /// Crop width as a fraction of the image width.
  var w: Double
  var source: String
}

/// A crop `w` wide with (cx, cy) at `focusAt` across and halfway down, kept
/// inside the illustration.
func crop(cx: Double, cy: Double, w: Double, source: String) -> Focus {
  let w = min(max(w, minWidth), maxWidth)
  let hFrac = (w / boxAspect) / imageRatio  // crop height in image heights
  let x = min(max(cx, artLeft + w * focusAt), artRight - w * (1 - focusAt))
  let y = min(max(cy, artTop + hFrac / 2), artBottom - hFrac / 2)
  return Focus(x: round4(x), y: round4(y), w: round4(w), source: source)
}

func round4(_ v: Double) -> Double { (v * 10000).rounded() / 10000 }

/// Face box (Vision: normalized, origin bottom-left) → crop.
func cropForFace(_ box: CGRect) -> Focus {
  let faceH = box.height  // in image heights
  // Crop height so the face fills `faceShare` of it, then width from aspect.
  let hFrac = faceH / faceShare
  let w = hFrac * imageRatio * boxAspect
  return crop(cx: box.midX, cy: 1 - box.midY, w: w, source: "face")
}

// MARK: - Detection

/// Face detection on the illustration only (frame and text box cut off),
/// drawn at 2×; the box comes back in whole-image coordinates.
func faceInArtCrop(_ image: CGImage) -> CGRect? {
  let w = Double(image.width), h = Double(image.height)
  // CGImage crop rects are top-left based.
  let rect = CGRect(x: artLeft * w, y: artTop * h, width: (artRight - artLeft) * w, height: (artBottom - artTop) * h)
  guard let cut = image.cropping(to: rect),
    let ctx = CGContext(
      data: nil, width: cut.width * 2, height: cut.height * 2, bitsPerComponent: 8, bytesPerRow: 0,
      space: CGColorSpaceCreateDeviceRGB(), bitmapInfo: CGImageAlphaInfo.premultipliedLast.rawValue)
  else { return nil }
  ctx.interpolationQuality = .high
  ctx.draw(cut, in: CGRect(x: 0, y: 0, width: cut.width * 2, height: cut.height * 2))
  guard let big = ctx.makeImage() else { return nil }
  let req = VNDetectFaceRectanglesRequest()
  try? VNImageRequestHandler(cgImage: big, options: [:]).perform([req])
  guard let f = (req.results ?? []).filter({ $0.confidence > 0.3 })
    .max(by: { $0.boundingBox.height < $1.boundingBox.height })?.boundingBox
  else { return nil }
  // Crop-normalized (origin bottom-left) → image-normalized (origin bottom-left).
  let cw = artRight - artLeft, ch = artBottom - artTop
  return CGRect(x: artLeft + f.minX * cw, y: (1 - artBottom) + f.minY * ch, width: f.width * cw, height: f.height * ch)
}

func detect(_ image: CGImage) -> Focus {
  let handler = VNImageRequestHandler(cgImage: image, options: [:])
  let faces = VNDetectFaceRectanglesRequest()
  let bodies = VNDetectHumanRectanglesRequest()
  bodies.upperBodyOnly = true
  let saliency = VNGenerateAttentionBasedSaliencyImageRequest()
  try? handler.perform([faces, bodies, saliency])
  let inArt = { (b: CGRect) in (1 - b.midY) < artBottom }

  // Faces in the illustration only (not in the text box), largest first.
  // Painted faces score lower than photos, so the bar is low.
  let found = (faces.results ?? [])
    .filter { inArt($0.boundingBox) && $0.confidence > 0.3 }
    .sorted { $0.boundingBox.height > $1.boundingBox.height }
  if let face = found.first { return cropForFace(face.boundingBox) }
  // Missed faces are often found again on the illustration alone, enlarged.
  if let face = faceInArtCrop(image) { return cropForFace(face) }

  // An upper body: its head is about the top quarter of the box.
  if let body = (bodies.results ?? []).filter({ inArt($0.boundingBox) && $0.confidence > 0.3 })
    .max(by: { $0.boundingBox.height < $1.boundingBox.height })
  {
    let b = body.boundingBox
    let head = CGRect(x: b.minX + b.width * 0.3, y: b.maxY - b.height * 0.28, width: b.width * 0.4, height: b.height * 0.28)
    var f = cropForFace(head)
    f.source = "body"
    return f
  }

  if let obs = saliency.results?.first, let salient = obs.salientObjects?
    .filter({ inArt($0.boundingBox) })
    .max(by: { $0.confidence < $1.confidence })
  {
    let b = salient.boundingBox
    // Frame the top of the subject — usually where a head is — loosely.
    return crop(cx: b.midX, cy: 1 - b.maxY + b.height * 0.3, w: 0.75, source: "salient")
  }
  return crop(cx: 0.5, cy: 0.3, w: maxWidth, source: "default")
}

// MARK: - IO

let root = URL(fileURLWithPath: FileManager.default.currentDirectoryPath)
func env(_ file: URL) -> [String: String] {
  guard let text = try? String(contentsOf: file, encoding: .utf8) else { return [:] }
  var out: [String: String] = [:]
  for line in text.split(separator: "\n") {
    let parts = line.split(separator: "=", maxSplits: 1).map(String.init)
    if parts.count == 2, !parts[0].hasPrefix("#") {
      out[parts[0].trimmingCharacters(in: .whitespaces)] =
        parts[1].trimmingCharacters(in: .whitespaces).trimmingCharacters(in: CharacterSet(charactersIn: "\"'"))
    }
  }
  return out
}

let vars = env(root.appendingPathComponent("apps/mobile/.env"))
guard let base = vars["EXPO_PUBLIC_SUPABASE_URL"], let key = vars["EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] else {
  fatalError("Run from the repo root; needs apps/mobile/.env (EXPO_PUBLIC_SUPABASE_URL / _PUBLISHABLE_KEY).")
}

func get(_ url: URL, apiKey: Bool = false) -> Data? {
  var req = URLRequest(url: url)
  if apiKey { req.setValue(key, forHTTPHeaderField: "apikey") }
  let sem = DispatchSemaphore(value: 0)
  var out: Data?
  URLSession.shared.dataTask(with: req) { data, resp, _ in
    if (resp as? HTTPURLResponse)?.statusCode == 200 { out = data }
    sem.signal()
  }.resume()
  sem.wait()
  return out
}

struct Row: Decodable { let code: String; let storage_path: String? }
let listURL = URL(string: "\(base)/rest/v1/card_printings?select=code,storage_path,cards!inner(type)&cards.type=eq.Legend&order=code&limit=1000")!
guard let listData = get(listURL, apiKey: true), let rows = try? JSONDecoder().decode([Row].self, from: listData) else {
  fatalError("Couldn't list legend printings.")
}

let outFile = root.appendingPathComponent("apps/mobile/lib/legendArtFocus.json")
let manualFile = root.appendingPathComponent("apps/mobile/lib/legendArtFocus.manual.json")
let manual = (try? JSONDecoder().decode([String: Focus].self, from: Data(contentsOf: manualFile))) ?? [:]

var result: [String: Focus] = [:]
var images: [(String, CGImage)] = []
for row in rows {
  guard let path = row.storage_path,
    let data = get(URL(string: "\(base)/storage/v1/object/public/card-images/\(path)")!),
    let src = CGImageSourceCreateWithData(data as CFData, nil),
    let image = CGImageSourceCreateImageAtIndex(src, 0, nil)
  else {
    print("skip \(row.code): no image")
    continue
  }
  result[row.code] = manual[row.code] ?? detect(image)
  images.append((row.code, image))
}

let enc = JSONEncoder()
enc.outputFormatting = [.prettyPrinted, .sortedKeys]
try! enc.encode(result).write(to: outFile)
let counts = Dictionary(grouping: result.values, by: \.source).mapValues(\.count)
print("\(result.count) legend printings → apps/mobile/lib/legendArtFocus.json", counts)

// MARK: - Contact sheet

if let i = CommandLine.arguments.firstIndex(of: "--sheet"), i + 1 < CommandLine.arguments.count {
  let cellW = 260.0, cellH = cellW / boxAspect, label = 16.0, cols = 6
  let rowsN = (images.count + cols - 1) / cols
  let size = NSSize(width: cellW * Double(cols), height: (cellH + label) * Double(rowsN))
  let sheet = NSImage(size: size)
  sheet.lockFocus()
  NSColor.black.setFill()
  NSRect(origin: .zero, size: size).fill()
  for (n, (code, image)) in images.enumerated() {
    guard let f = result[code] else { continue }
    let iw = Double(image.width), ih = Double(image.height)
    let cw = f.w * iw, ch = cw / boxAspect
    let rect = CGRect(x: f.x * iw - cw * focusAt, y: f.y * ih - ch / 2, width: cw, height: ch)
    let col = n % cols, rowI = n / cols
    let ox = Double(col) * cellW, oy = size.height - Double(rowI + 1) * (cellH + label)
    if let cut = image.cropping(to: rect) {
      NSImage(cgImage: cut, size: .zero).draw(in: NSRect(x: ox, y: oy, width: cellW, height: cellH))
    }
    ("\(code) \(f.source)" as NSString).draw(
      at: NSPoint(x: ox + 4, y: oy + cellH + 2),
      withAttributes: [.foregroundColor: NSColor.white, .font: NSFont.systemFont(ofSize: 11)])
  }
  sheet.unlockFocus()
  let out = URL(fileURLWithPath: CommandLine.arguments[i + 1])
  if let tiff = sheet.tiffRepresentation, let rep = NSBitmapImageRep(data: tiff),
    let png = rep.representation(using: .png, properties: [:])
  {
    try! png.write(to: out)
    print("sheet → \(out.path)")
  }
}
