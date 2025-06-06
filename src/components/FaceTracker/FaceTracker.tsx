"use client";

import { useEffect, useRef, useState } from "react";
import { ModelViewer } from "@/components/ModelViewer/ModelViewer";
import { initMediaPipe } from "@/lib/mediapipe-init";
import { isMobile, isIOS, isAndroid } from "react-device-detect";

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

    let isInitializing = true;
    let faceMeshInstance: any = null;

    const initialize = async () => {
      try {
        console.log("Starting MediaPipe initialization...");
        await initMediaPipe();
        console.log("MediaPipe script loaded.");

        // Add a longer delay for WASM initialization
        console.log("Waiting for WASM initialization...");
        await new Promise((resolve) => setTimeout(resolve, 2000));
        console.log("WASM initialization wait finished.");

        if (!isInitializing) return; // Check if component is still mounted

        console.log("Creating FaceMesh instance...");
        faceMeshInstance = new window.FaceMesh({
          locateFile: (file: string) => {
            return `/mediapipe/${file}`;
          },
        });

        faceMeshRef.current = faceMeshInstance;

        faceMeshInstance.setOptions({
          maxNumFaces: 1,
          refineLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        console.log("Setting up results handler...");
        faceMeshInstance.onResults((results: any) => {
          if (!isInitializing) return; // Check if component is still mounted

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
            width: isMobile ? { ideal: 1280 } : { ideal: width },
            height: isMobile ? { ideal: 720 } : { ideal: height },
            facingMode: "user",
            aspectRatio: isMobile ? { ideal: 0.5625 } : { ideal: 1 },

            ...(isIOS && {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }),

            ...(isAndroid && {
              width: { ideal: 1280 },
              height: { ideal: 720 },
              frameRate: { ideal: 30 },
            }),
          },
        };

        let stream: MediaStream | null = null;
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          if (videoRef.current && isInitializing) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
              if (isInitializing) {
                setIsInitialized(true);
              }
            });
          }
        } catch (err) {
          console.log("Falling back to minimal constraints");
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              aspectRatio: isMobile ? { ideal: 0.5625 } : { ideal: 1 },

              ...(isIOS && {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }),

              ...(isAndroid && {
                width: { ideal: 1280 },
                height: { ideal: 720 },
              }),
            },
          });

          if (videoRef.current && isInitializing) {
            videoRef.current.srcObject = stream;
            videoRef.current.addEventListener("loadeddata", () => {
              if (isInitializing) {
                setIsInitialized(true);
              }
            });
          }
        }

        const processFrame = async () => {
          if (!isInitializing) return;

          if (
            videoRef.current &&
            videoRef.current.readyState === 4 &&
            faceMeshInstance
          ) {
            await faceMeshInstance.send({ image: videoRef.current });
          }
          if (isInitializing) {
            requestAnimationFrame(processFrame);
          }
        };
        processFrame();
      } catch (error) {
        console.error("Error accessing camera:", error);
      }
    };

    initialize();

    return () => {
      isInitializing = false;
      if (videoRef.current?.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach((track) => track.stop());
      }
      if (faceMeshInstance) {
        faceMeshInstance.close();
        faceMeshRef.current = null;
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
          transform: "scaleX(-1)",
          objectPosition: "center center",
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
          maskScale={1}
          maskRotation={[0, 0, Math.PI / 4]}
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
