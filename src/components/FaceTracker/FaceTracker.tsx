"use client";

import { useEffect, useRef, useState } from "react";
import { ModelViewer } from "@/components/ModelViewer/ModelViewer";

interface FaceLandmark {
  x: number;
  y: number;
  z: number;
}

interface ModelTransform {
  position: [number, number, number];
  scale: number;
  rotation: [number, number, number];
}

interface FaceTrackerProps {
  onFaceLandmarks?: (landmarks: FaceLandmark[] | null) => void;
  width?: number;
  height?: number;
  modelPath?: string;
  modelTransform?: ModelTransform | null;
  scaleFactor?: number;
  offsetY?: number;
}

declare global {
  interface Window {
    FaceMesh: any;
  }
}

export const FaceTracker: React.FC<FaceTrackerProps> = ({
  onFaceLandmarks,
  width = 640,
  height = 480,
  modelPath,
  modelTransform,
  scaleFactor,
  offsetY,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  // const [modelViewerPosition, setModelViewerPosition] = useState<
  //   [number, number, number]
  // >([0.5, 0.5, 0]);
  // const [modelViewerScale, setModelViewerScale] = useState(1);
  // const [modelViewerRotation, setModelViewerRotation] = useState<
  //   [number, number, number]
  // >([0, 0, 0]);

  useEffect(() => {
    if (!videoRef.current || !canvasRef.current) return;

    // Debug: log window and element sizes
    setTimeout(() => {
      console.log(
        "window.innerWidth:",
        window.innerWidth,
        "window.innerHeight:",
        window.innerHeight
      );
      if (videoRef.current) {
        console.log(
          "video.getBoundingClientRect():",
          videoRef.current.getBoundingClientRect()
        );
      }
      if (canvasRef.current) {
        console.log(
          "canvas.getBoundingClientRect():",
          canvasRef.current.getBoundingClientRect()
        );
      }
      const modelViewerDiv = document.querySelector("#model-viewer-overlay");
      if (modelViewerDiv) {
        console.log(
          "ModelViewer div getBoundingClientRect():",
          modelViewerDiv.getBoundingClientRect()
        );
      }
    }, 2000);

    // Log actual dimensions of the overlay div
    const overlayDiv = document.getElementById("model-viewer-overlay");
    if (overlayDiv) {
      console.log(
        "#model-viewer-overlay client rect:",
        overlayDiv.getBoundingClientRect()
      );
    }

    // Load MediaPipe FaceMesh script
    const script = document.createElement("script");
    script.src =
      "https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/face_mesh.js";
    script.async = true;
    script.onload = () => {
      initializeFaceMesh();
    };
    document.body.appendChild(script);

    const initializeFaceMesh = () => {
      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        },
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
        if (
          onFaceLandmarks &&
          results.multiFaceLandmarks &&
          results.multiFaceLandmarks.length > 0
        ) {
          onFaceLandmarks(results.multiFaceLandmarks[0]);
          // console.log("Landmarks:", results.multiFaceLandmarks[0]); // Keep this line commented for potential future debugging
        } else {
          // When no face is detected, pass null to indicate no landmarks
          if (onFaceLandmarks) {
            onFaceLandmarks(null);
          }
        }

        // Draw face mesh on canvas for DEBUGGING ONLY
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext("2d");
          if (ctx) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            if (
              results.multiFaceLandmarks &&
              results.multiFaceLandmarks.length > 0
            ) {
              // drawLandmarks( // Keep this commented for potential future debugging
              //   ctx,
              //   results.multiFaceLandmarks[0],
              //   canvas.width,
              //   canvas.height
              // );
              // // Draw a yellow circle at the mapped landmark position (between the eyes) // Keep this commented for potential future debugging
              // const leftEye = results.multiFaceLandmarks[0][33];
              // const rightEye = results.multiFaceLandmarks[0][263];
              // const centerX = ((leftEye.x + rightEye.x) / 2) * canvas.width;
              // const centerY = ((leftEye.y + rightEye.y) / 2) * canvas.height;
              // ctx.save();
              // ctx.beginPath();
              // ctx.arc(centerX, centerY, 8, 0, 2 * Math.PI);
              // ctx.fillStyle = "yellow";
              // ctx.fill();
              // ctx.restore();
            }
          }
        }
      });

      // camera init
      const initCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: {
              width: width,
              height: height,
              facingMode: "user",
            },
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
              setIsInitialized(true);
            });
          }

          // Start processing frames
          const processFrame = async () => {
            if (videoRef.current && videoRef.current.readyState === 4) {
              await faceMesh.send({ image: videoRef.current });
            }
            requestAnimationFrame(processFrame);
          };
          processFrame();
        } catch (error) {
          console.error("Error accessing camera:", error);
        }
      };

      initCamera();

      return () => {
        if (videoRef.current?.srcObject) {
          const stream = videoRef.current.srcObject as MediaStream;
          stream.getTracks().forEach((track) => track.stop());
        }
        faceMesh.close();
      };
    };

    return () => {
      // Remove script on cleanup
      script.remove();
    };
  }, [onFaceLandmarks, width, height]);

  return (
    <div
      style={{
        position: "relative",
        width: "100vw",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <video
        ref={videoRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          objectFit: "cover",
          zIndex: 1,
        }}
        width={width}
        height={height}
        playsInline
        autoPlay
      />
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 2,
        }}
        width={width}
        height={height}
      />
      {/* Always render the ModelViewer overlay for DEBUGGING PURPOSES ONLY! */}
      <div
        id="model-viewer-overlay"
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          zIndex: 3,
        }}
      >
        <ModelViewer
          modelPath={modelPath || ""}
          position={modelTransform?.position || [0.5, 0.5, 0]}
          scale={modelTransform?.scale || 1}
          rotation={modelTransform?.rotation || [0, 0, 0]}
          scaleFactor={scaleFactor}
          offsetY={offsetY}
          baseRotation={[Math.PI, Math.PI, 0]}
        />
      </div>
      {!isInitialized && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            zIndex: 10,
          }}
        >
          Initializing camera...
        </div>
      )}
    </div>
  );
};
