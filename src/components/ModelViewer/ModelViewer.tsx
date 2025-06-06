"use client";

import { Suspense, useRef, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { OrthographicCamera } from "three";
import * as THREE from "three";
import gsap from "gsap";

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
  maskScale?: number;
  maskRotation?: [number, number, number];
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
  maskScale = 1,
  maskRotation = [0, 0, 0],
}: Omit<ModelViewerProps, "width" | "height">) => {
  const { scene } = useGLTF(modelPath);
  const modelRef = useRef<THREE.Object3D>(null);
  const { size, camera } = useThree();

  // Add occlusion mask
  const { scene: maskScene } = useGLTF("/mask.glb");
  const maskRef = useRef<THREE.Object3D>(null);

  // Setup occlusion mask material
  useEffect(() => {
    if (maskScene) {
      maskScene.traverse((child) => {
        if ((child as THREE.Mesh).isMesh) {
          const mesh = child as THREE.Mesh;
          mesh.material = new THREE.MeshBasicMaterial({
            colorWrite: false, // Make it visible
            depthWrite: true, // Still write depth
            color: 0xff0000, // Red color
            transparent: true, // Enable transparency
            opacity: 0.5, // Semi-transparent
          });
        }
      });
    }
  }, [maskScene]);

  useFrame(() => {
    if (modelRef.current && size.width > 0 && size.height > 0) {
      // If position is [0, 0, 0], it means no face is detected, so hide the model
      if (position[0] === 0 && position[1] === 0 && position[2] === 0) {
        modelRef.current.visible = false;
        if (maskRef.current) maskRef.current.visible = false;
        return;
      }

      // else visible
      modelRef.current.visible = true;
      if (maskRef.current) maskRef.current.visible = true;

      const landmarkDepth = position[2] ?? 0;

      const ndcX = position[0] * 2 - 1;
      const ndcY = -(position[1] * 2 - 1);

      const worldZFromLandmark = 1 - landmarkDepth * 5;

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
        targetWorldPosition.copy(vector2D);
        targetWorldPosition.z = worldZFromLandmark;
      }

      if (direction.z !== 0) {
        targetWorldPosition
          .copy(cameraPosition)
          .add(direction.multiplyScalar(t));
      }

      // Update model position
      modelRef.current.position.copy(targetWorldPosition);
      modelRef.current.position.x += offsetX;
      modelRef.current.position.y += offsetY;

      // Update mask position to match model
      if (maskRef.current) {
        maskRef.current.position.copy(modelRef.current.position);
      }

      // Apply scale
      const finalScale = scale * scaleFactor;
      modelRef.current.scale.set(finalScale, finalScale, finalScale);
      if (maskRef.current) {
        const finalMaskScale = finalScale * maskScale;
        maskRef.current.scale.set(
          finalMaskScale,
          finalMaskScale,
          finalMaskScale
        );
      }

      // Apply rotation with GSAP for smooth transitions
      const baseQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(
          baseRotation[0],
          baseRotation[1],
          baseRotation[2],
          "XYZ"
        )
      );

      const correctedYaw = -rotation[1];
      const correctedRoll = -rotation[2];
      const dynamicQuaternion = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(rotation[0], correctedYaw, correctedRoll, "XYZ")
      );

      const combinedQuaternion = new THREE.Quaternion().multiplyQuaternions(
        baseQuaternion,
        dynamicQuaternion
      );

      // Smooth rotation transition using GSAP for model
      gsap.to(modelRef.current.rotation, {
        x: combinedQuaternion.x,
        y: combinedQuaternion.y,
        z: combinedQuaternion.z,
        duration: 0.1,
      });

      if (maskRef.current) {
        // Create separate quaternion for mask rotation
        const maskBaseQuaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            baseRotation[0] + maskRotation[0],
            baseRotation[1] + maskRotation[1],
            baseRotation[2] + maskRotation[2],
            "XYZ"
          )
        );

        const maskDynamicQuaternion = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(
            rotation[0] + maskRotation[0],
            correctedYaw + maskRotation[1],
            correctedRoll + maskRotation[2],
            "XYZ"
          )
        );

        const maskCombinedQuaternion =
          new THREE.Quaternion().multiplyQuaternions(
            maskBaseQuaternion,
            maskDynamicQuaternion
          );

        // Apply separate rotation to mask
        gsap.to(maskRef.current.rotation, {
          x: maskCombinedQuaternion.x,
          y: maskCombinedQuaternion.y,
          z: maskCombinedQuaternion.z,
          duration: 0.1,
        });
      }
    }
  });

  if (!scene) return null;
  return (
    <>
      <primitive ref={modelRef} object={scene} />
      {maskScene && <primitive ref={maskRef} object={maskScene} />}
    </>
  );
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
