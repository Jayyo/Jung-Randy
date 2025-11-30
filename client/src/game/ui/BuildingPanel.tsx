// ===== BUILDING PANEL UI =====
// Shows different panels based on selected building type

import { useState } from 'react';
import { BuildingType, BUILDINGS } from '../buildings/types';
import {
  DUMMY_CHARACTERS,
  RARITY_COLORS,
  RARITY_BG_COLORS,
  getCharactersByRarity,
  type DummyCharacter,
  type Rarity,
} from '../data/dummyCharacters';
import { CharacterPreview } from './CharacterPreview';

interface BuildingPanelProps {
  selectedBuilding: BuildingType | null;
  onClose: () => void;
}

export function BuildingPanel({ selectedBuilding, onClose }: BuildingPanelProps) {
  if (!selectedBuilding) return null;

  const building = BUILDINGS[selectedBuilding];

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 280,
        backgroundColor: 'rgba(20, 20, 40, 0.95)',
        borderTop: '2px solid #444',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 200,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '12px 20px',
          borderBottom: '1px solid #333',
          backgroundColor: 'rgba(30, 30, 60, 0.9)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 28 }}>{building.icon}</span>
          <div>
            <h3 style={{ margin: 0, color: '#fff', fontSize: 18 }}>{building.name}</h3>
            <p style={{ margin: 0, color: '#888', fontSize: 12 }}>{building.description}</p>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            color: '#fff',
            fontSize: 24,
            cursor: 'pointer',
            padding: '4px 8px',
          }}
        >
          ✕
        </button>
      </div>

      {/* Content - different for each building type */}
      <div style={{ flex: 1, overflow: 'auto', padding: 16 }}>
        {selectedBuilding === 'gacha' && <GachaContent />}
        {selectedBuilding === 'upgrade' && <UpgradeContent />}
        {selectedBuilding === 'quest' && <QuestContent />}
      </div>
    </div>
  );
}

// ===== GACHA CONTENT =====
function GachaContent() {
  const [lastPull, setLastPull] = useState<DummyCharacter | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handlePull = (cost: number, rarity: 'common' | 'rare') => {
    setIsAnimating(true);
    setLastPull(null);

    // Simulate pull animation
    setTimeout(() => {
      const pool = rarity === 'common'
        ? [...getCharactersByRarity('common'), ...getCharactersByRarity('uncommon')]
        : [...getCharactersByRarity('rare'), ...getCharactersByRarity('epic')];

      const result = pool[Math.floor(Math.random() * pool.length)];
      setLastPull(result);
      setIsAnimating(false);
    }, 1000);
  };

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Pull buttons */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <button
          onClick={() => handlePull(100, 'common')}
          disabled={isAnimating}
          style={{
            padding: '16px 32px',
            backgroundColor: isAnimating ? '#444' : '#4a90d9',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 14,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          🎲 일반 뽑기
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>100 골드</div>
        </button>

        <button
          onClick={() => handlePull(500, 'rare')}
          disabled={isAnimating}
          style={{
            padding: '16px 32px',
            backgroundColor: isAnimating ? '#444' : '#9932cc',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 'bold',
            fontSize: 14,
            cursor: isAnimating ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s',
          }}
        >
          ✨ 고급 뽑기
          <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>500 골드</div>
        </button>
      </div>

      {/* Result display */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 12,
          minWidth: 200,
        }}
      >
        {isAnimating ? (
          <div style={{ color: '#ffd700', fontSize: 24, animation: 'pulse 0.5s infinite' }}>
            🎰 뽑는 중...
          </div>
        ) : lastPull ? (
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                width: 80,
                height: 80,
                margin: '0 auto 12px',
                borderRadius: 8,
                border: `3px solid ${RARITY_COLORS[lastPull.rarity]}`,
                backgroundColor: RARITY_BG_COLORS[lastPull.rarity],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <CharacterPreview
                characterId={lastPull.id}
                color={lastPull.color}
                size={70}
              />
            </div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>{lastPull.name}</div>
            <div style={{ color: RARITY_COLORS[lastPull.rarity], fontSize: 12 }}>
              {lastPull.rarity.toUpperCase()}
            </div>
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 14 }}>뽑기 버튼을 눌러주세요</div>
        )}
      </div>

      {/* Rates info */}
      <div
        style={{
          padding: 16,
          backgroundColor: 'rgba(0, 0, 0, 0.2)',
          borderRadius: 8,
          fontSize: 12,
          color: '#888',
        }}
      >
        <div style={{ fontWeight: 'bold', marginBottom: 8, color: '#aaa' }}>확률 정보</div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: RARITY_COLORS.common }}>Common</span>: 60%
        </div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: RARITY_COLORS.uncommon }}>Uncommon</span>: 30%
        </div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: RARITY_COLORS.rare }}>Rare</span>: 8%
        </div>
        <div style={{ marginBottom: 4 }}>
          <span style={{ color: RARITY_COLORS.epic }}>Epic</span>: 1.9%
        </div>
        <div>
          <span style={{ color: RARITY_COLORS.legendary }}>Legendary</span>: 0.1%
        </div>
      </div>
    </div>
  );
}

// ===== UPGRADE CONTENT =====
function UpgradeContent() {
  const [selectedChar, setSelectedChar] = useState<DummyCharacter | null>(null);

  // Get upgradeable characters (common to epic, not legendary)
  const upgradeableChars = DUMMY_CHARACTERS.filter(c => c.rarity !== 'legendary');

  return (
    <div style={{ display: 'flex', gap: 20, height: '100%' }}>
      {/* Character list */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          maxWidth: 400,
          overflowY: 'auto',
          padding: 4,
        }}
      >
        {upgradeableChars.map((char) => (
          <div
            key={char.id}
            onClick={() => setSelectedChar(char)}
            style={{
              width: 60,
              height: 75,
              backgroundColor: RARITY_BG_COLORS[char.rarity],
              border: `2px solid ${selectedChar?.id === char.id ? '#fff' : RARITY_COLORS[char.rarity]}`,
              borderRadius: 6,
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s',
            }}
          >
            <CharacterPreview characterId={char.id} color={char.color} size={35} />
            <div
              style={{
                fontSize: 9,
                color: '#fff',
                textAlign: 'center',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
                padding: '0 2px',
              }}
            >
              {char.name}
            </div>
          </div>
        ))}
      </div>

      {/* Upgrade panel */}
      <div
        style={{
          flex: 1,
          backgroundColor: 'rgba(0, 0, 0, 0.3)',
          borderRadius: 12,
          padding: 20,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {selectedChar ? (
          <>
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: 8,
                border: `3px solid ${RARITY_COLORS[selectedChar.rarity]}`,
                backgroundColor: RARITY_BG_COLORS[selectedChar.rarity],
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <CharacterPreview characterId={selectedChar.id} color={selectedChar.color} size={70} />
            </div>
            <div style={{ color: '#fff', fontWeight: 'bold', marginBottom: 8 }}>{selectedChar.name}</div>

            <div style={{ display: 'flex', gap: 20, marginBottom: 16, fontSize: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#ff6b6b' }}>{selectedChar.attack}</div>
                <div style={{ color: '#888', fontSize: 10 }}>공격력</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#4dabf7' }}>{selectedChar.defense}</div>
                <div style={{ color: '#888', fontSize: 10 }}>방어력</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#51cf66' }}>{selectedChar.hp}</div>
                <div style={{ color: '#888', fontSize: 10 }}>체력</div>
              </div>
            </div>

            <button
              style={{
                padding: '10px 24px',
                backgroundColor: '#ffd700',
                border: 'none',
                borderRadius: 8,
                color: '#1a1a2e',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              ⬆️ 강화하기 (200 골드)
            </button>
          </>
        ) : (
          <div style={{ color: '#666' }}>강화할 캐릭터를 선택하세요</div>
        )}
      </div>
    </div>
  );
}

// ===== QUEST CONTENT =====
function QuestContent() {
  const quests = [
    { id: 1, name: '첫 번째 승리', description: '웨이브 1 클리어', reward: '100 골드', progress: 1, total: 1, completed: true },
    { id: 2, name: '몬스터 사냥꾼', description: '몬스터 50마리 처치', reward: '300 골드', progress: 32, total: 50, completed: false },
    { id: 3, name: '수집가', description: '캐릭터 5개 수집', reward: '뽑기권 1장', progress: 3, total: 5, completed: false },
    { id: 4, name: '강화 마스터', description: '캐릭터 강화 3회', reward: '500 골드', progress: 0, total: 3, completed: false },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {quests.map((quest) => (
        <div
          key={quest.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 16,
            padding: '12px 16px',
            backgroundColor: quest.completed ? 'rgba(34, 197, 94, 0.1)' : 'rgba(0, 0, 0, 0.3)',
            borderRadius: 8,
            border: quest.completed ? '1px solid #22c55e' : '1px solid #333',
          }}
        >
          {/* Quest icon */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              backgroundColor: quest.completed ? '#22c55e' : '#444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
            }}
          >
            {quest.completed ? '✓' : '📜'}
          </div>

          {/* Quest info */}
          <div style={{ flex: 1 }}>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 14 }}>{quest.name}</div>
            <div style={{ color: '#888', fontSize: 12 }}>{quest.description}</div>
            {!quest.completed && (
              <div style={{ marginTop: 4 }}>
                <div
                  style={{
                    width: '100%',
                    height: 4,
                    backgroundColor: '#333',
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${(quest.progress / quest.total) * 100}%`,
                      height: '100%',
                      backgroundColor: '#4a90d9',
                    }}
                  />
                </div>
                <div style={{ color: '#666', fontSize: 10, marginTop: 2 }}>
                  {quest.progress} / {quest.total}
                </div>
              </div>
            )}
          </div>

          {/* Reward */}
          <div style={{ textAlign: 'right' }}>
            <div style={{ color: '#ffd700', fontSize: 12 }}>{quest.reward}</div>
            {quest.completed && (
              <button
                style={{
                  marginTop: 4,
                  padding: '4px 12px',
                  backgroundColor: '#22c55e',
                  border: 'none',
                  borderRadius: 4,
                  color: '#fff',
                  fontSize: 12,
                  cursor: 'pointer',
                }}
              >
                수령
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
