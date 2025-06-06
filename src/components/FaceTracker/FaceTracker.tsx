"use client";

import { useEffect, useRef, useState } from "react";
import { ModelViewer } from "@/components/ModelViewer/ModelViewer";
import { initMediaPipe } from "@/lib/mediapipe-init";

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
  const faceMeshRef = useRef<any>(null);
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

    const initialize = async () => {
      try {
        console.log("Starting MediaPipe initialization...");
        await initMediaPipe();
        console.log("MediaPipe script loaded.");

        console.log("Waiting for WASM initialization...");
        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log("WASM initialization wait finished.");

        console.log("Creating FaceMesh instance...");
        faceMeshRef.current = new window.FaceMesh({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh@0.2/${file}`;
          },
        });

        faceMeshRef.current.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        console.log("Setting up results handler...");
        faceMeshRef.current.onResults((results: any) => {
          if (
            onFaceLandmarks &&
            results.multiFaceLandmarks &&
            results.multiFaceLandmarks.length > 0
          ) {
            onFaceLandmarks(results.multiFaceLandmarks[0]);
          } else {
            if (onFaceLandmarks) {
              onFaceLandmarks(null);
            }
          }

          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(results.image, 0, 0, canvas.width, canvas.height);
            }
          }
        });
        console.log("Results handler set up.");

        console.log("Initializing camera...");
        await initCamera();
        console.log("Camera initialized.");

        console.log("Face tracking initialization complete.");
      } catch (error) {
        console.error("Error during initialization:", error);
        if (
          confirm(
            "Failed to initialize face tracking. Would you like to reload the page?"
          )
        ) {
          window.location.reload();
        }
      }
    };

    const initCamera = async () => {
      try {
        const constraints = {
          video: {
            width: { ideal: width },
            height: { ideal: height },
            facingMode: "user",
          },
        };

        try {
          const stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
              setIsInitialized(true);
            });
          }
        } catch (err) {
          console.log("Falling back to minimal constraints");
          const fallbackStream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
            },
          });

          if (videoRef.current) {
            videoRef.current.srcObject = fallbackStream;
            videoRef.current.addEventListener("loadeddata", () => {
              setIsInitialized(true);
            });
          }
        }

        const processFrame = async () => {
          if (videoRef.current && videoRef.current.readyState === 4) {
            await faceMeshRef.current.send({ image: videoRef.current });
          }
          requestAnimationFrame(processFrame);
        };
        processFrame();
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    initialize();

    return () => {
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
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
          baseRotation={[0.5, Math.PI, 3.1]}
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
