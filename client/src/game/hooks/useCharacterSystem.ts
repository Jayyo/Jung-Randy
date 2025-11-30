// ===== CHARACTER SYSTEM HOOK =====
import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { CharacterData, SelectionTarget, MoveIndicatorData } from '../types';
import { getCharacterStats } from '../gameData';

interface UseCharacterSystemReturn {
  // Characters
  characters: CharacterData[];
  setCharacters: React.Dispatch<React.SetStateAction<CharacterData[]>>;
  spawnCount: number;

  // Selection
  selectedCharacterIds: Set<string>;
  setSelectedCharacterIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectionTarget: SelectionTarget;
  setSelectionTarget: React.Dispatch<React.SetStateAction<SelectionTarget>>;
  selectionBox: { start: { x: number; y: number }; end: { x: number; y: number } } | null;
  setSelectionBox: React.Dispatch<React.SetStateAction<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>>;

  // Move indicators
  moveIndicators: MoveIndicatorData[];
  setMoveIndicators: React.Dispatch<React.SetStateAction<MoveIndicatorData[]>>;

  // Callbacks
  spawnCharacter: () => void;
  handleSelectCharacter: (id: string, addToSelection: boolean) => void;
  handleSelectSingleCharacter: (id: string) => void;
  handleSelectAllSameType: (type: 1 | 2) => void;
  handleSelectMonster: (id: string) => void;
  handleMoveCommand: (position: THREE.Vector3) => void;
  handleIndicatorComplete: (id: string) => void;
  handleUseActiveSkill: (charId: string) => void;
  handleStateChange: (charId: string, state: CharacterData['state']) => void;
  handleStopCommand: () => void;
  handleSaveGroup: (groupNumber: number) => void;
  handleSelectGroup: (groupNumber: number) => void;
}

export function useCharacterSystem(): UseCharacterSystemReturn {
  // Character state
  const [characters, setCharacters] = useState<CharacterData[]>([]);
  const [spawnCount, setSpawnCount] = useState(0);

  // Selection state
  const [selectedCharacterIds, setSelectedCharacterIds] = useState<Set<string>>(new Set());
  const [selectionTarget, setSelectionTarget] = useState<SelectionTarget>(null);
  const [selectionBox, setSelectionBox] = useState<{ start: { x: number; y: number }; end: { x: number; y: number } } | null>(null);

  // Move indicators
  const [moveIndicators, setMoveIndicators] = useState<MoveIndicatorData[]>([]);

  // Control groups (1-9)
  const [controlGroups, setControlGroups] = useState<Map<number, Set<string>>>(new Map());

  // Handle move command - create indicator effect
  const handleMoveCommand = useCallback((position: THREE.Vector3) => {
    const newIndicator: MoveIndicatorData = {
      id: `move-${Date.now()}`,
      position,
      startTime: Date.now()
    };
    setMoveIndicators(prev => [...prev, newIndicator]);
  }, []);

  // Remove completed indicator
  const handleIndicatorComplete = useCallback((id: string) => {
    setMoveIndicators(prev => prev.filter(ind => ind.id !== id));
  }, []);

  // Spawn character
  const spawnCharacter = useCallback(() => {
    const type = (spawnCount % 2) + 1 as 1 | 2;
    const stats = getCharacterStats(type);
    // Spawn at center (0, 0)
    const spawnX = 0;
    const spawnZ = 0;

    const newChar: CharacterData = {
      id: `char-${Date.now()}`,
      type,
      position: new THREE.Vector3(spawnX, 0, spawnZ),
      targetPosition: null,
      waypointQueue: [],
      state: 'idle',
      lastAttackTime: 0,
      lastActiveSkillTime: -10000, // Allow immediate use
      stats,
      currentHp: stats.maxHp,
    };

    setCharacters(prev => [...prev, newChar]);
    setSpawnCount(prev => prev + 1);
  }, [spawnCount]);

  // Select character
  const handleSelectCharacter = useCallback((id: string, addToSelection: boolean) => {
    // Clear monster selection when selecting character
    setSelectionTarget(null);
    if (addToSelection) {
      setSelectedCharacterIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(id)) {
          newSet.delete(id);
        } else {
          newSet.add(id);
        }
        return newSet;
      });
    } else {
      setSelectedCharacterIds(new Set([id]));
    }
  }, []);

  // Select single character from multi-select panel
  const handleSelectSingleCharacter = useCallback((id: string) => {
    setSelectedCharacterIds(new Set([id]));
  }, []);

  // Select all characters of the same type (double-click)
  const handleSelectAllSameType = useCallback((type: 1 | 2) => {
    const sameTypeChars = characters.filter(c => c.type === type);
    setSelectedCharacterIds(new Set(sameTypeChars.map(c => c.id)));
  }, [characters]);

  // Select monster
  const handleSelectMonster = useCallback((id: string) => {
    setSelectedCharacterIds(new Set()); // Clear character selection
    setSelectionTarget({ type: 'monster', id });
  }, []);

  // Use active skill
  const handleUseActiveSkill = useCallback((charId: string) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      const skill = c.stats.skills.active;
      if (!skill) return c;
      if (Date.now() - c.lastActiveSkillTime < skill.cooldown) return c;
      return {
        ...c,
        lastActiveSkillTime: Date.now(),
        state: 'active_skill' as const,
        targetPosition: null,
      };
    }));
  }, []);

  // Handle character state changes
  const handleStateChange = useCallback((charId: string, state: CharacterData['state']) => {
    setCharacters(prev => prev.map(c => {
      if (c.id !== charId) return c;
      return { ...c, state };
    }));
  }, []);

  // Stop selected characters (S key)
  const handleStopCommand = useCallback(() => {
    setCharacters(prev => prev.map(c => {
      if (!selectedCharacterIds.has(c.id)) return c;
      // Clear movement targets and waypoints, always set to idle
      return {
        ...c,
        targetPosition: null,
        waypointQueue: [],
        state: 'idle' as const, // Always change to idle when stopped
      };
    }));
  }, [selectedCharacterIds]);

  // Save current selection to control group (Ctrl + number)
  const handleSaveGroup = useCallback((groupNumber: number) => {
    if (groupNumber < 1 || groupNumber > 9) return;
    if (selectedCharacterIds.size === 0) return; // Don't save empty selection
    
    setControlGroups(prev => {
      const newGroups = new Map(prev);
      newGroups.set(groupNumber, new Set(selectedCharacterIds));
      return newGroups;
    });
  }, [selectedCharacterIds]);

  // Select control group (number key)
  const handleSelectGroup = useCallback((groupNumber: number) => {
    if (groupNumber < 1 || groupNumber > 9) return;
    
    const group = controlGroups.get(groupNumber);
    if (group && group.size > 0) {
      // Filter to only select characters that still exist
      const existingIds = characters
        .filter(c => group.has(c.id))
        .map(c => c.id);
      
      if (existingIds.length > 0) {
        setSelectedCharacterIds(new Set(existingIds));
        setSelectionTarget(null); // Clear monster selection
      }
    }
  }, [controlGroups, characters]);

  return {
    characters,
    setCharacters,
    spawnCount,
    selectedCharacterIds,
    setSelectedCharacterIds,
    selectionTarget,
    setSelectionTarget,
    selectionBox,
    setSelectionBox,
    moveIndicators,
    setMoveIndicators,
    spawnCharacter,
    handleSelectCharacter,
    handleSelectSingleCharacter,
    handleSelectAllSameType,
    handleSelectMonster,
    handleMoveCommand,
    handleIndicatorComplete,
    handleUseActiveSkill,
    handleStateChange,
    handleStopCommand,
    handleSaveGroup,
    handleSelectGroup,
  };
}
