# Mixamo Animation Loop Fix Guide

## Problem Description

When using Mixamo animations with Three.js AnimationMixer, you may experience a visible "snap" or "jump" at the loop point where the animation restarts. The character appears to teleport back to the starting pose instead of smoothly transitioning.

## Root Causes

1. **First/Last Frame Mismatch**: Mixamo animations often have a slight difference between the first and last frame
2. **Improper Loop Configuration**: Using wrong loop mode or missing settings
3. **Missing Mixer Updates**: Not calling `mixer.update(delta)` every frame
4. **Export Settings**: Wrong Mixamo export options can worsen the issue

## Solutions

### Solution 1: Trim Animation Duration (RECOMMENDED)

The most effective solution is to trim a small amount (10-50ms) from the end of the animation clip:

```typescript
const clip = animations[0];
const action = mixer.clipAction(clip);

// Trim last frame to avoid snap
const trimAmount = 0.01; // 10ms
if (clip.duration > trimAmount) {
  clip.duration = clip.duration - trimAmount;
}

action.setLoop(THREE.LoopRepeat, Infinity);
action.clampWhenFinished = false;
action.play();
```

### Solution 2: Proper Loop Configuration

Ensure you're using the correct loop settings:

```typescript
action.setLoop(THREE.LoopRepeat, Infinity);
action.clampWhenFinished = false; // Critical!
action.enabled = true;
action.timeScale = 1.0; // Adjust for speed
```

### Solution 3: Manual Time Reset (Advanced)

For extra smoothness, manually reset animation time near the end:

```typescript
useFrame((state, delta) => {
  if (mixerRef.current && actionRef.current) {
    mixerRef.current.update(delta);

    // Reset if too close to end
    const clip = animations[0];
    if (actionRef.current.time > clip.duration - 0.05) {
      actionRef.current.time = 0;
    }
  }
});
```

### Solution 4: Clone Scene Properly

When using multiple instances, clone the scene with SkeletonUtils:

```typescript
import { SkeletonUtils } from 'three-stdlib';

const clonedScene = useMemo(() => {
  const clone = SkeletonUtils.clone(scene);
  clone.traverse((child) => {
    child.matrixAutoUpdate = true; // Critical for animations!
    child.frustumCulled = false; // Prevent culling issues
  });
  return clone;
}, [scene]);
```

## Mixamo Export Settings

When exporting from Mixamo, use these settings for best results:

- **Format**: GLB (Binary)
- **Skin**: With Skin
- **Frames per second**: 30 (standard) or 60 (smoother)
- **Keyframe Reduction**: None (for looping animations)
- **In Place**: Check this for run/walk cycles if you want to control movement separately

## React Three Fiber Implementation

### ❌ Common Mistakes

```typescript
// WRONG: Using useAnimations hook (less control)
const { actions } = useAnimations(animations, groupRef);
actions['Run']?.play();

// WRONG: Not updating mixer every frame
useEffect(() => {
  mixer.update(0.016); // Static update
}, []);

// WRONG: Using LoopOnce
action.setLoop(THREE.LoopOnce, 1);
```

### ✅ Correct Implementation

```typescript
function AnimatedModel({ modelPath }: { modelPath: string }) {
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

    // Trim duration slightly
    if (clip.duration > 0.01) {
      clip.duration -= 0.01;
    }

    action.setLoop(THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = false;
    action.enabled = true;
    action.play();

    return () => {
      mixer.stopAllAction();
      mixerRef.current = null;
    };
  }, [clonedScene, animations]);

  // Update mixer every frame
  useFrame((_, delta) => {
    if (mixerRef.current) {
      mixerRef.current.update(delta);
    }
  });

  return <primitive object={clonedScene} />;
}
```

## Animation Speed Control

### Adjust playback speed with timeScale

```typescript
action.timeScale = 1.5; // 1.5x faster
action.timeScale = 0.5; // 0.5x slower
```

### Dynamic speed based on movement

```typescript
useFrame((_, delta) => {
  if (mixerRef.current && actionRef.current) {
    // Adjust speed based on actual movement velocity
    const velocity = calculateVelocity();
    actionRef.current.timeScale = velocity / baseSpeed;

    mixerRef.current.update(delta);
  }
});
```

## Debugging Tips

### Check animation clip info

```typescript
const clip = animations[0];
console.log({
  name: clip.name,
  duration: clip.duration,
  tracks: clip.tracks.length,
  fps: clip.tracks[0]?.times.length / clip.duration
});
```

### Monitor mixer time

```typescript
useFrame(() => {
  if (mixerRef.current && actionRef.current) {
    console.log({
      time: actionRef.current.time.toFixed(3),
      duration: actionRef.current.getClip().duration.toFixed(3),
      progress: (actionRef.current.time / actionRef.current.getClip().duration * 100).toFixed(1) + '%'
    });
    mixerRef.current.update(delta);
  }
});
```

### Visual debugging

Add a progress bar or indicator to visualize the animation loop point:

```typescript
// In your component
const [animProgress, setAnimProgress] = useState(0);

useFrame(() => {
  if (actionRef.current) {
    const clip = actionRef.current.getClip();
    setAnimProgress(actionRef.current.time / clip.duration);
  }
});

// In JSX
<div style={{
  position: 'absolute',
  top: 0,
  width: `${animProgress * 100}%`,
  height: '5px',
  background: 'red'
}} />
```

## Advanced: CrossFade for Ultra-Smooth Loops

For the smoothest possible loops, use crossfading:

```typescript
useEffect(() => {
  if (!clonedScene || animations.length === 0) return;

  const mixer = new THREE.AnimationMixer(clonedScene);
  const clip = animations[0];

  // Create TWO actions of the same clip
  const action1 = mixer.clipAction(clip.clone());
  const action2 = mixer.clipAction(clip.clone());

  action1.play();
  action2.enabled = false;

  // Listen for loop event
  mixer.addEventListener('loop', () => {
    // Crossfade to second action
    action1.crossFadeTo(action2, 0.2, false);
    setTimeout(() => {
      action2.crossFadeTo(action1, 0.2, false);
    }, (clip.duration - 0.2) * 1000);
  });

  return () => mixer.stopAllAction();
}, [clonedScene, animations]);
```

## Project-Specific Implementation

See working examples in this project:

- `/client/src/game/3d-test/SeamlessAnimationExample.tsx` - Full demonstration
- `/client/src/game/3d-test/SimpleTestScene.tsx` - Working monster animation

## Resources

- [Three.js AnimationMixer Docs](https://threejs.org/docs/#api/en/animation/AnimationMixer)
- [Three.js AnimationAction Docs](https://threejs.org/docs/#api/en/animation/AnimationAction)
- [Mixamo Download](https://www.mixamo.com/)
- [React Three Fiber Animation Docs](https://docs.pmnd.rs/react-three-fiber/tutorials/loading-models#animations)

## Quick Reference

| Issue | Solution |
|-------|----------|
| Animation snaps at loop point | Trim clip duration by 0.01-0.05s |
| Animation doesn't play | Check `mixer.update(delta)` in useFrame |
| Multiple instances conflict | Clone scene with SkeletonUtils |
| Animation frozen | Set `matrixAutoUpdate = true` |
| Animation too fast/slow | Adjust `action.timeScale` |
| Jerky animation | Ensure delta is passed to mixer.update() |

## Summary

**The 3 Critical Steps:**

1. **Trim clip duration** by 10-50ms
2. **Set `clampWhenFinished = false`**
3. **Call `mixer.update(delta)` every frame**

Following these steps will eliminate the snap/jump issue in 99% of cases.
