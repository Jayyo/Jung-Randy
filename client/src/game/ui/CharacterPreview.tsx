// ===== CHARACTER PREVIEW COMPONENT =====
// Renders a 3D character model to a 2D canvas for use in UI
// Uses offscreen rendering to avoid WebGL context limits

import { useEffect, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

interface CharacterPreviewProps {
  color: string;
  size?: number;
  characterId: string;
}

// Cache for rendered previews to avoid re-rendering
const previewCache = new Map<string, string>();

// Shared resources for rendering (single WebGL context)
let sharedRenderer: THREE.WebGLRenderer | null = null;
let sharedScene: THREE.Scene | null = null;
let sharedCamera: THREE.PerspectiveCamera | null = null;
let sharedModel: THREE.Group | null = null;
let isModelLoaded = false;
let modelLoadPromise: Promise<void> | null = null;

// Initialize shared rendering resources
function initSharedResources() {
  if (sharedRenderer) return;

  // Create offscreen renderer
  sharedRenderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: true,
  });
  sharedRenderer.setSize(256, 256);
  sharedRenderer.setClearColor(0x000000, 0);

  // Create scene
  sharedScene = new THREE.Scene();

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  sharedScene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
  directionalLight.position.set(2, 4, 3);
  sharedScene.add(directionalLight);

  const backLight = new THREE.DirectionalLight(0xffffff, 0.3);
  backLight.position.set(-2, 2, -3);
  sharedScene.add(backLight);

  // Create camera (positioned to capture front view)
  sharedCamera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  sharedCamera.position.set(0, 1.2, 3);
  sharedCamera.lookAt(0, 0.8, 0);
}

// Load the base model
async function loadBaseModel(): Promise<void> {
  if (isModelLoaded) return;
  if (modelLoadPromise) return modelLoadPromise;

  modelLoadPromise = new Promise((resolve, reject) => {
    const loader = new GLTFLoader();
    loader.load(
      '/assets/characters/stylized_base.glb',
      (gltf) => {
        sharedModel = gltf.scene.clone();

        // Center and scale the model
        const box = new THREE.Box3().setFromObject(sharedModel);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());

        // Scale to fit nicely in frame
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;
        sharedModel.scale.setScalar(scale);

        // Center horizontally, keep feet on ground
        sharedModel.position.x = -center.x * scale;
        sharedModel.position.y = -box.min.y * scale;
        sharedModel.position.z = -center.z * scale;

        isModelLoaded = true;
        resolve();
      },
      undefined,
      (error) => {
        console.error('Failed to load character model:', error);
        reject(error);
      }
    );
  });

  return modelLoadPromise;
}

// Render a preview with specific color
function renderPreview(color: string): string {
  if (!sharedRenderer || !sharedScene || !sharedCamera || !sharedModel) {
    return '';
  }

  // Clone the model for this render
  const modelClone = sharedModel.clone(true);

  // Apply color tint to all meshes
  modelClone.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      const originalMaterial = child.material as THREE.MeshStandardMaterial;
      const newMaterial = originalMaterial.clone();

      // Mix original color with tint color
      const tintColor = new THREE.Color(color);
      if (newMaterial.map) {
        // If has texture, apply color as emissive tint
        newMaterial.emissive = tintColor;
        newMaterial.emissiveIntensity = 0.3;
      } else {
        // If no texture, set color directly
        newMaterial.color = tintColor;
      }

      child.material = newMaterial;
    }
  });

  // Add to scene
  sharedScene.add(modelClone);

  // Render
  sharedRenderer.render(sharedScene, sharedCamera);

  // Get data URL
  const dataUrl = sharedRenderer.domElement.toDataURL('image/png');

  // Remove from scene
  sharedScene.remove(modelClone);

  // Dispose cloned materials
  modelClone.traverse((child) => {
    if (child instanceof THREE.Mesh && child.material) {
      (child.material as THREE.Material).dispose();
    }
  });

  return dataUrl;
}

// Hook to get character preview image
export function useCharacterPreview(characterId: string, color: string): string | null {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const cacheKey = `${characterId}-${color}`;

  useEffect(() => {
    // Check cache first
    if (previewCache.has(cacheKey)) {
      setPreviewUrl(previewCache.get(cacheKey)!);
      return;
    }

    // Initialize and render
    initSharedResources();

    loadBaseModel().then(() => {
      const url = renderPreview(color);
      if (url) {
        previewCache.set(cacheKey, url);
        setPreviewUrl(url);
      }
    }).catch(console.error);
  }, [cacheKey, color]);

  return previewUrl;
}

// Component that displays the preview
export function CharacterPreview({ color, size = 60, characterId }: CharacterPreviewProps) {
  const previewUrl = useCharacterPreview(characterId, color);

  if (!previewUrl) {
    // Loading placeholder - colored circle
    return (
      <div
        style={{
          width: size,
          height: size,
          backgroundColor: color,
          borderRadius: '50%',
          opacity: 0.7,
        }}
      />
    );
  }

  return (
    <img
      src={previewUrl}
      alt="Character preview"
      style={{
        width: size,
        height: size,
        objectFit: 'contain',
      }}
    />
  );
}

// Preload all character previews
export function preloadCharacterPreviews(characters: Array<{ id: string; color: string }>) {
  initSharedResources();

  loadBaseModel().then(() => {
    characters.forEach(({ id, color }) => {
      const cacheKey = `${id}-${color}`;
      if (!previewCache.has(cacheKey)) {
        const url = renderPreview(color);
        if (url) {
          previewCache.set(cacheKey, url);
        }
      }
    });
  }).catch(console.error);
}

// Async variant so callers can await preload completion
export async function preloadCharacterPreviewsAsync(characters: Array<{ id: string; color: string }>): Promise<void> {
  initSharedResources();
  await loadBaseModel();
  characters.forEach(({ id, color }) => {
    const cacheKey = `${id}-${color}`;
    if (!previewCache.has(cacheKey)) {
      const url = renderPreview(color);
      if (url) {
        previewCache.set(cacheKey, url);
      }
    }
  });
}
