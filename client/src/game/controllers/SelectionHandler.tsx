// ===== SELECTION HANDLER (Multi-select + RTS controls) =====
import { useRef, useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { CharacterData } from '../types';
import {
  BRIDGE_HEIGHT,
  BOSS_PLATFORM_X,
  BRIDGE_ENTRY_X,
  BRIDGE_EXIT_X,
  INNER_BOUND,
  BOSS_PLATFORM_HALF_SIZE,
} from '../constants';
import { calculatePath, clampToWalkableArea } from '../utils';

interface SelectionHandlerProps {
  selectedCharacterIds: Set<string>;
  setSelectedCharacterIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  characters: CharacterData[];
  selectionBox: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>>;
  onMoveCommand: (position: THREE.Vector3) => void;
  onStopCommand: () => void;
  onSaveGroup: (groupNumber: number) => void;
  onSelectGroup: (groupNumber: number) => void;
  onGroundClick?: () => void;
}

export function SelectionHandler({
  selectedCharacterIds,
  setSelectedCharacterIds,
  characters,
  selectionBox,
  setSelectionBox,
  onMoveCommand,
  onStopCommand,
  onSaveGroup,
  onSelectGroup,
  onGroundClick
}: SelectionHandlerProps) {
  const { camera, raycaster, gl } = useThree();
  const isDraggingRef = useRef(false);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const clickStartedOnCanvasRef = useRef(false);

  useEffect(() => {
    const canvas = gl.domElement;

    // Right-click: Move selected characters
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();

      if (selectedCharacterIds.size === 0) return;

      const mouse = new THREE.Vector2(
        (e.clientX / window.innerWidth) * 2 - 1,
        -(e.clientY / window.innerHeight) * 2 + 1
      );

      raycaster.setFromCamera(mouse, camera);

      // Multi-plane raycasting: check ground and bridge height
      const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
      const bridgePlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BRIDGE_HEIGHT);

      const groundIntersect = new THREE.Vector3();
      const bridgeIntersect = new THREE.Vector3();

      const hasGroundHit = raycaster.ray.intersectPlane(groundPlane, groundIntersect);
      const hasBridgeHit = raycaster.ray.intersectPlane(bridgePlane, bridgeIntersect);

      // Check if bridge intersection is valid (within bridge bounds)
      const bridgeStartX = BRIDGE_ENTRY_X;
      const bridgeEndX = BRIDGE_EXIT_X;
      const bridgeHalfWidth = 1.0;

      let intersection: THREE.Vector3 | null = null;

      if (hasBridgeHit &&
          bridgeIntersect.x >= bridgeStartX &&
          bridgeIntersect.x <= bridgeEndX &&
          Math.abs(bridgeIntersect.z) <= bridgeHalfWidth) {
        intersection = bridgeIntersect;
        intersection.y = BRIDGE_HEIGHT;
      } else if (hasGroundHit) {
        intersection = groundIntersect;
      }

      if (intersection) {
        // Define walkable areas
        const innerBound = INNER_BOUND;
        const bossPlatformHalfSize = BOSS_PLATFORM_HALF_SIZE;

        // Check which area the click is in
        const isInMainArea = Math.abs(intersection.x) <= innerBound && Math.abs(intersection.z) <= innerBound;
        const isOnBridge = intersection.x >= bridgeStartX &&
                          intersection.x <= bridgeEndX &&
                          Math.abs(intersection.z) <= bridgeHalfWidth;
        const isInBossArea = Math.abs(intersection.x - BOSS_PLATFORM_X) <= bossPlatformHalfSize &&
                            Math.abs(intersection.z) <= bossPlatformHalfSize;

        let targetPoint: THREE.Vector3;

        if (isInMainArea || isOnBridge || isInBossArea) {
          targetPoint = intersection.clone();
        } else {
          targetPoint = clampToWalkableArea(intersection);
        }

        // Trigger move indicator effect at the target position
        onMoveCommand(targetPoint.clone());

        // Move all selected characters using waypoint system
        const selectedChars = characters.filter(c => selectedCharacterIds.has(c.id));
        const count = selectedChars.length;

        selectedChars.forEach((char, index) => {
          const offsetAngle = (index / count) * Math.PI * 2;
          const offsetDist = count > 1 ? 0.5 : 0;
          const finalTarget = targetPoint.clone();
          finalTarget.x += Math.cos(offsetAngle) * offsetDist;
          finalTarget.z += Math.sin(offsetAngle) * offsetDist;

          // Calculate path with waypoints for cross-zone movement
          const path = calculatePath(char.position, finalTarget);
          char.waypointQueue = path;
          char.targetPosition = path[0] || null;
        });
      }
    };

    // Left-click drag: Selection box
    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return; // Only left click
      clickStartedOnCanvasRef.current = true;

      dragStartRef.current = { x: e.clientX, y: e.clientY };
      isDraggingRef.current = false;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStartRef.current) return;

      const dx = e.clientX - dragStartRef.current.x;
      const dy = e.clientY - dragStartRef.current.y;

      // Start drag if moved enough
      if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
        isDraggingRef.current = true;
        setSelectionBox({
          start: dragStartRef.current,
          end: { x: e.clientX, y: e.clientY }
        });
      }
    };

    const handleMouseUp = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if (!clickStartedOnCanvasRef.current) return;

      if (isDraggingRef.current && selectionBox) {
        // Select characters within the box
        const box = {
          left: Math.min(selectionBox.start.x, selectionBox.end.x),
          right: Math.max(selectionBox.start.x, selectionBox.end.x),
          top: Math.min(selectionBox.start.y, selectionBox.end.y),
          bottom: Math.max(selectionBox.start.y, selectionBox.end.y)
        };

        const newSelection = new Set<string>();

        characters.forEach(char => {
          // Project character position to screen
          const pos = char.position.clone();
          pos.project(camera);

          const screenX = (pos.x + 1) / 2 * window.innerWidth;
          const screenY = (-pos.y + 1) / 2 * window.innerHeight;

          if (screenX >= box.left && screenX <= box.right &&
              screenY >= box.top && screenY <= box.bottom) {
            newSelection.add(char.id);
          }
        });

        if (e.shiftKey) {
          // Add to existing selection
          setSelectedCharacterIds(prev => new Set([...prev, ...newSelection]));
        } else {
          setSelectedCharacterIds(newSelection);
        }
      } else if (!isDraggingRef.current) {
        // Simple click on empty space - deselect all
        const rect = canvas.getBoundingClientRect();
        const mouse = new THREE.Vector2(
          ((e.clientX - rect.left) / rect.width) * 2 - 1,
          -((e.clientY - rect.top) / rect.height) * 2 + 1
        );

        raycaster.setFromCamera(mouse, camera);

        // Check if clicked on a character (handled by Character component)
        // If not, clear selection
        const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
        const intersection = new THREE.Vector3();
        if (raycaster.ray.intersectPlane(plane, intersection)) {
          // Check if any character is at this position
          const clickedChar = characters.find(c => {
            const dist = c.position.distanceTo(intersection);
            return dist < 1; // Within click range
          });

          if (!clickedChar && !e.shiftKey) {
            setSelectedCharacterIds(new Set());
            onGroundClick?.();
          }
        }
      }

      dragStartRef.current = null;
      isDraggingRef.current = false;
      clickStartedOnCanvasRef.current = false;
      setSelectionBox(null);
    };

    // Keyboard: S key to stop, Ctrl+number to save group, number to select group
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't handle if typing in input/textarea
      if (document.activeElement?.tagName === 'INPUT' || 
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      // S key: Stop selected characters
      if (e.key === 'S' || e.key === 's') {
        if (selectedCharacterIds.size > 0) {
          e.preventDefault();
          onStopCommand();
        }
        return;
      }

      // Number keys (1-9)
      const numberKey = parseInt(e.key);
      if (numberKey >= 1 && numberKey <= 9) {
        if (e.ctrlKey || e.metaKey) {
          // Ctrl/Cmd + number: Save current selection to group
          e.preventDefault();
          onSaveGroup(numberKey);
        } else {
          // Number only: Select group
          e.preventDefault();
          onSelectGroup(numberKey);
        }
      }
    };

    canvas.addEventListener('contextmenu', handleContextMenu);
    canvas.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      canvas.removeEventListener('contextmenu', handleContextMenu);
      canvas.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
    }, [selectedCharacterIds, setSelectedCharacterIds, characters, camera, raycaster, gl, selectionBox, setSelectionBox, onMoveCommand, onStopCommand, onSaveGroup, onSelectGroup, onGroundClick]);

  return null;
}
