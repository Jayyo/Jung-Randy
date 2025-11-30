// ===== STATUS PANEL UI (Bottom Panel) =====
import { useEffect, useState } from 'react';
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

export function StatusPanel({
  selectionTarget,
  characters,
  monsters,
  onUseActiveSkill,
  onSelectCharacter,
  selectedBuilding,
}: StatusPanelProps) {
  const [multiPage, setMultiPage] = useState(0);

  // Reset page when selection target changes
  useEffect(() => {
    setMultiPage(0);
  }, [selectionTarget]);

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
      <div style={panelStyle('monster')}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <div style={portraitBox('#1a1a1a', '#660000', 64, 8)}>👹</div>
          <div style={{ flex: 1 }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#ff6666' }}>
              Wave {monster.wave} Monster
            </h3>
            <StatBar label="HP" value={monster.hp} max={monster.maxHp} />
            <div style={{ display: 'flex', gap: '20px', fontSize: 12, color: '#ccc' }}>
              <span>ATK: {monster.damage}</span>
              <span>DEF: {monster.defense}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Characters selected
  const selectedChars = characters.filter(c => selectionTarget.ids.includes(c.id));
  if (selectedChars.length === 0) return null;

  // Multi-select: paginated grid 9x2 with counter slot
  if (selectedChars.length > 1) {
    const pageSize = 18; // 9x2
    const totalPages = Math.max(1, Math.ceil(selectedChars.length / (pageSize - 1)));
    const pageIndex = Math.min(multiPage, totalPages - 1);
    const pageStart = pageIndex * (pageSize - 1);
    const remaining = Math.max(0, selectedChars.length - (pageStart + (pageSize - 1)));
    const pageSlice = selectedChars.slice(pageStart, pageStart + (pageSize - 1));
    const itemsWithCounter = [...pageSlice, { id: 'counter', remaining }];
    const firstRow = itemsWithCounter.slice(0, 9);
    let secondRow = itemsWithCounter.slice(9, 18);
    if (pageIndex > 0 && secondRow.length === 0) {
      secondRow = [{ id: 'placeholder' }];
    }

    const goNextPage = () => setMultiPage((pageIndex + 1) % totalPages);
    const goPrevPage = () => setMultiPage(pageIndex === 0 ? totalPages - 1 : pageIndex - 1);
    const goFirstPage = () => setMultiPage(0);

    const renderTile = (item: any, key: string) => {
      if (item?.id === 'counter') {
        const counterRemaining = (item as any).remaining as number;
        const label = counterRemaining > 0 ? `+${counterRemaining}` : '↩';
        const handler = counterRemaining > 0 ? goNextPage : goFirstPage;
        return (
          <div key={key} style={counterBox} onClick={handler} title={counterRemaining > 0 ? 'Next page' : 'First page'}>
            {label}
          </div>
        );
      }
      if (item?.id === 'placeholder') {
        return <div key={key} style={{ width: 48, height: 48, borderRadius: 6, opacity: 0 }} />;
      }
      const char = item as CharacterData;
      return (
        <div
          key={key}
          onClick={() => onSelectCharacter(char.id)}
          style={tileBox}
        >
          <div style={{ fontSize: 20 }}>{char.type === 1 ? '🥊' : '💪'}</div>
          <MiniHpBar current={char.currentHp} max={char.stats.maxHp} />
        </div>
      );
    };

    return (
      <div style={panelStyle()}>
        <div style={headerRow}>
          <span>Selected: {selectedChars.length} units</span>
          {totalPages > 1 && (
            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={goPrevPage} style={navBtn} title="Prev">‹</button>
              <button type="button" onClick={goNextPage} style={navBtn} title="Next">›</button>
            </div>
          )}
        </div>
        <div style={gridRow}>
          {firstRow.map((item, idx) => renderTile(item, `row1-${pageIndex}-${idx}`))}
        </div>
        <div style={{ ...gridRow, marginTop: 8 }}>
          {secondRow.map((item, idx) => renderTile(item, `row2-${pageIndex}-${idx}`))}
        </div>
      </div>
    );
  }

  // Single character selected - detailed view
  const char = selectedChars[0];
  const stats = char.stats;
  const activeSkill = stats.skills.active;
  const passiveSkill = stats.skills.passive;
  const canUseActive = !!activeSkill && (Date.now() - char.lastActiveSkillTime > activeSkill.cooldown);
  const activeCooldownRemaining = activeSkill
    ? Math.max(0, activeSkill.cooldown - (Date.now() - char.lastActiveSkillTime))
    : 0;

  return (
    <div style={panelStyle()}>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={portraitBox('#1a3a1a', '#4a7c4a', 80, 8)}>
          {char.type === 1 ? '🥊' : '💪'}
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#90ee90' }}>{stats.name}</h3>
          <StatBar label="HP" value={char.currentHp} max={stats.maxHp} />
          <div style={{ display: 'flex', gap: 15, fontSize: 12, color: '#ccc' }}>
            <span>ATK: {stats.attack}</span>
            <span>DEF: {stats.defense}</span>
            <span>SPD: {stats.attackSpeed.toFixed(1)}/s</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          {passiveSkill && (
            <div
              title={`${passiveSkill.name}: ${passiveSkill.description}\n${Math.round(passiveSkill.triggerChance * 100)}% chance, ${passiveSkill.damageMultiplier}x damage`}
              style={skillBox('#2a2a4a', '#6a6a8a', '#ffffff', 'help')}
            >
              P
            </div>
          )}
          {activeSkill && (
            <div
              onClick={() => canUseActive && onUseActiveSkill(char.id)}
              title={`${activeSkill.name}: ${activeSkill.description}\nCooldown: ${activeSkill.cooldown / 1000}s, ${activeSkill.damageMultiplier}x damage`}
              style={skillBox(
                canUseActive ? '#4a2a2a' : '#2a2a2a',
                canUseActive ? '#ff6666' : '#666',
                '#ffffff',
                canUseActive ? 'pointer' : 'not-allowed',
                !canUseActive,
              )}
            >
              A
              {activeCooldownRemaining > 0 && (
                <div style={{ position: 'absolute', bottom: -18, fontSize: 10, color: '#ff6666' }}>
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

// ===== SMALL COMPONENTS & STYLES =====
const panelStyle = (mode: 'character' | 'monster' = 'character') => ({
  position: 'absolute' as const,
  bottom: 20,
  left: '50%',
  transform: 'translateX(-50%)',
  background: mode === 'monster' ? 'rgba(40, 10, 10, 0.95)' : 'rgba(10, 30, 10, 0.95)',
  border: `2px solid ${mode === 'monster' ? '#8b0000' : '#4a7c4a'}`,
  borderRadius: '12px',
  padding: mode === 'monster' ? '15px 25px' : '15px 20px',
  color: 'white',
  fontFamily: 'monospace',
  minWidth: '640px',
  zIndex: 100,
});

const portraitBox = (bg: string, border: string, size: number, radius: number) => ({
  width: size,
  height: size,
  background: bg,
  border: `2px solid ${border}`,
  borderRadius: radius,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: size / 2,
});

const tileBox = {
  width: '48px',
  height: '48px',
  background: '#1a3a1a',
  border: '2px solid #4a7c4a',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative' as const,
};

const counterBox = {
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
  cursor: 'pointer',
};

const headerRow = {
  fontSize: '12px',
  color: '#aaa',
  marginBottom: '10px',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
} as const;

const navBtn = {
  padding: '4px 8px',
  background: '#2a2a2a',
  border: '1px solid #666',
  borderRadius: 6,
  color: '#fff',
  fontSize: 12,
  cursor: 'pointer',
} as const;

const gridRow = {
  display: 'grid',
  gridTemplateColumns: 'repeat(9, 1fr)',
  gap: '8px',
  maxWidth: '640px',
} as const;

const skillBox = (bg: string, border: string, color: string, cursor: string, dim?: boolean) => ({
  width: '50px',
  height: '50px',
  background: bg,
  border: `2px solid ${border}`,
  borderRadius: '8px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '24px',
  cursor,
  position: 'relative' as const,
  opacity: dim ? 0.6 : 1,
});

function MiniHpBar({ current, max }: { current: number; max: number }) {
  return (
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
        width: `${(current / max) * 100}%`,
        height: '100%',
        background: current > max / 2 ? '#4CAF50' : '#f44336',
      }} />
    </div>
  );
}

function StatBar({ label, value, max }: { label: string; value: number; max: number }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <div style={{ fontSize: 12, color: '#aaa', marginBottom: 2 }}>
        {label}: {value} / {max}
      </div>
      <div style={{
        width: '100%',
        height: 12,
        background: '#333',
        borderRadius: 6,
        overflow: 'hidden',
      }}>
        <div style={{
          width: `${(value / max) * 100}%`,
          height: '100%',
          background: value > max / 2 ? '#4CAF50' : '#f44336',
          transition: 'width 0.2s',
        }} />
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
      minWidth: '640px',
      maxWidth: '700px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={portraitBox('#2a2a4a', '#6a6a9a', 60, 8)}>
          {building.icon}
        </div>
        <div>
          <h3 style={{ margin: 0, color: '#a0a0ff' }}>{building.name}</h3>
          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 12 }}>{building.description}</p>
        </div>
      </div>

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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <button
          onClick={() => handlePull('common')}
          disabled={isAnimating}
          style={pullBtn(isAnimating ? '#333' : '#4a90d9')}
        >
          Common Draw (100G)
        </button>
        <button
          onClick={() => handlePull('rare')}
          disabled={isAnimating}
          style={pullBtn(isAnimating ? '#333' : '#9932cc')}
        >
          Rare Draw (500G)
        </button>
      </div>

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
          <div style={{ color: '#ffd700', fontSize: 18 }}>Drawing...</div>
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
          <div style={{ color: '#666', fontSize: 12 }}>Press draw to get a unit</div>
        )}
      </div>

      <div style={{ fontSize: 10, color: '#666', lineHeight: 1.6 }}>
        <div><span style={{ color: RARITY_COLORS.common }}>●</span> Common 60%</div>
        <div><span style={{ color: RARITY_COLORS.uncommon }}>●</span> Uncommon 30%</div>
        <div><span style={{ color: RARITY_COLORS.rare }}>●</span> Rare 8%</div>
        <div><span style={{ color: RARITY_COLORS.epic }}>●</span> Epic 2%</div>
      </div>
    </div>
  );
}

const pullBtn = (bg: string) => ({
  padding: '10px 20px',
  backgroundColor: bg,
  border: 'none',
  borderRadius: 6,
  color: 'white',
  fontWeight: 'bold',
  fontSize: 12,
  cursor: 'pointer',
});

// ===== UPGRADE PANEL =====
function UpgradePanel() {
  const [selectedChar, setSelectedChar] = useState<DummyCharacter | null>(null);
  const upgradeableChars = DUMMY_CHARACTERS.filter(c => c.rarity !== 'legendary').slice(0, 8);

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
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
                <span style={{ color: '#ff6b6b' }}>ATK {selectedChar.attack}</span>
                <span style={{ color: '#4dabf7' }}>DEF {selectedChar.defense}</span>
                <span style={{ color: '#51cf66' }}>HP {selectedChar.hp}</span>
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
              Upgrade (200G)
            </button>
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 12 }}>Select a character to upgrade</div>
        )}
      </div>
    </div>
  );
}

// ===== QUEST PANEL =====
function QuestPanel() {
  const quests = [
    { id: 1, name: 'First victory', reward: '100G', progress: 1, total: 1, completed: true },
    { id: 2, name: 'Defeat 50 monsters', reward: '300G', progress: 32, total: 50, completed: false },
    { id: 3, name: 'Collect 5 characters', reward: 'Draw ticket', progress: 3, total: 5, completed: false },
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
                Claim
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

