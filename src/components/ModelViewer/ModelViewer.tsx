"use client";

import { Suspense, useRef, useEffect, useState } from "react";
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

      // Map normalized position [0,1] to world coordinates using camera projection
      // Create a Vector3 from the normalized position (x, y, and z from landmarks)
      // Adjust Z to place the model at an appropriate depth relative to the face/camera.
      // The normalized Z from landmarks is typically relative to the face bounding box, not world units.
      // We might need to scale or offset it, or ignore it and use a fixed Z or a Z based on eye distance.

      // Let's use the normalized X and Y, and assume a relative Z based on the position[2] landmark Z,
      // scaled and potentially offset to be in a reasonable range for the 3D scene.
      // position[2] from the landmarks gives a relative depth. Let's scale it.
      const landmarkDepth = position[2] ?? 0; // Use landmark Z, default to 0 if null/undefined

      // Convert normalized 2D position (from 0 to 1) to NDC (Normalized Device Coordinates, from -1 to 1)
      const ndcX = position[0] * 2 - 1;
      const ndcY = -(position[1] * 2 - 1); // Invert Y for screen coordinates (0,0 top-left) vs NDC (0,0 center)

      // Adjusted mapping: map landmarkDepth (typically centered around 0) to a world Z range (e.g., 0 to 2)
      // This will need tuning based on observed landmarkDepth values
      const worldZFromLandmark = 1 - landmarkDepth * 5; // Example: 0 depth -> Z=1, 0.2 depth -> Z=0, -0.2 depth -> Z=2

      // Create a vector in NDC space with the calculated world Z
      const vector = new THREE.Vector3(ndcX, ndcY, 0); // Start with Z=0 in NDC, will be unprojected

      // Unproject the vector from screen space (NDC) to world space
      // We need to provide a Z coordinate for the unproject function. This Z is in the range [0, 1], representing the depth within the view frustum.
      // 0 is the near plane, 1 is the far plane. This is not the same as our worldZFromLandmark.
      // Let's use the Z coordinate from the position prop directly, assuming it's already somewhat scaled for our scene.
      // Or, we can use the unproject function's Z parameter to place the point on a specific plane relative to the camera.

      // Let's use the unproject function with a fixed Z (e.g., 0.5, mid-frustum) and then adjust the world Z separately.
      const vector2D = new THREE.Vector3(ndcX, ndcY, 0.5); // Use 0.5 for Z to unproject onto the mid-plane
      vector2D.unproject(camera);

      // The unprojected vector's X and Y are now in world space on the Z=0.5 frustum plane.
      // We need to adjust their depth to be at the desired world Z (worldZFromLandmark).
      // We can do this by interpolating between the camera position and the unprojected point.

      const cameraPosition = new THREE.Vector3().copy(camera.position);
      const targetWorldPosition = new THREE.Vector3();

      // Calculate the direction vector from the camera to the unprojected point
      const direction = new THREE.Vector3()
        .copy(vector2D)
        .sub(cameraPosition)
        .normalize();

      // Calculate the distance along the direction vector to reach the desired worldZFromLandmark
      // If camera.position.z is different from worldZFromLandmark, we need to find the point on the ray
      // cameraPosition + t * direction where the Z component is worldZFromLandmark.
      // cameraPosition.z + t * direction.z = worldZFromLandmark
      // t = (worldZFromLandmark - cameraPosition.z) / direction.z

      let t = 0;
      if (direction.z !== 0) {
        t = (worldZFromLandmark - cameraPosition.z) / direction.z;
      } else {
        // If direction.z is 0, the ray is parallel to the XY plane. We might need a different approach or the Z mapping is off.
        console.warn(
          "Direction Z is zero, cannot calculate intersection with Z plane."
        );
        // Fallback: just use the unprojected X and Y and the calculated worldZFromLandmark
        targetWorldPosition.copy(vector2D);
        targetWorldPosition.z = worldZFromLandmark;
      }

      if (direction.z !== 0) {
        // Calculate the target world position
        targetWorldPosition
          .copy(cameraPosition)
          .add(direction.multiplyScalar(t));
      }

      // Apply position using copy, adding offsets
      modelRef.current.position.copy(targetWorldPosition);
      modelRef.current.position.x += offsetX;
      modelRef.current.position.y += offsetY;
      // modelRef.current.position.z += offsetZ; // offsetZ is already included in targetWorldPosition via worldZFromLandmark mapping

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
  const [dpr, setDpr] = useState(1);

  useEffect(() => {
    setDpr(window.devicePixelRatio);
  }, []);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <Canvas
        dpr={dpr}
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
