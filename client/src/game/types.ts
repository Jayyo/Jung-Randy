// ===== GAME TYPES =====
import * as THREE from 'three';
import { CharacterStats } from './gameData';
import { PoliticianTier, Party } from './data/politicians';

// Character data structure
export interface CharacterData {
  id: string;
  type: 1 | 2;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3 | null;
  waypointQueue: THREE.Vector3[]; // Waypoints for path through bridge
  state: 'idle' | 'running' | 'attacking' | 'active_skill' | 'passive_skill';
  lastAttackTime: number;
  lastActiveSkillTime: number;
  stats: CharacterStats;
  currentHp: number;
  // Politician data (optional - for combination units)
  politician?: {
    id: string;
    name: string;
    tier: PoliticianTier;
    party: Party;
    partyDetail?: string;
    color: string;
  };
}

// Monster data structure
export interface MonsterData {
  id: string;
  hp: number;
  maxHp: number;
  defense: number;
  damage: number;
  wave: number; // which wave this monster belongs to
  sizeMultiplier: number;
  progress: number;
  isDying: boolean;
  isBoss: boolean; // true if this is a boss monster (every 10 waves)
}

// Game state type
export type GameState = 'playing' | 'gameover';

// Selection target type
export type SelectionTarget = {
  type: 'character';
  ids: string[];
} | {
  type: 'monster';
  id: string;
} | null;

// Move indicator data
export interface MoveIndicatorData {
  id: string;
  position: THREE.Vector3;
  startTime: number;
}
