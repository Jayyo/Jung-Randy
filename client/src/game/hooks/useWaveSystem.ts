// ===== WAVE SYSTEM HOOK =====
import { useState, useRef, useEffect, useCallback } from 'react';
import * as THREE from 'three';
import { MonsterData, GameState, SelectionTarget } from '../types';
import { LANE_OFFSET, BOSS_PLATFORM_X, WORLD_BOSS_SCALE_MULTIPLIER } from '../constants';
import {
  getMonsterStatsForWave,
  WAVE_CONFIG,
  getMonstersPerWave,
  getSpawnIntervalForWave,
  isBossWave,
  WAVE_SPAWN_DURATION_MS,
  WAVE_TOTAL_DURATION_MS,
  MAX_ACTIVE_MONSTERS,
  ROUND_SCALING_CONFIG,
} from '../gameData';
import { startWaveTickers, scheduleWaveEnd } from '../controllers/waveController';

interface UseWaveSystemReturn {
  // Game state
  gameState: GameState;
  setGameState: React.Dispatch<React.SetStateAction<GameState>>;
  currentWave: number;
  monstersSpawnedInWave: number;
  monstersKilledInWave: number;
  totalMonstersKilled: number;
  waveTimeLeftMs: number;
  spawnTimeLeftMs: number;

  // Monsters
  monsters: MonsterData[];
  setMonsters: React.Dispatch<React.SetStateAction<MonsterData[]>>;
  monsterPosRefs: React.MutableRefObject<Map<string, THREE.Vector3>>;

  // Callbacks
  handleMonsterDeath: (id: string) => void;
  handleAttackMonster: (attackerId: string, monsterId: string, damage: number) => void;
  handleStart: (preload?: () => Promise<void>) => Promise<void>;
  handleRestart: () => void;
  handleSkipWave: () => void;
}

export function useWaveSystem(selectionTarget: SelectionTarget, setSelectionTarget: (target: SelectionTarget) => void): UseWaveSystemReturn {
  // Game state
  const [gameState, setGameState] = useState<GameState>('lobby');
  const [currentWave, setCurrentWave] = useState(0);
  const [monstersSpawnedInWave, setMonstersSpawnedInWave] = useState(0);
  const [monstersKilledInWave, setMonstersKilledInWave] = useState(0);
  const [totalMonstersKilled, setTotalMonstersKilled] = useState(0);
  const [waveTimeLeftMs, setWaveTimeLeftMs] = useState(WAVE_TOTAL_DURATION_MS);
  const [spawnTimeLeftMs, setSpawnTimeLeftMs] = useState(WAVE_SPAWN_DURATION_MS);

  // Monster state
  const [monsters, setMonsters] = useState<MonsterData[]>([]);
  const monsterPosRefs = useRef<Map<string, THREE.Vector3>>(new Map());

  // Refs for tracking
  const monsterIdCounterRef = useRef(0);
  const spawnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const waveEndCancelRef = useRef<(() => void) | null>(null);
  const waveTickerRef = useRef<{ stop: () => void } | null>(null);
  const waveStartTimeRef = useRef<number>(0);
  const waveTransitioningRef = useRef(false);
  const worldBossIdRef = useRef<string | null>(null);
  const worldBossDeadlineWaveRef = useRef<number | null>(null);

  // Create a monster with wave-based stats
  const createMonster = useCallback((wave: number, isBoss: boolean = false, options?: { isWorldBoss?: boolean }): MonsterData => {
    const stats = getMonsterStatsForWave(wave);
    const id = isBoss ? `boss-${monsterIdCounterRef.current++}` : `monster-${monsterIdCounterRef.current++}`;
    const isWorldBoss = options?.isWorldBoss ?? false;
    const startPos = isWorldBoss
      ? new THREE.Vector3(BOSS_PLATFORM_X, 0, 0)
      : new THREE.Vector3(-LANE_OFFSET, 0, -LANE_OFFSET);
    monsterPosRefs.current.set(id, startPos);

    return {
      id,
      hp: isWorldBoss ? stats.hp * (ROUND_SCALING_CONFIG.worldBossHpMultiplier ?? 15) : stats.hp,
      maxHp: isWorldBoss ? stats.hp * (ROUND_SCALING_CONFIG.worldBossHpMultiplier ?? 15) : stats.hp,
      defense: isWorldBoss ? stats.defense * (ROUND_SCALING_CONFIG.worldBossDefenseMultiplier ?? 7) : stats.defense,
      damage: stats.damage,
      wave,
      sizeMultiplier: isWorldBoss ? stats.sizeMultiplier * WORLD_BOSS_SCALE_MULTIPLIER : stats.sizeMultiplier,
      progress: 0,
      isDying: false,
      isBoss,
      isWorldBoss,
    };
  }, []);

  // Spawn monsters for current wave
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (currentWave < 1) return;
    if (currentWave > WAVE_CONFIG.totalWaves) return;

    // Reset counters for new wave
    setMonstersSpawnedInWave(0);
    setMonstersKilledInWave(0);
    waveStartTimeRef.current = Date.now();
    setWaveTimeLeftMs(WAVE_TOTAL_DURATION_MS);
    setSpawnTimeLeftMs(WAVE_SPAWN_DURATION_MS);

    // Start ticking timers for UI
    if (waveTickerRef.current) {
      waveTickerRef.current.stop();
    }
    waveTickerRef.current = startWaveTickers({
      totalWaveMs: WAVE_TOTAL_DURATION_MS,
      spawnMs: WAVE_SPAWN_DURATION_MS,
      onTick: ({ waveTimeLeft, spawnTimeLeft }) => {
        setWaveTimeLeftMs(waveTimeLeft);
        setSpawnTimeLeftMs(spawnTimeLeft);
      },
    });

    // Check if this is a boss wave
    const isBoss = isBossWave(currentWave);
    let cancelled = false; // Declare cancelled outside if/else for cleanup

    // Schedule next wave (fixed 2 minute window per wave)
    if (waveEndCancelRef.current) {
      waveEndCancelRef.current();
    }
    const startNextWave = () => {
      if (waveTransitioningRef.current) return;
      waveTransitioningRef.current = true;

      if (currentWave >= WAVE_CONFIG.totalWaves) {
        setGameState('gameover');
        return;
      }

      setCurrentWave(prev => prev + 1);
      setTimeout(() => { waveTransitioningRef.current = false; }, 0);
    };
    waveEndCancelRef.current = scheduleWaveEnd(WAVE_TOTAL_DURATION_MS, startNextWave);

    if (isBoss) {
      // Boss wave: spawn lane boss + world boss on platform
      const laneBoss = createMonster(currentWave, true, { isWorldBoss: false });
      const bossMonster = createMonster(currentWave, true, { isWorldBoss: true });
      worldBossIdRef.current = bossMonster.id;
      worldBossDeadlineWaveRef.current = currentWave + 5; // must kill within 5 waves
      setMonsters(prev => [...prev, laneBoss, bossMonster]);
      setMonstersSpawnedInWave(2);
    } else {
      // Normal wave: spawn regular monsters
      const monstersForThisWave = getMonstersPerWave(currentWave);
      const spawnIntervalForThisWave = getSpawnIntervalForWave(currentWave);

      // Start spawning monsters
      let spawned = 0;

      const spawnNext = () => {
        if (cancelled) return;
        const elapsed = Date.now() - waveStartTimeRef.current;
        if (elapsed >= WAVE_SPAWN_DURATION_MS) return;
        if (spawned >= monstersForThisWave) {
          return;
        }
        const newMonster = createMonster(currentWave, false);
        setMonsters(prev => [...prev, newMonster]);
        spawned++;
        setMonstersSpawnedInWave(spawned);

        if (spawned < monstersForThisWave) {
          spawnTimerRef.current = setTimeout(spawnNext, spawnIntervalForThisWave);
        }
      };

      // Start spawning after a small delay
      spawnTimerRef.current = setTimeout(spawnNext, 500);
    }

    return () => {
      cancelled = true;
      if (spawnTimerRef.current) {
        clearTimeout(spawnTimerRef.current);
      }
      if (waveEndCancelRef.current) {
        waveEndCancelRef.current();
        waveEndCancelRef.current = null;
      }
      if (waveTickerRef.current) {
        waveTickerRef.current.stop();
        waveTickerRef.current = null;
      }
    };
  }, [currentWave, gameState, createMonster]);

  // Auto defeat if too many monsters are alive
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (monsters.length > MAX_ACTIVE_MONSTERS) {
      setGameState('gameover');
    }
  }, [monsters.length, gameState]);

  // World boss defeat deadline (5 waves window)
  useEffect(() => {
    if (gameState !== 'playing') return;
    if (!worldBossIdRef.current || worldBossDeadlineWaveRef.current === null) return;

    const bossAlive = monsters.some(m => m.id === worldBossIdRef.current && !m.isDying);
    if (!bossAlive) {
      worldBossIdRef.current = null;
      worldBossDeadlineWaveRef.current = null;
      return;
    }

    if (currentWave > worldBossDeadlineWaveRef.current) {
      setGameState('gameover');
    }
  }, [monsters, currentWave, gameState]);

  // Attack monster (called when character attack animation finishes)
  const handleAttackMonster = useCallback((_attackerId: string, monsterId: string, damage: number) => {
    setMonsters(prev => prev.map(m => {
      if (m.id !== monsterId || m.isDying) return m;
      const newHp = Math.max(0, m.hp - damage);
      if (newHp <= 0) {
        return { ...m, hp: 0, isDying: true };
      }
      return { ...m, hp: newHp };
    }));
  }, []);

  // Monster death callback
  const handleMonsterDeath = useCallback((id: string) => {
    setMonsters(prev => prev.filter(m => m.id !== id));
    monsterPosRefs.current.delete(id);
    setMonstersKilledInWave(prev => prev + 1);
    setTotalMonstersKilled(prev => prev + 1);

    if (worldBossIdRef.current === id) {
      worldBossIdRef.current = null;
      worldBossDeadlineWaveRef.current = null;
    }

    // If the dead monster was selected, clear selection
    if (selectionTarget?.type === 'monster' && selectionTarget.id === id) {
      setSelectionTarget(null);
    }
  }, [selectionTarget, setSelectionTarget]);

  const resetGameState = useCallback(() => {
    waveTransitioningRef.current = false;
    if (spawnTimerRef.current) {
      clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (waveEndCancelRef.current) {
      waveEndCancelRef.current();
      waveEndCancelRef.current = null;
    }
    if (waveTickerRef.current) {
      waveTickerRef.current.stop();
      waveTickerRef.current = null;
    }
    waveStartTimeRef.current = 0;
    setWaveTimeLeftMs(WAVE_TOTAL_DURATION_MS);
    setSpawnTimeLeftMs(WAVE_SPAWN_DURATION_MS);
    setCurrentWave(0);
    setMonstersSpawnedInWave(0);
    setMonstersKilledInWave(0);
    setTotalMonstersKilled(0);
    setMonsters([]);
    monsterPosRefs.current.clear();
    monsterIdCounterRef.current = 0;
    worldBossIdRef.current = null;
    worldBossDeadlineWaveRef.current = null;
  }, []);

  // Start game from lobby
  const handleStart = useCallback(async (preload?: () => Promise<void>) => {
    setGameState('loading');
    if (preload) {
      try {
        await preload();
      } catch (err) {
        console.error('Preload failed:', err);
      }
    }
    resetGameState();
    setGameState('playing');
    setTimeout(() => setCurrentWave(1), 50);
  }, [resetGameState]);

  // Restart game after gameover
  const handleRestart = useCallback(() => {
    handleStart();
  }, [handleStart]);

  // Debug: Skip to next wave (dev use)
  const handleSkipWave = useCallback(() => {
    if (gameState !== 'playing') return;
    setMonsters([]);
    monsterPosRefs.current.clear();
    if (spawnTimerRef.current) {
      clearTimeout(spawnTimerRef.current);
      spawnTimerRef.current = null;
    }
    if (waveEndCancelRef.current) {
      waveEndCancelRef.current();
      waveEndCancelRef.current = null;
    }
    if (waveTickerRef.current) {
      waveTickerRef.current.stop();
      waveTickerRef.current = null;
    }
    worldBossIdRef.current = null;
    worldBossDeadlineWaveRef.current = null;
    setMonstersSpawnedInWave(0);
    setMonstersKilledInWave(0);
    setWaveTimeLeftMs(WAVE_TOTAL_DURATION_MS);
    setSpawnTimeLeftMs(WAVE_SPAWN_DURATION_MS);
    setCurrentWave(prev => {
      const next = prev + 1;
      if (next > WAVE_CONFIG.totalWaves) {
        setGameState('gameover');
        return prev;
      }
      return next;
    });
  }, [gameState, setGameState]);

  return {
    gameState,
    setGameState,
    currentWave,
    monstersSpawnedInWave,
    monstersKilledInWave,
    totalMonstersKilled,
    waveTimeLeftMs,
    spawnTimeLeftMs,
    monsters,
    setMonsters,
    monsterPosRefs,
    handleMonsterDeath,
    handleAttackMonster,
    handleStart,
    handleRestart,
    handleSkipWave,
  };
}
