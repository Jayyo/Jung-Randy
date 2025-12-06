// ===== MAIN GAME SCENE =====
// Modular entry point - all logic is split into separate modules
import { useEffect, useMemo, useState, useCallback } from 'react';
import { Canvas } from '@react-three/fiber';
import { PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

// Terrain
import { Platform } from './terrain';

// Entities
import { Character, PoliticianCharacter, Monster } from './entities';

// Components
import { MoveIndicator } from './components';

// Controllers
import { RTSCameraController, SelectionHandler } from './controllers';

// UI
import {
  StatusPanel,
  WaveInfo,
  GameOverOverlay,
  ControlsPanel,
  SpawnButton,
  SelectionBox,
  RecipePanel,
  LobbyOverlay,
  preloadCharacterPreviewsAsync,
} from './ui';

// Chat
import { WarcraftChatBox } from '../chat';

// Buildings
import { BuildingType } from './buildings';

// Hooks
import { useWaveSystem, useCharacterSystem } from './hooks';

// Constants
import { LANE_OFFSET } from './constants';
import { ALL_POLITICIANS } from './data/politicians';
import { TargetingMode } from './types';

export default function GameScene() {
  // Recipe panel state
  const [isRecipePanelOpen, setIsRecipePanelOpen] = useState(false);

  // Building panel state
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingType | null>(null);
  const [targetingMode, setTargetingMode] = useState<TargetingMode>('closest');

  const handleBuildingSelect = (type: BuildingType) => {
    setSelectedBuilding(prev => prev === type ? null : type);
  };

  const handleBuildingClose = () => {
    setSelectedBuilding(null);
  };

  // Keyboard shortcut for recipe panel (C key)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'c' || e.key === 'C' || e.key === 'ㅊ') {
        setIsRecipePanelOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Character system (selection, spawning, movement)
  const {
    characters,
    spawnCount,
    selectedCharacterIds,
    setSelectedCharacterIds,
    selectionTarget,
    setSelectionTarget,
    selectionBox,
    setSelectionBox,
    moveIndicators,
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
    handleRallySameUnits,
    handleSaveGroup,
    handleSelectGroup,
  } = useCharacterSystem();

  // Wave system (monsters, waves, game state)
  const {
    gameState,
    currentWave,
    totalMonstersKilled,
    waveTimeLeftMs,
    monsters,
    monsterPosRefs,
    handleMonsterDeath,
    handleAttackMonster,
    handleRestart,
    handleStart,
    handleSkipWave,
  } = useWaveSystem(selectionTarget, setSelectionTarget);

  // Track owned politician ids (for recipe availability UI)
  const ownedPoliticianIds = useMemo(() => {
    const ids = new Set<string>();
    characters.forEach(char => {
      if (char.politician) ids.add(char.politician.id);
    });
    return ids;
  }, [characters]);

  // Sync selection target with selectedCharacterIds
  useEffect(() => {
    if (selectedCharacterIds.size > 0) {
      const ids = Array.from(selectedCharacterIds);
      const isSame =
        selectionTarget?.type === 'character' &&
        selectionTarget.ids.length === ids.length &&
        selectionTarget.ids.every(id => ids.includes(id));

      if (!isSame) {
        setSelectionTarget({ type: 'character', ids });
      }
    } else if (selectionTarget?.type === 'character') {
      setSelectionTarget(null);
    }
  }, [selectedCharacterIds, selectionTarget, setSelectionTarget]);

  // Preload targets for character previews (id + color)
  const previewTargets = useMemo(
    () => ALL_POLITICIANS.map(p => ({ id: p.id, color: p.color })),
    []
  );

  // Start game with preload step
  const handleStartWithPreload = useCallback(() => {
    handleStart(() => preloadCharacterPreviewsAsync(previewTargets));
  }, [handleStart, previewTargets]);

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#1a1a2e' }}>
      {/* Selection Box Overlay */}
      <SelectionBox selectionBox={selectionBox} />

      {/* Loading Overlay */}
      {gameState === 'loading' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(10, 14, 30, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 250,
            backdropFilter: 'blur(2px)',
          }}
        >
          <div
            style={{
              padding: '18px 22px',
              borderRadius: 12,
              background: 'rgba(17, 24, 39, 0.9)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              color: '#e5e7eb',
              fontWeight: 800,
              boxShadow: '0 15px 40px rgba(0,0,0,0.4)',
            }}
          >
            로딩중... (캐릭터 미리 불러오는 중)
          </div>
        </div>
      )}

      {/* Lobby Overlay */}
      {gameState === 'lobby' && (
        <LobbyOverlay onStart={handleStartWithPreload} />
      )}

      {/* Game Over Overlay */}
      {gameState === 'gameover' && (
        <GameOverOverlay
          totalMonstersKilled={totalMonstersKilled}
          onRestart={handleRestart}
        />
      )}

      {/* Top UI - Wave Info */}
      {gameState === 'playing' && (
        <WaveInfo
          currentWave={currentWave}
          waveTimeLeftMs={waveTimeLeftMs}
          monstersAlive={monsters.length}
        />
      )}

      {/* Left UI Panel */}
      <ControlsPanel
        characters={characters}
        monsters={monsters}
        totalMonstersKilled={totalMonstersKilled}
        targetingMode={targetingMode}
        onChangeTargetingMode={setTargetingMode}
        onSkipWave={handleSkipWave}
      />

      {/* Spawn Button */}
      <SpawnButton
        spawnCount={spawnCount}
        onSpawn={spawnCharacter}
        onSpawnPolitician={spawnPolitician}
      />

      {/* Status Panel */}
      <StatusPanel
        selectionTarget={selectionTarget}
        characters={characters}
        monsters={monsters}
        onUseActiveSkill={handleUseActiveSkill}
        onSelectCharacter={handleSelectSingleCharacter}
        onCombine={executeCombine}
        onRallySameUnits={handleRallySameUnits}
        selectedBuilding={selectedBuilding}
      />

      {/* Recipe Button */}
      <button
        onClick={() => setIsRecipePanelOpen(prev => !prev)}
        style={{
          position: 'absolute',
          bottom: 20,
          left: 20,
          padding: '12px 24px',
          backgroundColor: isRecipePanelOpen ? '#ff6b6b' : '#ffd700',
          color: '#1a1a2e',
          border: 'none',
          borderRadius: 8,
          fontWeight: 'bold',
          fontSize: 14,
          cursor: 'pointer',
          boxShadow: isRecipePanelOpen
            ? '0 4px 12px rgba(255, 107, 107, 0.4)'
            : '0 4px 12px rgba(255, 215, 0, 0.4)',
          zIndex: 100,
          transition: 'all 0.2s',
        }}
      >
        📖 조합법 (C)
      </button>

      {/* Recipe Panel */}
      <RecipePanel
        isOpen={isRecipePanelOpen}
        ownedPoliticianIds={ownedPoliticianIds}
        onClose={() => setIsRecipePanelOpen(false)}
      />

      {/* Chat - Warcraft 스타일 고정 */}
      <WarcraftChatBox
        onSendMessage={(message) => {
          console.log('Chat message:', message);
          // TODO: Implement chat message handling (e.g., send to server, display in game)
        }}
      />

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 12, 10]} fov={50} />
        <RTSCameraController />

        <ambientLight intensity={0.5} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.2}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />

        <Platform
          selectedBuilding={selectedBuilding}
          onBuildingSelect={handleBuildingSelect}
        />

        {/* Render all monsters */}
        {monsters.map(monster => {
          // Get or create position ref for this monster
          if (!monsterPosRefs.current.has(monster.id)) {
            monsterPosRefs.current.set(monster.id, new THREE.Vector3(-LANE_OFFSET, 0, -LANE_OFFSET));
          }
          const posRef = { current: monsterPosRefs.current.get(monster.id)! };
          return (
            <Monster
              key={monster.id}
              data={monster}
              positionRef={posRef}
              onDeath={() => handleMonsterDeath(monster.id)}
              onClick={() => handleSelectMonster(monster.id)}
              isSelected={selectionTarget?.type === 'monster' && selectionTarget.id === monster.id}
              hideOverlay={isRecipePanelOpen}
            />
          );
        })}

        {/* Render all characters */}
        {characters.map(char => (
          char.politician ? (
            <PoliticianCharacter
              key={char.id}
              data={char}
              isSelected={selectedCharacterIds.has(char.id)}
              onSelect={handleSelectCharacter}
              onSelectAllSameType={handleSelectAllSameType}
              monsters={monsters}
              monsterPosRefs={monsterPosRefs.current}
              onAttackMonster={handleAttackMonster}
              onStateChange={handleStateChange}
              targetingMode={targetingMode}
              hideOverlay={isRecipePanelOpen}
            />
          ) : (
            <Character
              key={char.id}
              data={char}
              isSelected={selectedCharacterIds.has(char.id)}
              onSelect={handleSelectCharacter}
              onSelectAllSameType={handleSelectAllSameType}
              monsters={monsters}
              monsterPosRefs={monsterPosRefs.current}
              onAttackMonster={handleAttackMonster}
              onStateChange={handleStateChange}
              targetingMode={targetingMode}
              hideOverlay={isRecipePanelOpen}
            />
          )
        ))}

        {/* Move indicators */}
        {moveIndicators.map(indicator => (
          <MoveIndicator
            key={indicator.id}
            data={indicator}
            onComplete={() => handleIndicatorComplete(indicator.id)}
          />
        ))}

        {/* Selection handler (handles input) */}
        <SelectionHandler
          selectedCharacterIds={selectedCharacterIds}
          setSelectedCharacterIds={setSelectedCharacterIds}
          characters={characters}
          selectionBox={selectionBox}
          setSelectionBox={setSelectionBox}
          onMoveCommand={handleMoveCommand}
          onStopCommand={handleStopCommand}
          onSaveGroup={handleSaveGroup}
          onSelectGroup={handleSelectGroup}
          onGroundClick={handleBuildingClose}
        />
      </Canvas>
    </div>
  );
}
