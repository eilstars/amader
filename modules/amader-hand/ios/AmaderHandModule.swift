import ExpoModulesCore
import UIKit
import Vision

// Finds one hand in a photo with Apple's Vision framework. Everything runs on the phone.
// Returns 21 joints in the same order the web detector uses: wrist, then thumb to little finger,
// each as x and y from 0 to 1 measured from the top left of the photo. Returns nil when no hand is found.
public class AmaderHandModule: Module {
  public func definition() -> ModuleDefinition {
    Name("AmaderHand")

    AsyncFunction("detect") { (uri: String) -> [[String: Double]]? in
      guard let url = URL(string: uri) ?? URL(string: "file://" + uri),
            let data = try? Data(contentsOf: url),
            let image = UIImage(data: data),
            let cgImage = image.cgImage else {
        return nil
      }

      let request = VNDetectHumanHandPoseRequest()
      request.maximumHandCount = 1
      let handler = VNImageRequestHandler(cgImage: cgImage, orientation: AmaderHandModule.orientation(image.imageOrientation), options: [:])
      try handler.perform([request])

      guard let hand = request.results?.first else {
        return nil
      }
      let joints = try hand.recognizedPoints(.all)
      let order: [VNHumanHandPoseObservation.JointName] = [
        .wrist,
        .thumbCMC, .thumbMP, .thumbIP, .thumbTip,
        .indexMCP, .indexPIP, .indexDIP, .indexTip,
        .middleMCP, .middlePIP, .middleDIP, .middleTip,
        .ringMCP, .ringPIP, .ringDIP, .ringTip,
        .littleMCP, .littlePIP, .littleDIP, .littleTip
      ]

      var points: [[String: Double]] = []
      for name in order {
        guard let point = joints[name] else {
          return nil
        }
        // Vision measures from the bottom left, the app from the top left.
        points.append(["x": Double(point.location.x), "y": 1.0 - Double(point.location.y)])
      }
      // The ruler needs the wrist and the knuckle row to be trustworthy.
      let needed: [VNHumanHandPoseObservation.JointName] = [.wrist, .indexMCP, .middleMCP, .littleMCP]
      for name in needed {
        if (joints[name]?.confidence ?? 0) < 0.3 {
          return nil
        }
      }
      return points
    }
  }

  private static func orientation(_ o: UIImage.Orientation) -> CGImagePropertyOrientation {
    switch o {
    case .up: return .up
    case .down: return .down
    case .left: return .left
    case .right: return .right
    case .upMirrored: return .upMirrored
    case .downMirrored: return .downMirrored
    case .leftMirrored: return .leftMirrored
    case .rightMirrored: return .rightMirrored
    @unknown default: return .up
    }
  }
}
