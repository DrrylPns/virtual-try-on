"use client";

import { useState, useEffect } from "react";
import { FaceTracker } from "@/components/FaceTracker/FaceTracker";

interface Model {
  id: string;
  name: string;
  path: string;
}

const AVAILABLE_MODELS: Model[] = [
  { id: "bennett", name: "Glass", path: "/models/glass-center.glb" },
  { id: "cove", name: "Cove", path: "/models/Cove/test3.glb" },
  { id: "elba", name: "Elba", path: "/models/Elba/8.000.glb" },
  { id: "jax", name: "Jax", path: "/models/Jax/5.000.glb" },
  { id: "lana", name: "Lana", path: "/models/Lana/4.000.glb" },
  { id: "leto", name: "Leto", path: "/models/Leto/3.002.glb" },
  { id: "lindy", name: "Lindy", path: "/models/Lindy/6.003.glb" },
  { id: "lou", name: "Lou", path: "/models/Lou/7.003.glb" },
];

function getEyewearTransform(landmarks: any): {
  position: [number, number, number];
  scale: number;
  rotation: [number, number, number];
} | null {
  if (!landmarks || !Array.isArray(landmarks) || landmarks.length < 468)
    return null;
  const leftEye = landmarks[33];
  const rightEye = landmarks[263];
  const noseBridge = landmarks[6];

  const center: [number, number, number] = [
    (leftEye.x + rightEye.x) / 2,
    (leftEye.y + rightEye.y) / 2,
    (leftEye.z + rightEye.z) / 2,
  ];

  const dx = rightEye.x - leftEye.x;
  const dy = rightEye.y - leftEye.y;
  const dz = rightEye.z - leftEye.z;
  const eyeDist = Math.sqrt(dx * dx + dy * dy + dz * dz);

  const eyeY = (leftEye.y + rightEye.y) / 2;
  const pitchAngle = Math.atan2(noseBridge.y - eyeY, eyeDist);

  const yawAngle = Math.atan2(dy, dx);

  return {
    position: center,
    scale: eyeDist / 0.08,
    rotation: [pitchAngle, 0, yawAngle],
  };
}

export default function Home() {
  const [selectedModel, setSelectedModel] = useState<Model>(
    AVAILABLE_MODELS[0]
  );
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
        // Adjust scaleFactor and offsetY here to fine-tune model size and vertical position
        scaleFactor={0.3} // Example: makes the model 20% smaller
        // offsetY={320} // Example: shifts the model down by 10 pixels
      />
      {/* Model selection slider */}
      <div className="absolute bottom-0 left-0 w-full flex overflow-x-auto bg-black/60 py-3 px-2 gap-3 z-50">
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
      </div>
    </div>
  );
}
