// ===== RECIPE PANEL UI =====
// Shows politician combination recipes: Material1 + Material2 (+ Material3) = Result

import { useState, useEffect } from 'react';
import {
  ALL_POLITICIANS,
  ALL_RECIPES,
  TIER_COLORS,
  TIER_BG_COLORS,
  TIER_NAMES,
  PARTY_COLORS,
  PARTY_NAMES,
  getPoliticianById,
  type Politician,
  type PoliticianTier,
  type PoliticianRecipe,
} from '../data/politicians';

import { CharacterPreview, preloadCharacterPreviews } from './CharacterPreview';

// Derive recipe lists by result tier (computed once at module load)
function groupRecipesByResultTier() {
  const result: Record<string, typeof ALL_RECIPES> = {
    lv2: [],
    lv3: [],
    lv4: [],
    lv5: [],
    lv6: [],
    x: [],
    z: [],
  };
  for (const recipe of ALL_RECIPES) {
    if (recipe.result === 'random_lv2') {
      result.lv2.push(recipe);
      continue;
    }
    const politician = getPoliticianById(recipe.result);
    if (politician && result[politician.tier]) {
      result[politician.tier].push(recipe);
    }
  }
  return result;
}

const RECIPES_BY_TIER = groupRecipesByResultTier();

interface RecipePanelProps {
  isOpen: boolean;
  onClose: () => void;
  ownedPoliticianIds: Set<string>;
}

// Politician card component
function PoliticianCard({
  politician,
  size = 'normal',
  onClick,
  owned = true,
}: {
  politician: Politician;
  size?: 'small' | 'normal' | 'large';
  onClick?: () => void;
  owned?: boolean;
}) {
  const sizeStyles = {
    small: { width: 55, height: 75, fontSize: 9, iconSize: 28 },
    normal: { width: 75, height: 95, fontSize: 11, iconSize: 38 },
    large: { width: 100, height: 130, fontSize: 14, iconSize: 50 },
  };

  const s = sizeStyles[size];

  return (
    <div
      onClick={onClick}
      style={{
        width: s.width,
        height: s.height,
        backgroundColor: TIER_BG_COLORS[politician.tier],
        border: `2px solid ${TIER_COLORS[politician.tier]}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: `0 0 10px ${TIER_COLORS[politician.tier]}40`,
        position: 'relative',
        opacity: owned ? 1 : 0.4,
        filter: owned ? 'none' : 'grayscale(1)',
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = `0 0 20px ${TIER_COLORS[politician.tier]}80`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = `0 0 10px ${TIER_COLORS[politician.tier]}40`;
      }}
    >
      {/* Party indicator */}
      <div
        style={{
          position: 'absolute',
          top: 2,
          right: 2,
          width: 8,
          height: 8,
          borderRadius: '50%',
          backgroundColor: PARTY_COLORS[politician.party],
        }}
      />
      {/* Character 3D preview */}
      <div
        style={{
          width: s.iconSize,
          height: s.iconSize,
          marginBottom: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: 4,
        }}
      >
        <CharacterPreview
          characterId={politician.id}
          color={politician.color}
          size={s.iconSize}
        />
      </div>
      {/* Politician name */}
      <div
        style={{
          fontSize: s.fontSize,
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px #000',
          padding: '0 2px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {politician.name}
      </div>
      {/* Tier badge */}
      <div
        style={{
          fontSize: s.fontSize - 2,
          color: TIER_COLORS[politician.tier],
          fontWeight: 'bold',
        }}
      >
        {TIER_NAMES[politician.tier]}
      </div>
    </div>
  );
}

// Recipe row component
function RecipeRow({
  recipe,
  onPoliticianClick,
  ownedPoliticianIds,
}: {
  recipe: PoliticianRecipe;
  onPoliticianClick: (pol: Politician) => void;
  ownedPoliticianIds: Set<string>;
}) {
  const materials = recipe.materials.map(id => getPoliticianById(id)!).filter(Boolean);

  // Handle random result
  const isRandomResult = recipe.result === 'random_lv2';
  const result = isRandomResult ? null : getPoliticianById(recipe.result);

  if (!materials.every(m => m)) return null;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        padding: '6px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 8,
        position: 'relative',
        zIndex: 0, // keep rows below popups/tooltips
      }}
    >
      {/* Materials */}
      {materials.map((mat, idx) => (
        <div
          key={`${mat.id}-${idx}`}
          style={{ display: 'flex', alignItems: 'center', gap: 3 }}
        >
          <PoliticianCard
            politician={mat}
            size="small"
            owned={ownedPoliticianIds.has(mat.id)}
            onClick={() => onPoliticianClick(mat)}
          />
          {idx < materials.length - 1 && (
            <span style={{ fontSize: 14, color: '#fff', fontWeight: 'bold' }}>+</span>
          )}
        </div>
      ))}

      {/* Arrow */}
      <span style={{ fontSize: 16, color: '#ffd700', fontWeight: 'bold', margin: '0 4px' }}>
        →
      </span>

      {/* Result */}
      {isRandomResult ? (
        <div
          style={{
            width: 75,
            height: 95,
            backgroundColor: '#2a2a4a',
            border: '2px dashed #666',
            borderRadius: 8,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: 24 }}>🎲</span>
          <span style={{ fontSize: 10, color: '#888', marginTop: 4 }}>랜덤 {TIER_NAMES.lv2}</span>
          <span style={{ fontSize: 8, color: '#666' }}>(27종)</span>
        </div>
      ) : result ? (
        <PoliticianCard
          politician={result}
          size="normal"
          owned={ownedPoliticianIds.has(result.id)}
          onClick={() => onPoliticianClick(result)}
        />
      ) : null}
    </div>
  );
}

// Politician detail popup
function PoliticianDetail({
  politician,
  onClose,
}: {
  politician: Politician;
  onClose: () => void;
}) {
  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3001,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: TIER_BG_COLORS[politician.tier],
          border: `3px solid ${TIER_COLORS[politician.tier]}`,
          borderRadius: 16,
          padding: 24,
          minWidth: 320,
          maxWidth: 400,
          boxShadow: `0 0 30px ${TIER_COLORS[politician.tier]}60`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              border: `3px solid ${TIER_COLORS[politician.tier]}`,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
          >
            <CharacterPreview
              characterId={politician.id}
              color={politician.color}
              size={80}
            />
          </div>
          <div>
            <h2 style={{ color: '#fff', margin: 0, fontSize: 22 }}>{politician.name}</h2>
            <div style={{ display: 'flex', gap: 8, marginTop: 4, alignItems: 'center' }}>
              <span
                style={{
                  color: TIER_COLORS[politician.tier],
                  fontWeight: 'bold',
                  fontSize: 13,
                }}
              >
                {TIER_NAMES[politician.tier]}
              </span>
              <span
                style={{
                  backgroundColor: PARTY_COLORS[politician.party],
                  color: '#fff',
                  padding: '2px 8px',
                  borderRadius: 10,
                  fontSize: 11,
                  fontWeight: 'bold',
                }}
              >
                {politician.partyDetail || PARTY_NAMES[politician.party]}
              </span>
            </div>
            {politician.terms && (
              <div style={{ color: '#aaa', fontSize: 12, marginTop: 4 }}>
                {politician.terms}선 의원
              </div>
            )}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 12,
            marginBottom: 16,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#ff6b6b', fontSize: 22, fontWeight: 'bold' }}>
              {politician.attack}
            </div>
            <div style={{ color: '#aaa', fontSize: 11 }}>공격력</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4dabf7', fontSize: 22, fontWeight: 'bold' }}>
              {politician.defense}
            </div>
            <div style={{ color: '#aaa', fontSize: 11 }}>방어력</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#51cf66', fontSize: 22, fontWeight: 'bold' }}>
              {politician.hp}
            </div>
            <div style={{ color: '#aaa', fontSize: 11 }}>체력</div>
          </div>
        </div>

        {/* Skill (if any) */}
        {politician.hasSkill && politician.skillName && (
          <div
            style={{
              backgroundColor: 'rgba(255, 215, 0, 0.1)',
              border: '1px solid #ffd700',
              borderRadius: 8,
              padding: 12,
              marginBottom: 12,
            }}
          >
            <div style={{ color: '#ffd700', fontWeight: 'bold', fontSize: 13, marginBottom: 4 }}>
              ⭐ {politician.skillName}
            </div>
            <div style={{ color: '#ddd', fontSize: 12 }}>
              {politician.skillDescription}
            </div>
          </div>
        )}

        {/* Role & Committee */}
        {(politician.role || politician.committee) && (
          <div style={{ marginBottom: 12 }}>
            {politician.role && (
              <span
                style={{
                  backgroundColor: '#333',
                  color: '#aaa',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  marginRight: 6,
                }}
              >
                {politician.role}
              </span>
            )}
            {politician.committee && (
              <span
                style={{
                  backgroundColor: '#333',
                  color: '#aaa',
                  padding: '3px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                }}
              >
                {politician.committee}
              </span>
            )}
          </div>
        )}

        {/* Description */}
        <p style={{ color: '#ccc', fontSize: 13, lineHeight: 1.5, margin: 0 }}>
          {politician.description}
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '10px 20px',
            backgroundColor: TIER_COLORS[politician.tier],
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 'bold',
            cursor: 'pointer',
            fontSize: 14,
          }}
        >
          닫기
        </button>
      </div>
    </div>
  );
}

// Tab ID type for recipe panel
type RecipeTabId = 'all' | 'lv2' | 'lv3' | 'lv4' | 'lv5' | 'lv6' | 'x' | 'z';

// Main RecipePanel component
export function RecipePanel({ isOpen, onClose, ownedPoliticianIds }: RecipePanelProps) {
  const [selectedTab, setSelectedTab] = useState<RecipeTabId>('all');
  const [selectedPolitician, setSelectedPolitician] = useState<Politician | null>(null);

  // Preload all character previews when panel opens
  useEffect(() => {
    if (isOpen) {
      preloadCharacterPreviews(
        ALL_POLITICIANS.map(p => ({ id: p.id, color: p.color }))
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Tab configuration for all tiers
  const tabs: { id: RecipeTabId; label: string; color: string }[] = [
    { id: 'all', label: '전체', color: '#666' },
    { id: 'lv2', label: '기초→일반', color: TIER_COLORS.lv2 },
    { id: 'lv3', label: '일반→중진', color: TIER_COLORS.lv3 },
    { id: 'lv4', label: '중진→거물', color: TIER_COLORS.lv4 },
    { id: 'lv5', label: '거물→대통령', color: TIER_COLORS.lv5 },
    { id: 'lv6', label: '대통령→현직', color: TIER_COLORS.lv6 },
    { id: 'x', label: 'X티어', color: TIER_COLORS.x },
    { id: 'z', label: 'Z티어', color: TIER_COLORS.z },
  ];

  // Get recipes for current selection
  const getRecipesForTab = (tabId: RecipeTabId) => {
    if (tabId === 'all') return ALL_RECIPES;
    return RECIPES_BY_TIER[tabId] || [];
  };

  // Tier section configuration for rendering
  const tierSections: { tier: RecipeTabId; from: string; to: string; icon: string }[] = [
    { tier: 'lv2', from: TIER_NAMES.lv1, to: TIER_NAMES.lv2, icon: '🔹' },
    { tier: 'lv3', from: TIER_NAMES.lv2, to: TIER_NAMES.lv3, icon: '🔷' },
    { tier: 'lv4', from: TIER_NAMES.lv3, to: TIER_NAMES.lv4, icon: '🔮' },
    { tier: 'lv5', from: TIER_NAMES.lv4, to: TIER_NAMES.lv5, icon: '⭐' },
    { tier: 'lv6', from: TIER_NAMES.lv5, to: TIER_NAMES.lv6, icon: '🔥' },
    { tier: 'x', from: '', to: TIER_NAMES.x, icon: '💫' },
    { tier: 'z', from: '', to: TIER_NAMES.z, icon: '✨' },
  ];

  return (
    <>
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 3000, // keep above in-game nametags
        }}
        onClick={onClose}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: '#1a1a2e',
            borderRadius: 16,
            width: '95%',
            maxWidth: 850,
            maxHeight: '85vh',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            border: '2px solid #333',
            boxShadow: '0 0 40px rgba(0, 0, 0, 0.5)',
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: '14px 20px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#16213e',
            }}
          >
            <h2 style={{ margin: 0, color: '#ffd700', fontSize: 18 }}>📖 정치인 조합법</h2>
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

          {/* Tier filter tabs */}
          <div
            style={{
              display: 'flex',
              gap: 6,
              padding: '10px 16px',
              borderBottom: '1px solid #333',
              backgroundColor: '#0f0f23',
              flexWrap: 'wrap',
            }}
          >
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                style={{
                  padding: '5px 10px',
                  borderRadius: 16,
                  border: 'none',
                  backgroundColor: selectedTab === tab.id ? tab.color : '#333',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: selectedTab === tab.id ? 'bold' : 'normal',
                  fontSize: 11,
                  transition: 'all 0.2s',
                }}
              >
                {tab.label}
              </button>
            ))}

            {/* Legend */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
              <span style={{ fontSize: 10, color: '#666' }}>정당:</span>
              {Object.entries(PARTY_NAMES).map(([key, name]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: PARTY_COLORS[key as keyof typeof PARTY_COLORS],
                    }}
                  />
                  <span style={{ fontSize: 9, color: '#888' }}>{name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recipe list */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 12,
            }}
          >
            {getRecipesForTab(selectedTab).length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>
                해당 등급의 조합법이 없습니다.
              </div>
            ) : (
              <>
                {tierSections
                  .filter(section => selectedTab === 'all' || selectedTab === section.tier)
                  .map((section) => {
                    const recipes = RECIPES_BY_TIER[section.tier];
                    if (!recipes || recipes.length === 0) return null;

                    const tierColor = section.tier === 'x' || section.tier === 'z'
                      ? TIER_COLORS[section.tier]
                      : TIER_COLORS[section.tier as PoliticianTier];

                    return (
                      <div key={section.tier} style={{ marginBottom: 20 }}>
                        <h3 style={{ color: tierColor, margin: '0 0 10px 0', fontSize: 14 }}>
                          {section.icon} {section.from ? `${section.from} → ${section.to}` : section.to}
                        </h3>
                        <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>
                          {section.tier === 'lv2' && `${TIER_NAMES.lv1} 두 장을 조합하면 27종 ${TIER_NAMES.lv2} 중 랜덤 획득`}
                          {section.tier === 'lv3' && `${TIER_NAMES.lv2} 2명 + ${TIER_NAMES.lv1} 1명 = ${TIER_NAMES.lv3}`}
                          {section.tier === 'lv4' && `${TIER_NAMES.lv3} 2명 + ${TIER_NAMES.lv2} 1명 = ${TIER_NAMES.lv4}`}
                          {section.tier === 'lv5' && `${TIER_NAMES.lv4} 2명 + ${TIER_NAMES.lv3} 1명 = ${TIER_NAMES.lv5}`}
                          {section.tier === 'lv6' && `${TIER_NAMES.lv5} 2명 + Z티어 1명 = ${TIER_NAMES.lv6}`}
                          {section.tier === 'x' && '특별 조합으로 획득하는 대선후보 폼'}
                          {section.tier === 'z' && '특별 조합으로 획득하는 상징 폼'}
                        </div>
                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                            gap: 8,
                          }}
                        >
                          {recipes.map((recipe) => (
                            <RecipeRow
                              key={recipe.id}
                              recipe={recipe}
                              ownedPoliticianIds={ownedPoliticianIds}
                              onPoliticianClick={setSelectedPolitician}
                            />
                          ))}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>

          {/* Footer - Stats */}
          <div
            style={{
              padding: '8px 16px',
              borderTop: '1px solid #333',
              backgroundColor: '#0f0f23',
              color: '#888',
              fontSize: 10,
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              gap: 12,
              flexWrap: 'wrap',
            }}
          >
            <span>총 {ALL_POLITICIANS.length}명</span>
            <span>조합법 {ALL_RECIPES.length}개</span>
            <span style={{ color: '#666' }}>|</span>
            <span>Lv2: {RECIPES_BY_TIER.lv2.length}</span>
            <span>Lv3: {RECIPES_BY_TIER.lv3.length}</span>
            <span>Lv4: {RECIPES_BY_TIER.lv4.length}</span>
            <span>Lv5: {RECIPES_BY_TIER.lv5.length}</span>
            <span>Lv6: {RECIPES_BY_TIER.lv6.length}</span>
            <span>X: {RECIPES_BY_TIER.x.length}</span>
            <span>Z: {RECIPES_BY_TIER.z.length}</span>
          </div>
        </div>
      </div>

      {/* Politician detail popup */}
      {selectedPolitician && (
        <PoliticianDetail
          politician={selectedPolitician}
          onClose={() => setSelectedPolitician(null)}
        />
      )}
    </>
  );
}
