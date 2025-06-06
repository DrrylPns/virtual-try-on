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
  const noseTip = landmarks[1]; // tip of the nose
  const leftInnerEye = landmarks[133]; // inner left
  const rightInnerEye = landmarks[362]; // inner right

  const position: [number, number, number] = [
    (leftInnerEye.x + rightInnerEye.x + noseTip.x) / 3,
    (leftInnerEye.y + rightInnerEye.y + noseTip.y * 1.2) / 3.2,
    (leftInnerEye.z + rightInnerEye.z + noseTip.z) / 2, // Average Z
  ];

  const pitch = Math.atan2(noseTip.y - position[1], noseTip.z - position[2]);

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const dz = rightEye.z - leftEye.z;
  const eyeDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const yaw = Math.atan2(rightEye.z - leftEye.z, rightEye.x - leftEye.x);

  let roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x);

  // Amplify the roll effect
  roll = roll * 4.0; // Increased the multiplier

  // Adjust roll if it indicates an upside-down orientation (close to +/- PI)
  // This is a heuristic and might need fine-tuning
  if (Math.abs(roll) > Math.PI * 0.8) {
    if (roll > 0) {
      roll = roll - Math.PI;
    } else {
      roll = roll + Math.PI;
    }
  }

  // Normalize pitch to be around 3 when looking straight
  const normalizedPitch = 3 + pitch * 0.1;

  console.log(
    "Roll Debug - raw:",
    Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x).toFixed(3),
    "multiplied:",
    roll.toFixed(3)
  );

  return {
    position: position,
    scale: eyeDist / 0.082,
    rotation: [normalizedPitch, yaw, -roll],
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

  // Determine offsetY based on the selected model
  let currentOffsetY = 0.0;
  switch (selectedModel?.model) {
    case "Bennett":
    case "Cove":
    case "Leto":
      currentOffsetY = 0.15;
      break;
    case "Elba":
      currentOffsetY = 0.07;
      break;
    case "Jax":
      currentOffsetY = 0.13;
      break;
    case "Lana":
      currentOffsetY = 0.17;
      break;
    case "Lindy":
      currentOffsetY = 0.12;
      break;
    case "Lou":
      currentOffsetY = 0.08;
      break;
    default:
      currentOffsetY = 0.15; // Default value if model is not found or null
  }

  return (
    <div className="fixed inset-0 w-screen h-screen bg-black">
      <FaceTracker
        onFaceLandmarks={setFaceLandmarks}
        width={dimensions.width}
        height={dimensions.height}
        modelPath={selectedModel?.path}
        modelTransform={eyewearTransform}
        scaleFactor={0.11}
        offsetY={currentOffsetY}
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
