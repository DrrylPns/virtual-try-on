"use client";

import { useState, useEffect } from "react";
import { FaceTracker } from "@/components/FaceTracker/FaceTracker";
import { ModelSelector1 } from "@/components/model-selector";
import useModelStore from "@/stores/useModelStore";

interface Model {
  id: string;
  name: string;
  path: string;
}

function getEyewearTransform(landmarks: any): {
  position: [number, number, number];
  scale: number;
  rotation: [number, number, number];
} | null {
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 468)
    return null;
  const leftEye = landmarks[33]; // outer left
  const rightEye = landmarks[263]; // outer right
  const noseBridge = landmarks[6]; // top nose bridge
  const noseTip = landmarks[1]; // tip of the nose
  const leftInnerEye = landmarks[133]; // inner left
  const rightInnerEye = landmarks[362]; // inner right

  // console.log("leftEye", leftEye);
  // console.log("rightEye", rightEye);
  // console.log("noseBridge", noseBridge);
  // console.log("noseTip", noseTip);

  const position: [number, number, number] = [
    (leftInnerEye.x + rightInnerEye.x + noseBridge.x) / 3,
    (leftInnerEye.y + rightInnerEye.y + noseBridge.y * 1.2) / 3.2,
    (leftInnerEye.z + rightInnerEye.z + noseBridge.z) / 3, // Average Z
  ];

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const dz = rightEye.z - leftEye.z;
  const eyeDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const pitch = Math.atan2(
    noseBridge.y - position[1],
    noseBridge.z - position[2]
  );

  // const centerX = (leftEye.x + rightEye.x) / 2;

  const yaw = Math.atan2(rightEye.z - leftEye.z, rightEye.x - leftEye.x);
  const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  // ! FOR TESTING / DEBUGGING
  // const pitch = 3 * Math.atan2(noseTip.y - center[1], rightEye.y - leftEye.y);
  // const yaw = 3 * Math.atan2(rightEye.z - leftEye.z, rightEye.x - leftEye.x);

  // console.log("pitch", pitch, "yaw", yaw, "roll", roll);

  return {
    position: position,
    scale: eyeDist / 0.082,
    rotation: [pitch, yaw, -roll], // Removed negative sign from yaw
  };
}

export default function Home() {
  const { selectedModel } = useModelStore();
  const [faceLandmarks, setFaceLandmarks] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 360, height: 640 });

  useEffect(() => {
    const updateDimensions = () => {
      setDimensions({ width: window.innerWidth, height: window.innerHeight });
    };
    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  const eyewearTransform = getEyewearTransform(faceLandmarks);

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black">
      <FaceTracker
        onFaceLandmarks={setFaceLandmarks}
        width={dimensions.width}
        height={dimensions.height}
        modelPath={selectedModel?.path}
        modelTransform={eyewearTransform}
        scaleFactor={0.115}
        offsetY={0.05}
      />

      {/* Model selection slider */}
      {/* <div className="absolute bottom-0 left-0 w-full flex overflow-x-auto bg-black/60 py-3 px-2 gap-3 z-50">
        {AVAILABLE_MODELS.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModel(model)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-white font-semibold border-2 transition-all duration-150 ${
              selectedModel.id === model.id
                ? "bg-white text-black border-white"
                : "border-white/40 bg-black/40"
            }`}
          >
            {model.name}
          </button>
        ))}
      </div> */}

      <ModelSelector1 />
    </div>
  );
}
