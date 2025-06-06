"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { OrthographicCamera } from "three";
import * as THREE from "three";

interface ModelViewerProps {
  modelPath: string;
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
  offsetX?: number;
  offsetY?: number;
  offsetZ?: number;
  scaleFactor?: number;
  baseRotation?: [number, number, number];
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

      // else visible
      modelRef.current.visible = true;

      const landmarkDepth = position[2] ?? 0;

      const ndcX = position[0] * 2 - 1;
      const ndcY = -(position[1] * 2 - 1);

      const worldZFromLandmark = 1 - landmarkDepth * 5;

      // const vector = new THREE.Vector3(ndcX, ndcY, 0);

      const vector2D = new THREE.Vector3(ndcX, ndcY, 0.5);
      vector2D.unproject(camera);

      const cameraPosition = new THREE.Vector3().copy(camera.position);
      const targetWorldPosition = new THREE.Vector3();

      const direction = new THREE.Vector3()
        .copy(vector2D)
        .sub(cameraPosition)
        .normalize();

      let t = 0;
      if (direction.z !== 0) {
        t = (worldZFromLandmark - cameraPosition.z) / direction.z;
      } else {
        // console.warn(
        //   "Direction Z is zero, cannot calculate intersection with Z plane."
        // );

        targetWorldPosition.copy(vector2D);
        targetWorldPosition.z = worldZFromLandmark;
      }

      if (direction.z !== 0) {
        targetWorldPosition
          .copy(cameraPosition)
          .add(direction.multiplyScalar(t));
      }

      modelRef.current.position.copy(targetWorldPosition);
      modelRef.current.position.x += offsetX;
      modelRef.current.position.y += offsetY;

      modelRef.current.scale.set(
        scale * scaleFactor,
        scale * scaleFactor,
        scale * scaleFactor
      );

      const baseQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          baseRotation[0],
          baseRotation[1],
          baseRotation[2],
          "XYZ"
        )
      );
      const correctedYaw = rotation[1];
      const correctedRoll = rotation[2];
      const dynamicQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotation[0], correctedYaw, correctedRoll, "XYZ")
      );

      const combinedQuaternion = new THREE.Quaternion().multiplyQuaternions(
        baseQuaternion,
        dynamicQuaternion
      );

      modelRef.current.setRotationFromQuaternion(combinedQuaternion);

      // Debugging logs
      // console.log("Applied Position:", modelRef.current.position);
      // console.log("Applied Rotation:", modelRef.current.rotation);
      // console.log("Applied Scale:", modelRef.current.scale);
      // console.log("Face Yaw:", faceYaw);
      // console.log("Clipping Planes:", clippingPlanes);
    }
  });

  if (!scene) return null;
  return <primitive ref={modelRef} object={scene} />;
};

// component to handle canvas and camera resizing
const Resizer = () => {
  const { gl, camera } = useThree();

  useEffect(() => {
    const container = gl.domElement.parentElement;
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
  }, [gl, camera]);

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
        <ambientLight intensity={3} />
        <directionalLight position={[10, 10, 5]} intensity={3} />
        <Suspense fallback={null}>
          {modelPath && <ModelInternal {...props} />}
        </Suspense>
        <Resizer />
      </Canvas>
    </div>
  );
};
