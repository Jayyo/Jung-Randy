// ===== CHARACTER SYSTEM HOOK =====
import { useState, useCallback } from 'react';
import * as THREE from 'three';
import { CharacterData, SelectionTarget, MoveIndicatorData } from '../types';
import { getCharacterStats, CharacterStats } from '../gameData';
import {
  getPoliticianById,
  CombinationOption,
  executeCombination,
} from '../data/politicians';

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
  spawnPolitician: (politicianId: string) => void;
  executeCombine: (option: CombinationOption, materialCharIds: string[]) => void;
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

  // Spawn character (legacy - basic character types)
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

  // Spawn politician unit
  const spawnPolitician = useCallback((politicianId: string) => {
    const politician = getPoliticianById(politicianId);
    if (!politician) {
      console.error(`Politician not found: ${politicianId}`);
      return;
    }

    // Convert politician stats to CharacterStats
    const stats: CharacterStats = {
      id: `politician_${politician.id}`,
      name: politician.name,
      type: 1,
      maxHp: politician.hp,
      attack: politician.attack,
      defense: politician.defense,
      attackSpeed: 1.0, // Base attack speed
      attackRange: 1.5, // Base attack range
      moveSpeed: 3.0,
      skills: {
        passive: politician.hasSkill && politician.skillName ? {
          id: `skill_${politician.id}`,
          name: politician.skillName,
          description: politician.skillDescription || '',
          triggerChance: 0.2,
          damageMultiplier: 1.5,
          animationPath: '',
        } : null,
        active: null,
      },
      profileImage: '',
    };

    // Spawn position with slight random offset to avoid stacking
    const offsetX = (Math.random() - 0.5) * 2;
    const offsetZ = (Math.random() - 0.5) * 2;

    const newChar: CharacterData = {
      id: `politician-${politician.id}-${Date.now()}`,
      type: 1, // Use type 1 model for now (will load politician model later)
      position: new THREE.Vector3(offsetX, 0, offsetZ),
      targetPosition: null,
      waypointQueue: [],
      state: 'idle',
      lastAttackTime: 0,
      lastActiveSkillTime: -10000,
      stats,
      currentHp: stats.maxHp,
      politician: {
        id: politician.id,
        name: politician.name,
        tier: politician.tier,
        party: politician.party,
        partyDetail: politician.partyDetail,
        color: politician.color,
      },
    };

    setCharacters(prev => [...prev, newChar]);
    setSpawnCount(prev => prev + 1);
  }, []);

  // Execute combination: remove material characters and spawn result
  const executeCombine = useCallback((_option: CombinationOption, materialCharIds: string[]) => {
    // Get material politician IDs from characters
    const materialPoliticianIds: string[] = [];
    const charsToRemove = new Set(materialCharIds);

    for (const charId of materialCharIds) {
      const char = characters.find(c => c.id === charId);
      if (char?.politician) {
        materialPoliticianIds.push(char.politician.id);
      }
    }

    // Execute the combination
    const resultPolitician = executeCombination(materialPoliticianIds);
    if (!resultPolitician) {
      console.error('Combination failed - no matching recipe');
      return;
    }

    // Remove material characters
    setCharacters(prev => prev.filter(c => !charsToRemove.has(c.id)));

    // Clear selection
    setSelectedCharacterIds(new Set());
    setSelectionTarget(null);

    // Spawn the result politician
    const stats: CharacterStats = {
      id: `politician_${resultPolitician.id}`,
      name: resultPolitician.name,
      type: 1,
      maxHp: resultPolitician.hp,
      attack: resultPolitician.attack,
      defense: resultPolitician.defense,
      attackSpeed: 1.0,
      attackRange: 1.5,
      moveSpeed: 3.0,
      skills: {
        passive: resultPolitician.hasSkill && resultPolitician.skillName ? {
          id: `skill_${resultPolitician.id}`,
          name: resultPolitician.skillName,
          description: resultPolitician.skillDescription || '',
          triggerChance: 0.2,
          damageMultiplier: 1.5,
          animationPath: '',
        } : null,
        active: null,
      },
      profileImage: '',
    };

    // Spawn at center with small offset
    const offsetX = (Math.random() - 0.5) * 2;
    const offsetZ = (Math.random() - 0.5) * 2;

    const newChar: CharacterData = {
      id: `politician-${resultPolitician.id}-${Date.now()}`,
      type: 1,
      position: new THREE.Vector3(offsetX, 0, offsetZ),
      targetPosition: null,
      waypointQueue: [],
      state: 'idle',
      lastAttackTime: 0,
      lastActiveSkillTime: -10000,
      stats,
      currentHp: stats.maxHp,
      politician: {
        id: resultPolitician.id,
        name: resultPolitician.name,
        tier: resultPolitician.tier,
        party: resultPolitician.party,
        partyDetail: resultPolitician.partyDetail,
        color: resultPolitician.color,
      },
    };

    // Add the new character after a small delay for visual effect
    setTimeout(() => {
      setCharacters(prev => [...prev, newChar]);
    }, 100);

    setSpawnCount(prev => prev + 1);
  }, [characters]);

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
    spawnPolitician,
    executeCombine,
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
