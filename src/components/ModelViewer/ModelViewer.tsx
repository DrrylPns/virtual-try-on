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
  const { size, camera } = useThree(); // Get camera from useThree

  // Add screenToWorld function
  const screenToWorld = (
    x: number,
    y: number,
    width: number,
    height: number
  ) => {
    const normalizedX = (x / width) * 2 - 1;
    const normalizedY = -(y / height) * 2 + 1;
    const vector = new THREE.Vector3(normalizedX, normalizedY, 0.5); // z = 0.5 (middle of the scene)
    vector.unproject(camera);
    return vector;
  };

  useFrame(() => {
    if (modelRef.current && size.width > 0 && size.height > 0) {
      // If position is [0, 0, 0], it means no face is detected, so hide the model
      if (position[0] === 0 && position[1] === 0 && position[2] === 0) {
        modelRef.current.visible = false;
        return;
      }

      // Show the model if it was previously hidden
      modelRef.current.visible = true;

      // Map normalized position to pixel coordinates using actual canvas size
      const x = position[0] * size.width + offsetX;
      // Invert Y and apply offset for orthographic camera (0 at bottom, height at top)
      const y = position[1] * size.height + offsetY;
      const z = offsetZ; // Use offsetZ for depth adjustment

      // Get world position using screenToWorld
      const worldPosition = screenToWorld(x, y, size.width, size.height);

      // Apply position using copy
      modelRef.current.position.copy(worldPosition);

      // Apply scale and rotation as before
      modelRef.current.scale.set(
        scale * scaleFactor,
        scale * scaleFactor,
        scale * scaleFactor
      );
      modelRef.current.rotation.set(rotation[0], rotation[1], rotation[2]);
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
        dpr={window.devicePixelRatio} // Use device pixel ratio for better quality
        orthographic
        camera={{
          // Camera will be set up by the Resizer component
          fov: 50, // Typical field of view for a perspective camera
          near: -750, // Near clipping plane
          far: 1000, // Far clipping plane
          zoom: 1,
          position: [0, 0, 5], // Initial camera position (will be updated)
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
        <Resizer /> {/* Add the Resizer component here */}
      </Canvas>
    </div>
  );
};
