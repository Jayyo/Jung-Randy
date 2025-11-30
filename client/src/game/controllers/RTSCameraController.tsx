// ===== RTS CAMERA CONTROLLER =====
import { useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';

export function RTSCameraController() {
  const { camera, gl } = useThree();
  const isPanningRef = useRef(false);
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef(new THREE.Vector3(0, 0, 0)); // Camera look target

  // Zoom control
  const targetDistance = useRef(15); // Distance from target
  const minDistance = 8;
  const maxDistance = 50;

  // Angle control (Ctrl+wheel)
  const targetAngle = useRef(50); // Angle in degrees (0=horizontal, 90=top-down)
  const currentAngle = useRef(50);
  const minAngle = 10; // Almost horizontal
  const maxAngle = 85; // Almost top-down

  // Current distance for smooth lerp
  const currentDistance = useRef(15);

  // Smooth zoom and angle animation
  useFrame(() => {
    let needsUpdate = false;

    // Lerp distance
    if (Math.abs(currentDistance.current - targetDistance.current) > 0.01) {
      currentDistance.current += (targetDistance.current - currentDistance.current) * 0.1;
      needsUpdate = true;
    }

    // Lerp angle
    if (Math.abs(currentAngle.current - targetAngle.current) > 0.1) {
      currentAngle.current += (targetAngle.current - currentAngle.current) * 0.1;
      needsUpdate = true;
    }

    if (needsUpdate) {
      // Calculate camera position based on angle and distance
      const angleRad = (currentAngle.current * Math.PI) / 180;
      const y = Math.sin(angleRad) * currentDistance.current;
      const z = Math.cos(angleRad) * currentDistance.current;

      camera.position.y = y;
      camera.position.z = targetRef.current.z + z;
      camera.position.x = targetRef.current.x;

      camera.lookAt(targetRef.current);
    }
  });

  useEffect(() => {
    const canvas = gl.domElement;

    // Wheel: Zoom in/out or Ctrl+Wheel: Angle adjustment
    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      if (e.ctrlKey) {
        // Ctrl+Wheel: Adjust angle (reversed direction)
        const angleSpeed = 5;
        const delta = e.deltaY > 0 ? angleSpeed : -angleSpeed;
        targetAngle.current = Math.max(minAngle, Math.min(maxAngle, targetAngle.current + delta));
      } else {
        // Normal wheel: Zoom
        const zoomSpeed = 2;
        const delta = e.deltaY > 0 ? zoomSpeed : -zoomSpeed;
        targetDistance.current = Math.max(minDistance, Math.min(maxDistance, targetDistance.current + delta));
      }
    };

    // Middle mouse: Pan
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 1) { // Middle click
        e.preventDefault();
        isPanningRef.current = true;
        lastMouseRef.current = { x: e.clientX, y: e.clientY };
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isPanningRef.current) return;

      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;

      // Pan speed scales with distance for consistent feel
      const panSpeed = 0.02 * (currentDistance.current / 15);

      // Move target, camera follows via useFrame
      targetRef.current.x -= dx * panSpeed;
      targetRef.current.z -= dy * panSpeed;

      // Also move camera immediately for responsive feel
      camera.position.x -= dx * panSpeed;
      camera.position.z -= dy * panSpeed;

      camera.lookAt(targetRef.current);

      lastMouseRef.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button === 1) {
        isPanningRef.current = false;
      }
    };

    // Prevent context menu on middle click
    const handleContextMenuPrevention = (e: MouseEvent) => {
      if (e.button === 1) e.preventDefault();
    };

    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    canvas.addEventListener('auxclick', handleContextMenuPrevention);

    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      canvas.removeEventListener('auxclick', handleContextMenuPrevention);
    };
  }, [camera, gl]);

  // Set initial camera look direction
  useEffect(() => {
    camera.lookAt(targetRef.current);
  }, [camera]);

  return null;
}
