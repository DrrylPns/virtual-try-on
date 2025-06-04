"use client";

import { Suspense, useRef, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { OrthographicCamera } from "three";
import * as THREE from "three";

interface ModelViewerProps {
  modelPath: string;
  position?: [number, number, number]; // normalized
  scale?: number;
  rotation?: [number, number, number];
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  scaleFactor?: number;
  baseRotation?: [number, number, number]; // Add base rotation prop
}

const ModelInternal = ({
  modelPath,
  position = [0.5, 0.5, 0],
  scale = 1,
  rotation = [0, 0, 0],
  offsetX = 0,
  offsetY = 0,
  offsetZ = 0,
  scaleFactor = 1,
  baseRotation = [0, 0, 0],
}: Omit<ModelViewerProps, "width" | "height">) => {
  const { scene } = useGLTF(modelPath);
  const modelRef = useRef<THREE.Object3D>(null);
  const { size, camera } = useThree();

  //   // Add screenToWorld function
  //   const screenToWorld = (
  //     x: number,
  //     y: number,
  //     width: number,
  //     height: number
  //   ) => {
  //     const normalizedX = (x / width) * 2 - 1;
  //     const normalizedY = -(y / height) * 2 + 1;
  //     const vector = new THREE.Vector3(normalizedX, normalizedY, 0.5); // z = 0.5 (middle of the scene)
  //     vector.unproject(camera);
  //     return vector;
  //   };

  useFrame(() => {
    if (modelRef.current && size.width > 0 && size.height > 0) {
      // If position is [0, 0, 0], it means no face is detected, so hide the model
      if (position[0] === 0 && position[1] === 0 && position[2] === 0) {
        modelRef.current.visible = false;
        return;
      }
      modelRef.current.visible = true;

      // Map normalized position [0,1] to world coordinates
      // We need to convert from the normalized face mesh coordinates to a 3D position
      // This mapping depends on your camera's FOV and distance from the face.
      // Let's assume the face is around Z=0 in world space, and the camera is at Z=5.
      // We can scale the normalized X and Y based on the Z distance and the canvas size.
      const worldX = (position[0] - 0.5) * size.width * 0.01; // Scale factor, adjust as needed
      const worldY = -(position[1] - 0.5) * size.height * 0.01; // Invert Y and scale
      const worldZ = (position[2] ?? 0) * 5 - 2; // Scale Z and add an offset

      // Use a THREE.Vector3 and .copy for robust positioning
      const worldPosition = new THREE.Vector3(
        worldX + offsetX,
        worldY + offsetY,
        worldZ + offsetZ
      );
      modelRef.current.position.copy(worldPosition);

      // Apply scale based on eye distance (passed as scale prop) and scaleFactor
      modelRef.current.scale.set(
        scale * scaleFactor,
        scale * scaleFactor,
        scale * scaleFactor
      );

      // Apply 3D rotation using Euler angles and setRotationFromEuler
      // Combine face rotation with base rotation for initial alignment
      const combinedRotation = new THREE.Euler(
        rotation[0] + baseRotation[0], // pitch + base_pitch
        rotation[1] + baseRotation[1], // yaw + base_yaw
        rotation[2] + baseRotation[2], // roll + base_roll
        "XYZ" // Ensure correct order
      );

      modelRef.current.setRotationFromEuler(combinedRotation);

      // Debugging logs (keep these for now)
      console.log("Applied Position:", modelRef.current.position);
      console.log("Applied Rotation:", modelRef.current.rotation);
      console.log("Applied Scale:", modelRef.current.scale);
    }
  });

  if (!scene) return null;
  return <primitive ref={modelRef} object={scene} />;
};

// New component to handle canvas and camera resizing
const Resizer = () => {
  const { size, gl, camera } = useThree();

  useEffect(() => {
    const container = gl.domElement.parentElement; // Get the parent div of the canvas
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        gl.setSize(width, height); // Set renderer size

        if (camera instanceof OrthographicCamera) {
          camera.left = 0;
          camera.right = width;
          camera.top = height;
          camera.bottom = 0;
          camera.position.set(width / 2, height / 2, camera.position.z); // Keep existing Z
          camera.updateProjectionMatrix();
        }
      }
    });

    observer.observe(container);

    return () => {
      observer.unobserve(container);
    };
  }, [gl, camera]); // Dependencies

  return null;
};

export const ModelViewer: React.FC<
  Omit<ModelViewerProps, "width" | "height">
> = (props) => {
  const { modelPath } = props;

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        dpr={window.devicePixelRatio}
        camera={{
          fov: 50,
          near: 0.1,
          far: 1000,
          position: [0, 0, 5],
        }}
        style={{
          background: "transparent",
          width: "100%",
          height: "100%",
          display: "block",
        }}
        gl={{ preserveDrawingBuffer: true }}
        frameloop="always"
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <Suspense fallback={null}>
          {modelPath && <ModelInternal {...props} />}
        </Suspense>
        <Resizer />
      </Canvas>
    </div>
  );
};
