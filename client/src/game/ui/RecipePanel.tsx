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

// Derived recipe lists (filtering from ALL_RECIPES)
const LV1_TO_LV2_RECIPES = ALL_RECIPES.filter(r => r.result === 'random_lv2');
const LV2_TO_LV3_RECIPES = ALL_RECIPES.filter(r => r.result !== 'random_lv2');

interface RecipePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Politician card component
function PoliticianCard({
  politician,
  size = 'normal',
  onClick,
}: {
  politician: Politician;
  size?: 'small' | 'normal' | 'large';
  onClick?: () => void;
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
}: {
  recipe: PoliticianRecipe;
  onPoliticianClick: (pol: Politician) => void;
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
      }}
    >
      {/* Materials */}
      {materials.map((mat, idx) => (
        <div key={mat.id} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <PoliticianCard
            politician={mat}
            size="small"
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
        zIndex: 1001,
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

// Main RecipePanel component
export function RecipePanel({ isOpen, onClose }: RecipePanelProps) {
  const [selectedTier, setSelectedTier] = useState<PoliticianTier | 'all'>('all');
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

  const tiers: (PoliticianTier | 'all')[] = ['all', 'lv1', 'lv2', 'lv3'];

  // Filter recipes by selected tier (result tier)
  const filteredRecipes = (() => {
    if (selectedTier === 'all') return ALL_RECIPES;
    if (selectedTier === 'lv2') return LV1_TO_LV2_RECIPES;
    if (selectedTier === 'lv3') return LV2_TO_LV3_RECIPES;
    return [];
  })();

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
          zIndex: 1000,
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
              gap: 8,
              padding: '10px 16px',
              borderBottom: '1px solid #333',
              backgroundColor: '#0f0f23',
              flexWrap: 'wrap',
            }}
          >
            {tiers.map((tier) => (
              <button
                key={tier}
                onClick={() => setSelectedTier(tier)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: 'none',
                  backgroundColor:
                    selectedTier === tier
                      ? tier === 'all'
                        ? '#666'
                        : TIER_COLORS[tier as PoliticianTier]
                      : '#333',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: selectedTier === tier ? 'bold' : 'normal',
                  fontSize: 12,
                  transition: 'all 0.2s',
                }}
              >
                {tier === 'all' ? '전체' : tier === 'lv2' ? '기초→일반' : tier === 'lv3' ? '일반→중진' : TIER_NAMES[tier as PoliticianTier]}
              </button>
            ))}

            {/* Legend */}
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
              <span style={{ fontSize: 11, color: '#666' }}>정당:</span>
              {Object.entries(PARTY_NAMES).map(([key, name]) => (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      backgroundColor: PARTY_COLORS[key as keyof typeof PARTY_COLORS],
                    }}
                  />
                  <span style={{ fontSize: 10, color: '#888' }}>{name}</span>
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
            {filteredRecipes.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>
                해당 등급의 조합법이 없습니다.
              </div>
            ) : (
              <>
                {/* Lv1 → Lv2 section */}
                {(selectedTier === 'all' || selectedTier === 'lv2') && (
                  <div style={{ marginBottom: 20 }}>
                    <h3 style={{ color: TIER_COLORS.lv2, margin: '0 0 10px 0', fontSize: 14 }}>
                      🔹 {TIER_NAMES.lv1} → {TIER_NAMES.lv2}
                    </h3>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>
                      {TIER_NAMES.lv1} 두 장을 조합하면 27종 {TIER_NAMES.lv2} 중 랜덤 획득
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                        gap: 8,
                      }}
                    >
                      {LV1_TO_LV2_RECIPES.map((recipe) => (
                        <RecipeRow
                          key={recipe.id}
                          recipe={recipe}
                          onPoliticianClick={setSelectedPolitician}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Lv2 → Lv3 section */}
                {(selectedTier === 'all' || selectedTier === 'lv3') && (
                  <div>
                    <h3 style={{ color: TIER_COLORS.lv3, margin: '0 0 10px 0', fontSize: 14 }}>
                      🔷 {TIER_NAMES.lv2} → {TIER_NAMES.lv3}
                    </h3>
                    <div style={{ color: '#888', fontSize: 11, marginBottom: 8 }}>
                      {TIER_NAMES.lv2} 두 장 + {TIER_NAMES.lv1} 한 장 = 특정 {TIER_NAMES.lv3}
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: 8,
                      }}
                    >
                      {LV2_TO_LV3_RECIPES.map((recipe) => (
                        <RecipeRow
                          key={recipe.id}
                          recipe={recipe}
                          onPoliticianClick={setSelectedPolitician}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Footer - Stats */}
          <div
            style={{
              padding: '10px 16px',
              borderTop: '1px solid #333',
              backgroundColor: '#0f0f23',
              color: '#888',
              fontSize: 11,
              textAlign: 'center',
              display: 'flex',
              justifyContent: 'center',
              gap: 20,
            }}
          >
            <span>{TIER_NAMES.lv1}: 2명</span>
            <span>{TIER_NAMES.lv2}: 27명</span>
            <span>{TIER_NAMES.lv3}: 26명</span>
            <span>총 조합법: {ALL_RECIPES.length}개</span>
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
