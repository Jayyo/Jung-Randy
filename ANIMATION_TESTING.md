# Animation Testing Guide

## Test Routes

### 1. Basic Test Scene (Current Implementation)
```
http://localhost:3000/test
```

Features:
- Monster GLB animation with path movement
- Spawns every 2 seconds
- Current implementation with fixes applied

### 2. Seamless Animation Example (Full Demo)
```
http://localhost:3000/test-seamless
```

Features:
- Three different looping methods side-by-side
- Standard loop (recommended)
- Speed-adjusted loop (1.5x)
- CrossFade loop (advanced)
- Full documentation overlay

## Quick Start

```bash
# Start dev server
cd client
npm run dev

# Visit test routes
# http://localhost:3000/test
# http://localhost:3000/test-seamless
```

## What to Look For

### Before Fix
- ❌ Character "snaps" or "jumps" at loop point
- ❌ Visible teleport back to start pose
- ❌ Stuttering at transition

### After Fix
- ✅ Smooth continuous animation
- ✅ No visible snap/jump
- ✅ Natural loop transition

## File Structure

```
client/src/game/3d-test/
├── SimpleTestScene.tsx           # Working example with fixes
├── SeamlessAnimationExample.tsx  # Comprehensive demo
└── MIXAMO_ANIMATION_GUIDE.md     # Full documentation
```

## Key Changes Made

### SimpleTestScene.tsx
```typescript
// BEFORE
action.setLoop(THREE.LoopRepeat, Infinity);
action.play();

// AFTER
action.setLoop(THREE.LoopRepeat, Infinity);
action.clampWhenFinished = false; // Critical!
action.enabled = true;

// Trim last frame
const trimAmount = 0.01;
if (clip.duration > trimAmount) {
  clip.duration = clip.duration - trimAmount;
}

action.play();
```

## Mixamo Export Checklist

When downloading from Mixamo:

- [ ] Format: **GLB (Binary)**
- [ ] Skin: **With Skin**
- [ ] FPS: **30** (or 60 for smoother)
- [ ] Keyframe Reduction: **None** (for loops)
- [ ] In Place: Check if controlling movement separately

## Common Issues & Solutions

| Issue | Check | Solution |
|-------|-------|----------|
| Animation doesn't play | Console errors | Verify GLB file path is correct |
| Snap at loop point | Visual inspection | Increase trim amount (0.01 → 0.05) |
| Multiple instances broken | Clone issues | Ensure using SkeletonUtils.clone() |
| Animation frozen | Matrix updates | Set matrixAutoUpdate = true |

## Performance Notes

- Each monster instance uses ~2-3MB RAM
- AnimationMixer is lightweight (~1ms per instance)
- Recommend max 100 simultaneous animated models
- Use object pooling for better performance

## Next Steps

1. Test both routes to compare before/after
2. Verify smooth looping with your specific GLB files
3. Adjust trim amount if needed (0.01 - 0.05)
4. Apply same pattern to character animations

## Integration Example

To use in your game:

```typescript
// In your mob/character component
import { useRef, useEffect, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import { SkeletonUtils } from 'three-stdlib';
import * as THREE from 'three';

function YourAnimatedCharacter({ modelPath }: { modelPath: string }) {
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const { scene, animations } = useGLTF(modelPath);

  const clonedScene = useMemo(() => {
    const clone = SkeletonUtils.clone(scene);
    clone.traverse((child) => {
      child.matrixAutoUpdate = true;
      child.frustumCulled = false;
    });
    return clone;
  }, [scene]);

  useEffect(() => {
    if (!clonedScene || animations.length === 0) return;

    const mixer = new THREE.AnimationMixer(clonedScene);
    mixerRef.current = mixer;

    const clip = animations[0];
    const action = mixer.clipAction(clip);

    // Apply fixes
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.enabled = true;

    // Trim for seamless loop
    if (clip.duration > 0.01) {
      clip.duration -= 0.01;
    }

    action.play();

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [clonedScene, animations]);

  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return <primitive object={clonedScene} castShadow receiveShadow />;
}
```

## References

- Full Guide: `/MIXAMO_ANIMATION_GUIDE.md`
- Three.js Docs: https://threejs.org/docs/#api/en/animation/AnimationMixer
- React Three Fiber: https://docs.pmnd.rs/react-three-fiber/
