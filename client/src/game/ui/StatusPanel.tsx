// ===== STATUS PANEL UI (Bottom Panel) =====
import { useState } from 'react';
import { CharacterData, MonsterData, SelectionTarget } from '../types';
import { BuildingType, BUILDINGS } from '../buildings';
import {
  DUMMY_CHARACTERS,
  RARITY_COLORS,
  RARITY_BG_COLORS,
  getCharactersByRarity,
  type DummyCharacter,
} from '../data/dummyCharacters';
import { CharacterPreview } from './CharacterPreview';

interface StatusPanelProps {
  selectionTarget: SelectionTarget;
  characters: CharacterData[];
  monsters: MonsterData[];
  onUseActiveSkill: (charId: string) => void;
  onSelectCharacter: (id: string) => void;
  selectedBuilding?: BuildingType | null;
}

export function StatusPanel({ selectionTarget, characters, monsters, onUseActiveSkill, onSelectCharacter, selectedBuilding }: StatusPanelProps) {
  // Show building panel if building is selected
  if (selectedBuilding) {
    return <BuildingStatusPanel buildingType={selectedBuilding} />;
  }

  if (!selectionTarget) return null;

  // Monster selected
  if (selectionTarget.type === 'monster') {
    const monster = monsters.find(m => m.id === selectionTarget.id);
    if (!monster || monster.isDying) return null;

    return (
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(40, 10, 10, 0.95)',
        border: '2px solid #8b0000',
        borderRadius: '12px',
        padding: '15px 25px',
        color: 'white',
        fontFamily: 'monospace',
        minWidth: '300px',
        zIndex: 100,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* Monster portrait placeholder */}
          <div style={{
            width: '64px',
            height: '64px',
            background: '#1a1a1a',
            border: '2px solid #660000',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '32px',
          }}>
            👹
          </div>
          {/* Monster info */}
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#ff6666' }}>
              Wave {monster.wave} Monster
            </h3>
            {/* HP bar */}
            <div style={{ marginBottom: '8px' }}>
              <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>
                HP: {monster.hp} / {monster.maxHp}
              </div>
              <div style={{
                width: '100%',
                height: '12px',
                background: '#333',
                borderRadius: '6px',
                overflow: 'hidden',
              }}>
                <div style={{
                  width: `${(monster.hp / monster.maxHp) * 100}%`,
                  height: '100%',
                  background: monster.hp > monster.maxHp / 2 ? '#4CAF50' : '#f44336',
                  transition: 'width 0.2s',
                }} />
              </div>
            </div>
            {/* Stats */}
            <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#ccc' }}>
              <span>⚔️ ATK: {monster.damage}</span>
              <span>🛡️ DEF: {monster.defense}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Characters selected
  const selectedChars = characters.filter(c => selectionTarget.ids.includes(c.id));
  if (selectedChars.length === 0) return null;

  // Multi-select: show portrait grid
  if (selectedChars.length > 1) {
    return (
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: '50%',
        transform: 'translateX(-50%)',
        background: 'rgba(10, 30, 10, 0.95)',
        border: '2px solid #4a7c4a',
        borderRadius: '12px',
        padding: '15px 20px',
        color: 'white',
        fontFamily: 'monospace',
        zIndex: 100,
      }}>
        <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '10px' }}>
          Selected: {selectedChars.length} units
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6, 1fr)',
          gap: '8px',
          maxWidth: '400px',
        }}>
          {selectedChars.slice(0, 12).map(char => (
            <div
              key={char.id}
              onClick={() => onSelectCharacter(char.id)}
              style={{
                width: '48px',
                height: '48px',
                background: '#1a3a1a',
                border: '2px solid #4a7c4a',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative',
              }}
            >
              <div style={{ fontSize: '20px' }}>
                {char.type === 1 ? '🥊' : '💪'}
              </div>
              {/* Mini HP bar */}
              <div style={{
                position: 'absolute',
                bottom: '2px',
                left: '2px',
                right: '2px',
                height: '4px',
                background: '#333',
                borderRadius: '2px',
              }}>
                <div style={{
                  width: `${(char.currentHp / char.stats.maxHp) * 100}%`,
                  height: '100%',
                  background: char.currentHp > char.stats.maxHp / 2 ? '#4CAF50' : '#f44336',
                }} />
              </div>
            </div>
          ))}
          {/* Show +N indicator if more than 12 units selected */}
          {selectedChars.length > 12 && (
            <div style={{
              width: '48px',
              height: '48px',
              background: '#2a2a2a',
              border: '2px solid #666',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '14px',
              color: '#aaa',
              fontWeight: 'bold',
            }}>
              +{selectedChars.length - 12}
            </div>
          )}
        </div>
      </div>
    );
  }

  // Single character selected - detailed view
  const char = selectedChars[0];
  const stats = char.stats;
  const activeSkill = stats.skills.active;
  const passiveSkill = stats.skills.passive;
  const canUseActive = activeSkill && (Date.now() - char.lastActiveSkillTime > activeSkill.cooldown);
  const activeCooldownRemaining = activeSkill
    ? Math.max(0, activeSkill.cooldown - (Date.now() - char.lastActiveSkillTime))
    : 0;

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(10, 30, 10, 0.95)',
      border: '2px solid #4a7c4a',
      borderRadius: '12px',
      padding: '15px 25px',
      color: 'white',
      fontFamily: 'monospace',
      minWidth: '400px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', gap: '20px' }}>
        {/* Character portrait */}
        <div style={{
          width: '80px',
          height: '80px',
          background: '#1a3a1a',
          border: '2px solid #4a7c4a',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '40px',
        }}>
          {char.type === 1 ? '🥊' : '💪'}
        </div>

        {/* Character info */}
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#90EE90' }}>
            {stats.name}
          </h3>
          {/* HP bar */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontSize: '12px', color: '#aaa', marginBottom: '2px' }}>
              HP: {char.currentHp} / {stats.maxHp}
            </div>
            <div style={{
              width: '100%',
              height: '12px',
              background: '#333',
              borderRadius: '6px',
              overflow: 'hidden',
            }}>
              <div style={{
                width: `${(char.currentHp / stats.maxHp) * 100}%`,
                height: '100%',
                background: char.currentHp > stats.maxHp / 2 ? '#4CAF50' : '#f44336',
                transition: 'width 0.2s',
              }} />
            </div>
          </div>
          {/* Stats row */}
          <div style={{ display: 'flex', gap: '15px', fontSize: '12px', color: '#ccc' }}>
            <span>⚔️ ATK: {stats.attack}</span>
            <span>🛡️ DEF: {stats.defense}</span>
            <span>⚡ SPD: {stats.attackSpeed.toFixed(1)}/s</span>
          </div>
        </div>

        {/* Skills section */}
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* Passive skill */}
          {passiveSkill && (
            <div
              title={`${passiveSkill.name}: ${passiveSkill.description}\n${Math.round(passiveSkill.triggerChance * 100)}% chance, ${passiveSkill.damageMultiplier}x damage`}
              style={{
                width: '50px',
                height: '50px',
                background: '#2a2a4a',
                border: '2px solid #6a6a8a',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                cursor: 'help',
              }}
            >
              ⚡
            </div>
          )}
          {/* Active skill */}
          {activeSkill && (
            <div
              onClick={() => canUseActive && onUseActiveSkill(char.id)}
              title={`${activeSkill.name}: ${activeSkill.description}\nCooldown: ${activeSkill.cooldown / 1000}s, ${activeSkill.damageMultiplier}x damage`}
              style={{
                width: '50px',
                height: '50px',
                background: canUseActive ? '#4a2a2a' : '#2a2a2a',
                border: `2px solid ${canUseActive ? '#ff6666' : '#666'}`,
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                cursor: canUseActive ? 'pointer' : 'not-allowed',
                position: 'relative',
                opacity: canUseActive ? 1 : 0.6,
              }}
            >
              🔥
              {/* Cooldown overlay */}
              {activeCooldownRemaining > 0 && (
                <div style={{
                  position: 'absolute',
                  bottom: '-18px',
                  fontSize: '10px',
                  color: '#ff6666',
                }}>
                  {(activeCooldownRemaining / 1000).toFixed(1)}s
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ===== BUILDING STATUS PANEL =====
function BuildingStatusPanel({ buildingType }: { buildingType: BuildingType }) {
  const building = BUILDINGS[buildingType];

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20, 20, 50, 0.95)',
      border: '2px solid #4a4a8a',
      borderRadius: '12px',
      padding: '15px 25px',
      color: 'white',
      fontFamily: 'monospace',
      minWidth: '500px',
      maxWidth: '700px',
      zIndex: 100,
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={{
          width: 60,
          height: 60,
          background: '#2a2a4a',
          border: '2px solid #6a6a9a',
          borderRadius: '8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
        }}>
          {building.icon}
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#a0a0ff' }}>{building.name}</h3>
          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 12 }}>{building.description}</p>
        </div>
      </div>

      {/* Content based on building type */}
      {buildingType === 'gacha' && <GachaPanel />}
      {buildingType === 'upgrade' && <UpgradePanel />}
      {buildingType === 'quest' && <QuestPanel />}
    </div>
  );
}

// ===== GACHA PANEL =====
function GachaPanel() {
  const [lastPull, setLastPull] = useState<DummyCharacter | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handlePull = (rarity: 'common' | 'rare') => {
    setIsAnimating(true);
    setLastPull(null);

    setTimeout(() => {
      const pool = rarity === 'common'
        ? [...getCharactersByRarity('common'), ...getCharactersByRarity('uncommon')]
        : [...getCharactersByRarity('rare'), ...getCharactersByRarity('epic')];

      const result = pool[Math.floor(Math.random() * pool.length)];
      setLastPull(result);
      setIsAnimating(false);
    }, 800);
  };

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {/* Pull buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => handlePull('common')}
          disabled={isAnimating}
          style={{
            padding: '10px 20px',
            backgroundColor: isAnimating ? '#333' : '#4a90d9',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 12,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
          }}
        >
          🎲 일반 뽑기 (100G)
        </button>
        <button
          onClick={() => handlePull('rare')}
          disabled={isAnimating}
          style={{
            padding: '10px 20px',
            backgroundColor: isAnimating ? '#333' : '#9932cc',
            border: 'none',
            borderRadius: 6,
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 12,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
          }}
        >
          ✨ 고급 뽑기 (500G)
        </button>
      </div>

      {/* Result */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: 16,
        minHeight: 80,
      }}>
        {isAnimating ? (
          <div style={{ color: '#ffd700', fontSize: 18 }}>🎰 뽑는 중...</div>
        ) : lastPull ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 6,
              border: `2px solid ${RARITY_COLORS[lastPull.rarity]}`,
              backgroundColor: RARITY_BG_COLORS[lastPull.rarity],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CharacterPreview characterId={lastPull.id} color={lastPull.color} size={45} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>{lastPull.name}</div>
              <div style={{ color: RARITY_COLORS[lastPull.rarity], fontSize: 11 }}>
                {lastPull.rarity.toUpperCase()}
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 12 }}>뽑기 버튼을 눌러주세요</div>
        )}
      </div>

      {/* Rates */}
      <div style={{ fontSize: 10, color: '#666', lineHeight: 1.6 }}>
        <div><span style={{ color: RARITY_COLORS.common }}>●</span> Common 60%</div>
        <div><span style={{ color: RARITY_COLORS.uncommon }}>●</span> Uncommon 30%</div>
        <div><span style={{ color: RARITY_COLORS.rare }}>●</span> Rare 8%</div>
        <div><span style={{ color: RARITY_COLORS.epic }}>●</span> Epic 2%</div>
      </div>
    </div>
  );
}

// ===== UPGRADE PANEL =====
function UpgradePanel() {
  const [selectedChar, setSelectedChar] = useState<DummyCharacter | null>(null);
  const upgradeableChars = DUMMY_CHARACTERS.filter(c => c.rarity !== 'legendary').slice(0, 8);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      {/* Character list */}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', maxWidth: 280 }}>
        {upgradeableChars.map((char) => (
          <div
            key={char.id}
            onClick={() => setSelectedChar(char)}
            style={{
              width: 45,
              height: 55,
              backgroundColor: RARITY_BG_COLORS[char.rarity],
              border: `2px solid ${selectedChar?.id === char.id ? '#fff' : RARITY_COLORS[char.rarity]}`,
              borderRadius: 4,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <CharacterPreview characterId={char.id} color={char.color} size={30} />
            <div style={{ fontSize: 8, color: '#fff', textAlign: 'center', marginTop: 2 }}>
              {char.name.slice(0, 4)}
            </div>
          </div>
        ))}
      </div>

      {/* Selected character info */}
      <div style={{
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.3)',
        borderRadius: 8,
        padding: 12,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 80,
      }}>
        {selectedChar ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 6,
              border: `2px solid ${RARITY_COLORS[selectedChar.rarity]}`,
              backgroundColor: RARITY_BG_COLORS[selectedChar.rarity],
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              <CharacterPreview characterId={selectedChar.id} color={selectedChar.color} size={45} />
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 4 }}>{selectedChar.name}</div>
              <div style={{ display: 'flex', gap: 12, fontSize: 11 }}>
                <span style={{ color: '#ff6b6b' }}>⚔️ {selectedChar.attack}</span>
                <span style={{ color: '#4dabf7' }}>🛡️ {selectedChar.defense}</span>
                <span style={{ color: '#51cf66' }}>❤️ {selectedChar.hp}</span>
              </div>
            </div>
            <button style={{
              padding: '8px 16px',
              backgroundColor: '#ffd700',
              border: 'none',
              borderRadius: 6,
              color: '#1a1a2e',
              fontWeight: 'bold',
              fontSize: 11,
              cursor: 'pointer',
            }}>
              ⬆️ 강화 (200G)
            </button>
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 12 }}>강화할 캐릭터를 선택하세요</div>
        )}
      </div>
    </div>
  );
}

// ===== QUEST PANEL =====
function QuestPanel() {
  const quests = [
    { id: 1, name: '첫 번째 승리', reward: '100G', progress: 1, total: 1, completed: true },
    { id: 2, name: '몬스터 50마리', reward: '300G', progress: 32, total: 50, completed: false },
    { id: 3, name: '캐릭터 5개 수집', reward: '뽑기권', progress: 3, total: 5, completed: false },
  ];

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {quests.map((quest) => (
        <div
          key={quest.id}
          style={{
            flex: 1,
            padding: 10,
            backgroundColor: quest.completed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0, 0, 0, 0.3)',
            borderRadius: 6,
            border: quest.completed ? '1px solid #22c55e' : '1px solid #333',
          }}
        >
          <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 12, marginBottom: 4 }}>
            {quest.name}
          </div>
          {!quest.completed && (
            <div style={{ marginBottom: 6 }}>
              <div style={{
                width: '100%',
                height: 4,
                backgroundColor: '#333',
                borderRadius: 2,
              }}>
                <div style={{
                  width: `${(quest.progress / quest.total) * 100}%`,
                  height: '100%',
                  backgroundColor: '#4a90d9',
                  borderRadius: 2,
                }} />
              </div>
              <div style={{ color: '#666', fontSize: 9, marginTop: 2 }}>
                {quest.progress}/{quest.total}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ffd700', fontSize: 10 }}>{quest.reward}</span>
            {quest.completed && (
              <button style={{
                padding: '4px 8px',
                backgroundColor: '#22c55e',
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                fontSize: 10,
                cursor: 'pointer',
              }}>
                수령
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
