// ===== STATUS PANEL UI (Bottom Panel) =====
import { useEffect, useState, useMemo } from 'react';
import { CharacterData, MonsterData, SelectionTarget } from '../types';
import { BuildingType, BUILDINGS } from '../buildings';
import {
  getCombinationOptions,
  checkMaterialAvailability,
  CombinationOption,
  TIER_COLORS,
  TIER_NAMES,
  PARTY_COLORS,
  PARTY_NAMES,
  LV2_POLITICIANS,
  LV3_POLITICIANS,
  LV4_POLITICIANS,
  type Politician,
} from '../data/politicians';

interface StatusPanelProps {
  selectionTarget: SelectionTarget;
  characters: CharacterData[];
  monsters: MonsterData[];
  onUseActiveSkill: (charId: string) => void;
  onSelectCharacter: (id: string) => void;
  onCombine?: (option: CombinationOption, materialCharIds: string[]) => void;
  onRallySameUnits: (charId: string) => void;
  selectedBuilding?: BuildingType | null;
}

export function StatusPanel({
  selectionTarget,
  characters,
  monsters,
  onUseActiveSkill,
  onSelectCharacter,
  onCombine,
  onRallySameUnits,
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
              웨이브 {monster.wave} 몬스터
            </h3>
            <StatBar label="체력" value={monster.hp} max={monster.maxHp} />
            <div style={{ display: 'flex', gap: '20px', fontSize: 12, color: '#ccc' }}>
              <span>방어력: {monster.defense}</span>
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
    const itemsWithCounter: (CharacterData | { id: string; remaining: number })[] = [...pageSlice, { id: 'counter', remaining }];
    const firstRow = itemsWithCounter.slice(0, 9);
    let secondRow = itemsWithCounter.slice(9, 18);
    if (pageIndex > 0 && secondRow.length === 0) {
      secondRow = [{ id: 'placeholder', remaining: 0 }];
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
  const sameTypeCount = characters.filter(c => c.stats.id === stats.id && c.id !== char.id).length;

  // If politician is selected, show combination panel
  if (char.politician && onCombine) {
    return (
      <PoliticianStatusPanel
        char={char}
        characters={characters}
        onCombine={onCombine}
        onRallySameUnits={onRallySameUnits}
      />
    );
  }

  return (
    <div style={panelStyle()}>
      <div style={{ display: 'flex', gap: 20 }}>
        <div style={portraitBox('#1a3a1a', '#4a7c4a', 80, 8)}>
          {char.type === 1 ? '🥊' : '💪'}
        </div>

        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#90ee90' }}>{stats.name}</h3>
          <div style={{ display: 'flex', gap: 15, fontSize: 12, color: '#ccc' }}>
            <span>공격력: {stats.attack}</span>
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
        <button
          type="button"
          onClick={() => onRallySameUnits(char.id)}
          style={{ ...primaryBtn, opacity: sameTypeCount === 0 ? 0.5 : 1, cursor: sameTypeCount === 0 ? 'not-allowed' : 'pointer' }}
          disabled={sameTypeCount === 0}
          title={sameTypeCount === 0 ? '같은 유닛이 없어서 집결 불가' : '선택한 유닛 위치로 같은 유닛 집결'}
        >
          집결 ({sameTypeCount})
        </button>
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
  width: '52px',
  height: '52px',
  background: '#1a3a1a',
  border: '2px solid #4a7c4a',
  borderRadius: '6px',
  cursor: 'pointer',
  display: 'flex',
  flexDirection: 'column' as const,
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative' as const,
  fontWeight: 800,
  fontSize: 18,
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

const primaryBtn = {
  padding: '10px 14px',
  background: '#d946ef',
  border: '1px solid #f472b6',
  borderRadius: 8,
  color: '#fff',
  fontWeight: 700,
  fontSize: 12,
  cursor: 'pointer',
  minWidth: 120,
} as const;

const skillBox = (bg: string, border: string, _color: string, cursor: string, dim?: boolean) => ({
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

  // Building-specific accent colors
  const accentColors: Record<BuildingType, string> = {
    gacha: '#22c55e',    // Green for 공천위원회
    upgrade: '#3b82f6',  // Blue for 정치스쿨
    quest: '#f59e0b',    // Orange for 출마 캠프
  };

  const accent = accentColors[buildingType];

  return (
    <div style={{
      position: 'absolute',
      bottom: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(20, 20, 40, 0.95)',
      border: `2px solid ${accent}`,
      borderRadius: '12px',
      padding: '15px 25px',
      color: 'white',
      fontFamily: 'monospace',
      minWidth: '640px',
      maxWidth: '700px',
      zIndex: 100,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <div style={portraitBox(`${accent}22`, accent, 60, 8)}>
          {building.icon}
        </div>
        <div>
          <h3 style={{ margin: 0, color: accent }}>{building.name}</h3>
          <p style={{ margin: '4px 0 0 0', color: '#888', fontSize: 12 }}>{building.description}</p>
        </div>
      </div>

      {buildingType === 'gacha' && <GachaPanelCompact />}
      {buildingType === 'upgrade' && <UpgradePanelCompact />}
      {buildingType === 'quest' && <QuestPanelCompact />}
    </div>
  );
}

// ===== GACHA PANEL COMPACT - 공천위원회 =====
type GachaTierCompact = 'lv2' | 'lv3' | 'lv4';
const GACHA_POOLS: Record<GachaTierCompact, { pool: Politician[]; cost: number; label: string }> = {
  lv2: { pool: LV2_POLITICIANS, cost: 200, label: '일반의원' },
  lv3: { pool: LV3_POLITICIANS, cost: 500, label: '핵심중진' },
  lv4: { pool: LV4_POLITICIANS, cost: 1200, label: '원외거물' },
};

function GachaPanelCompact() {
  const [selectedTier, setSelectedTier] = useState<GachaTierCompact>('lv2');
  const [lastPull, setLastPull] = useState<Politician | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  const handlePull = () => {
    const { pool } = GACHA_POOLS[selectedTier];
    setIsAnimating(true);
    setLastPull(null);

    setTimeout(() => {
      const result = pool[Math.floor(Math.random() * pool.length)];
      setLastPull(result);
      setIsAnimating(false);
    }, 800);
  };

  const config = GACHA_POOLS[selectedTier];

  return (
    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {(Object.keys(GACHA_POOLS) as GachaTierCompact[]).map((tier) => {
          const tierConfig = GACHA_POOLS[tier];
          const isSelected = selectedTier === tier;
          return (
            <button
              key={tier}
              onClick={() => setSelectedTier(tier)}
              disabled={isAnimating}
              style={{
                padding: '8px 14px',
                backgroundColor: isSelected ? TIER_COLORS[tier] : '#333',
                border: `1px solid ${isSelected ? TIER_COLORS[tier] : '#555'}`,
                borderRadius: 6,
                color: '#fff',
                fontSize: 11,
                cursor: isAnimating ? 'not-allowed' : 'pointer',
                opacity: isAnimating ? 0.6 : 1,
              }}
            >
              {tierConfig.label} ({tierConfig.cost}G)
            </button>
          );
        })}
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
          <div style={{ color: '#ffd700', fontSize: 16 }}>🏛️ 공천 심사중...</div>
        ) : lastPull ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 50,
              height: 50,
              borderRadius: 6,
              border: `2px solid ${TIER_COLORS[lastPull.tier]}`,
              backgroundColor: `${TIER_COLORS[lastPull.tier]}22`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 24,
            }}>
              👤
            </div>
            <div>
              <div style={{ color: '#fff', fontWeight: 'bold' }}>{lastPull.name}</div>
              <div style={{ display: 'flex', gap: 6, fontSize: 10 }}>
                <span style={{ color: TIER_COLORS[lastPull.tier] }}>{TIER_NAMES[lastPull.tier]}</span>
                <span style={{ color: PARTY_COLORS[lastPull.party] }}>{PARTY_NAMES[lastPull.party]}</span>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: '#666', fontSize: 12 }}>공천 버튼을 눌러주세요</div>
        )}
      </div>

      <button
        onClick={handlePull}
        disabled={isAnimating}
        style={{
          padding: '12px 20px',
          backgroundColor: isAnimating ? '#333' : TIER_COLORS[selectedTier],
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 'bold',
          fontSize: 13,
          cursor: isAnimating ? 'not-allowed' : 'pointer',
        }}
      >
        🏛️ 공천!
        <div style={{ fontSize: 10, opacity: 0.8 }}>{config.cost}G</div>
      </button>
    </div>
  );
}

// ===== UPGRADE PANEL COMPACT - 정치스쿨 =====
// Global tier upgrade - affects all units of that tier
function UpgradePanelCompact() {
  const [tierLevels, setTierLevels] = useState<Record<string, number>>({
    lv2: 0, lv3: 0, lv4: 0,
  });

  const tiers = [
    { id: 'lv2', label: '일반의원', icon: '🔷', count: LV2_POLITICIANS.length, cost: 300 },
    { id: 'lv3', label: '핵심중진', icon: '🔮', count: LV3_POLITICIANS.length, cost: 800 },
    { id: 'lv4', label: '원외거물', icon: '⭐', count: LV4_POLITICIANS.length, cost: 2000 },
  ];

  const handleUpgrade = (tierId: string) => {
    setTierLevels({ ...tierLevels, [tierId]: tierLevels[tierId] + 1 });
  };

  return (
    <div style={{ display: 'flex', gap: 12 }}>
      {tiers.map((tier) => {
        const level = tierLevels[tier.id];
        const cost = Math.floor(tier.cost * Math.pow(1.5, level));
        return (
          <div
            key={tier.id}
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.3)',
              borderRadius: 8,
              padding: 12,
              border: `1px solid ${TIER_COLORS[tier.id as keyof typeof TIER_COLORS]}`,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 24, marginBottom: 4 }}>{tier.icon}</div>
            <div style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>{tier.label}</div>
            <div style={{ color: '#888', fontSize: 9 }}>{tier.count}명</div>
            <div style={{ color: '#ffd700', fontSize: 14, fontWeight: 'bold', margin: '6px 0' }}>
              Lv.{level}
            </div>
            <button
              onClick={() => handleUpgrade(tier.id)}
              style={{
                padding: '4px 10px',
                backgroundColor: TIER_COLORS[tier.id as keyof typeof TIER_COLORS],
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                fontSize: 10,
                cursor: 'pointer',
              }}
            >
              강화 ({cost}G)
            </button>
          </div>
        );
      })}
    </div>
  );
}

// ===== QUEST PANEL COMPACT - 출마 캠프 =====
function QuestPanelCompact() {
  const campaigns = [
    { id: 1, name: '기초의원 보궐', reward: '500G', difficulty: 1, completed: true },
    { id: 2, name: '광역의회 재보선', reward: '1,200G', difficulty: 2, completed: false },
    { id: 3, name: '국회의원 재선거', reward: '2,500G', difficulty: 3, completed: false },
  ];

  const getDifficultyColor = (d: number) => ['#22c55e', '#eab308', '#ef4444'][d - 1] || '#888';

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {campaigns.map((campaign) => (
        <div
          key={campaign.id}
          style={{
            flex: 1,
            padding: 10,
            backgroundColor: campaign.completed ? 'rgba(34, 197, 94, 0.15)' : 'rgba(0, 0, 0, 0.3)',
            borderRadius: 6,
            border: campaign.completed ? '1px solid #22c55e' : `1px solid ${getDifficultyColor(campaign.difficulty)}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
            <span style={{ fontSize: 14 }}>{campaign.completed ? '✓' : '🗳️'}</span>
            <span style={{ color: '#fff', fontWeight: 'bold', fontSize: 11 }}>
              {campaign.name}
            </span>
          </div>
          <div style={{ color: getDifficultyColor(campaign.difficulty), fontSize: 10, marginBottom: 4 }}>
            {'⭐'.repeat(campaign.difficulty)}{'☆'.repeat(3 - campaign.difficulty)}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: '#ffd700', fontSize: 10 }}>💰 {campaign.reward}</span>
            {campaign.completed ? (
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
            ) : (
              <button style={{
                padding: '4px 8px',
                backgroundColor: getDifficultyColor(campaign.difficulty),
                border: 'none',
                borderRadius: 4,
                color: '#fff',
                fontSize: 10,
                cursor: 'pointer',
              }}>
                출마
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// ===== POLITICIAN STATUS PANEL =====
interface PoliticianStatusPanelProps {
  char: CharacterData;
  characters: CharacterData[];
  onCombine: (option: CombinationOption, materialCharIds: string[]) => void;
  onRallySameUnits: (charId: string) => void;
}

function PoliticianStatusPanel({ char, characters, onCombine, onRallySameUnits }: PoliticianStatusPanelProps) {
  const politician = char.politician!;
  const partyColor = PARTY_COLORS[politician.party];
  const tierColor = TIER_COLORS[politician.tier];
  const sameTypeCount = characters.filter(c => c.stats.id === char.stats.id && c.id !== char.id).length;

  // Get combination options for this politician
  const combinationOptions = useMemo(() => {
    return getCombinationOptions(politician.id);
  }, [politician.id]);

  // Check material availability for each option
  const optionsWithAvailability = useMemo(() => {
    return combinationOptions.map(option => {
      const availability = checkMaterialAvailability(option, characters, char.id);
      return { option, availability };
    });
  }, [combinationOptions, characters, char.id]);

  const handleCombine = (option: CombinationOption, availability: ReturnType<typeof checkMaterialAvailability>) => {
    if (!availability.canCombine) return;

    // Collect material character IDs from all materials
    const materialCharIds: string[] = [];

    for (const mat of availability.materials) {
      // Add character IDs for this material
      for (const charId of mat.characterIds) {
        if (!materialCharIds.includes(charId)) {
          materialCharIds.push(charId);
        }
      }
    }

    onCombine(option, materialCharIds);
  };

  return (
    <div style={{
      ...panelStyle('character'),
      background: 'rgba(20, 20, 40, 0.95)',
      border: `2px solid ${partyColor}`,
      padding: '15px 20px',
      minWidth: '640px',
    }}>
      <div style={{ display: 'flex', gap: 20 }}>
        {/* Portrait */}
        <div style={{
          width: 80,
          height: 80,
          background: `linear-gradient(135deg, ${partyColor}33, ${partyColor}11)`,
          border: `3px solid ${partyColor}`,
          borderRadius: 8,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
        }}>
          <div style={{
            padding: '2px 6px',
            borderRadius: 4,
            background: tierColor,
            color: 'white',
            fontSize: 9,
            fontWeight: 'bold',
            marginBottom: 4,
          }}>
            {TIER_NAMES[politician.tier]}
          </div>
          <div style={{ fontSize: 24 }}>🧑‍💼</div>
        </div>

        {/* Info */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
            <h3 style={{ margin: 0, color: partyColor }}>{politician.name}</h3>
            <span style={{
              padding: '2px 8px',
              borderRadius: 4,
              background: `${partyColor}33`,
              color: partyColor,
              fontSize: 11,
            }}>
              {PARTY_NAMES[politician.party]}
            </span>
            <button
              type="button"
              onClick={() => onRallySameUnits(char.id)}
              disabled={sameTypeCount === 0}
              title={sameTypeCount === 0 ? '같은 유닛이 없어서 집결 불가' : '선택한 유닛 위치로 같은 유닛 집결'}
              style={{
                ...primaryBtn,
                padding: '6px 10px',
              opacity: sameTypeCount === 0 ? 0.5 : 1,
              cursor: sameTypeCount === 0 ? 'not-allowed' : 'pointer',
            }}
          >
            집결 ({sameTypeCount})
          </button>
        </div>
        <div style={{ display: 'flex', gap: 15, fontSize: 12, color: '#ccc' }}>
          <span>공격력: {char.stats.attack}</span>
        </div>
        </div>

        {/* Combination Options - Compact with tooltip */}
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
          minWidth: 160,
        }}>
          <div style={{ fontSize: 11, color: '#888', marginBottom: 2 }}>조합</div>
          {optionsWithAvailability.length === 0 ? (
            <div style={{ color: '#666', fontSize: 11 }}>최고 등급</div>
          ) : (
            optionsWithAvailability.map(({ option, availability }, idx) => {
              // Build tooltip text
              const materialText = availability.materials
                .map(m => `${m.name} (${m.available}/${m.required})`)
                .join(' + ');
              const tooltipText = `${option.description}\n\n재료: ${materialText}`;

              return (
                <div
                  key={idx}
                  onClick={() => handleCombine(option, availability)}
                  title={tooltipText}
                  style={{
                    padding: '6px 10px',
                    background: availability.canCombine
                      ? 'rgba(76, 175, 80, 0.2)'
                      : 'rgba(100, 100, 100, 0.2)',
                    border: `1px solid ${availability.canCombine ? '#4CAF50' : '#555'}`,
                    borderRadius: 4,
                    cursor: availability.canCombine ? 'pointer' : 'not-allowed',
                    opacity: availability.canCombine ? 1 : 0.6,
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 6,
                  }}
                >
                  <span style={{
                    fontSize: 11,
                    fontWeight: 'bold',
                    color: availability.canCombine ? '#4CAF50' : '#888',
                  }}>
                    {option.label}
                  </span>
                  {option.isRandom && (
                    <span style={{
                      fontSize: 8,
                      padding: '1px 3px',
                      background: '#ffd700',
                      color: '#1a1a2e',
                      borderRadius: 2,
                    }}>
                      ?
                    </span>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
