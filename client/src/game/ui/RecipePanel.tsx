// ===== RECIPE PANEL UI =====
// Shows character combination recipes: Material1 + Material2 = Result

import { useState, useEffect } from 'react';
import {
  DUMMY_CHARACTERS,
  RECIPES,
  RARITY_COLORS,
  RARITY_BG_COLORS,
  getCharacterById,
  type DummyCharacter,
  type Rarity,
} from '../data/dummyCharacters';
import { CharacterPreview, preloadCharacterPreviews } from './CharacterPreview';

interface RecipePanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// Character card component
function CharacterCard({
  character,
  size = 'normal',
  onClick,
}: {
  character: DummyCharacter;
  size?: 'small' | 'normal' | 'large';
  onClick?: () => void;
}) {
  const sizeStyles = {
    small: { width: 60, height: 80, fontSize: 10, iconSize: 30 },
    normal: { width: 80, height: 100, fontSize: 12, iconSize: 40 },
    large: { width: 100, height: 130, fontSize: 14, iconSize: 50 },
  };

  const s = sizeStyles[size];

  return (
    <div
      onClick={onClick}
      style={{
        width: s.width,
        height: s.height,
        backgroundColor: RARITY_BG_COLORS[character.rarity],
        border: `2px solid ${RARITY_COLORS[character.rarity]}`,
        borderRadius: 8,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'transform 0.2s, box-shadow 0.2s',
        boxShadow: `0 0 10px ${RARITY_COLORS[character.rarity]}40`,
      }}
      onMouseEnter={(e) => {
        if (onClick) {
          e.currentTarget.style.transform = 'scale(1.05)';
          e.currentTarget.style.boxShadow = `0 0 20px ${RARITY_COLORS[character.rarity]}80`;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = `0 0 10px ${RARITY_COLORS[character.rarity]}40`;
      }}
    >
      {/* Character 3D preview */}
      <div
        style={{
          width: s.iconSize,
          height: s.iconSize,
          marginBottom: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          borderRadius: 4,
        }}
      >
        <CharacterPreview
          characterId={character.id}
          color={character.color}
          size={s.iconSize}
        />
      </div>
      {/* Character name */}
      <div
        style={{
          fontSize: s.fontSize,
          color: '#fff',
          textAlign: 'center',
          fontWeight: 'bold',
          textShadow: '1px 1px 2px #000',
          padding: '0 4px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          width: '100%',
        }}
      >
        {character.name}
      </div>
      {/* Rarity badge */}
      <div
        style={{
          fontSize: s.fontSize - 2,
          color: RARITY_COLORS[character.rarity],
          fontWeight: 'bold',
        }}
      >
        {character.rarity.toUpperCase()}
      </div>
    </div>
  );
}

// Recipe row component
function RecipeRow({
  materialIds,
  resultId,
  onCharacterClick,
}: {
  materialIds: string[];
  resultId: string;
  onCharacterClick: (char: DummyCharacter) => void;
}) {
  const materials = materialIds.map(id => getCharacterById(id)!);
  const result = getCharacterById(resultId)!;

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '8px 10px',
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
        borderRadius: 8,
      }}
    >
      {/* Materials */}
      {materials.map((mat, idx) => (
        <div key={mat.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <CharacterCard
            character={mat}
            size="small"
            onClick={() => onCharacterClick(mat)}
          />
          {idx < materials.length - 1 && (
            <span style={{ fontSize: 16, color: '#fff', fontWeight: 'bold' }}>+</span>
          )}
        </div>
      ))}

      {/* Arrow */}
      <span style={{ fontSize: 18, color: '#ffd700', fontWeight: 'bold', margin: '0 4px' }}>
        →
      </span>

      {/* Result */}
      <CharacterCard
        character={result}
        size="normal"
        onClick={() => onCharacterClick(result)}
      />
    </div>
  );
}

// Character detail popup
function CharacterDetail({
  character,
  onClose,
}: {
  character: DummyCharacter;
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
          backgroundColor: RARITY_BG_COLORS[character.rarity],
          border: `3px solid ${RARITY_COLORS[character.rarity]}`,
          borderRadius: 16,
          padding: 24,
          minWidth: 300,
          boxShadow: `0 0 30px ${RARITY_COLORS[character.rarity]}60`,
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
          <div
            style={{
              width: 80,
              height: 80,
              borderRadius: 8,
              border: `3px solid ${RARITY_COLORS[character.rarity]}`,
              overflow: 'hidden',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'rgba(0,0,0,0.3)',
            }}
          >
            <CharacterPreview
              characterId={character.id}
              color={character.color}
              size={80}
            />
          </div>
          <div>
            <h2 style={{ color: '#fff', margin: 0, fontSize: 24 }}>{character.name}</h2>
            <span
              style={{
                color: RARITY_COLORS[character.rarity],
                fontWeight: 'bold',
                fontSize: 14,
              }}
            >
              {character.rarity.toUpperCase()}
            </span>
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
            <div style={{ color: '#ff6b6b', fontSize: 24, fontWeight: 'bold' }}>
              {character.attack}
            </div>
            <div style={{ color: '#aaa', fontSize: 12 }}>공격력</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#4dabf7', fontSize: 24, fontWeight: 'bold' }}>
              {character.defense}
            </div>
            <div style={{ color: '#aaa', fontSize: 12 }}>방어력</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <div style={{ color: '#51cf66', fontSize: 24, fontWeight: 'bold' }}>
              {character.hp}
            </div>
            <div style={{ color: '#aaa', fontSize: 12 }}>체력</div>
          </div>
        </div>

        {/* Description */}
        <p style={{ color: '#ccc', fontSize: 14, lineHeight: 1.5 }}>
          {character.description}
        </p>

        {/* Close button */}
        <button
          onClick={onClose}
          style={{
            marginTop: 16,
            width: '100%',
            padding: '10px 20px',
            backgroundColor: RARITY_COLORS[character.rarity],
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
  const [selectedRarity, setSelectedRarity] = useState<Rarity | 'all'>('all');
  const [selectedCharacter, setSelectedCharacter] = useState<DummyCharacter | null>(null);

  // Preload all character previews when panel opens
  useEffect(() => {
    if (isOpen) {
      preloadCharacterPreviews(
        DUMMY_CHARACTERS.map(c => ({ id: c.id, color: c.color }))
      );
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const rarities: (Rarity | 'all')[] = ['all', 'common', 'uncommon', 'rare', 'epic', 'legendary'];

  // Filter recipes by selected rarity (result rarity)
  const filteredRecipes = RECIPES.filter((recipe) => {
    if (selectedRarity === 'all') return true;
    const result = getCharacterById(recipe.result);
    return result?.rarity === selectedRarity;
  });

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
            width: '90%',
            maxWidth: 700,
            maxHeight: '80vh',
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
              padding: '16px 20px',
              borderBottom: '1px solid #333',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#16213e',
            }}
          >
            <h2 style={{ margin: 0, color: '#ffd700', fontSize: 20 }}>📖 조합법</h2>
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

          {/* Rarity filter tabs */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              padding: '12px 16px',
              borderBottom: '1px solid #333',
              backgroundColor: '#0f0f23',
              flexWrap: 'wrap',
            }}
          >
            {rarities.map((rarity) => (
              <button
                key={rarity}
                onClick={() => setSelectedRarity(rarity)}
                style={{
                  padding: '8px 16px',
                  borderRadius: 20,
                  border: 'none',
                  backgroundColor:
                    selectedRarity === rarity
                      ? rarity === 'all'
                        ? '#666'
                        : RARITY_COLORS[rarity as Rarity]
                      : '#333',
                  color: '#fff',
                  cursor: 'pointer',
                  fontWeight: selectedRarity === rarity ? 'bold' : 'normal',
                  fontSize: 12,
                  transition: 'all 0.2s',
                }}
              >
                {rarity === 'all' ? '전체' : rarity.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Recipe list - 2 columns grid */}
          <div
            style={{
              flex: 1,
              overflow: 'auto',
              padding: 16,
            }}
          >
            {filteredRecipes.length === 0 ? (
              <div style={{ color: '#666', textAlign: 'center', padding: 40 }}>
                해당 등급의 조합법이 없습니다.
              </div>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 8,
                }}
              >
                {filteredRecipes.map((recipe) => (
                  <RecipeRow
                    key={recipe.id}
                    materialIds={recipe.materials}
                    resultId={recipe.result}
                    onCharacterClick={setSelectedCharacter}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer - Character count */}
          <div
            style={{
              padding: '12px 16px',
              borderTop: '1px solid #333',
              backgroundColor: '#0f0f23',
              color: '#888',
              fontSize: 12,
              textAlign: 'center',
            }}
          >
            총 {DUMMY_CHARACTERS.length}개 캐릭터 | {RECIPES.length}개 조합법
          </div>
        </div>
      </div>

      {/* Character detail popup */}
      {selectedCharacter && (
        <CharacterDetail
          character={selectedCharacter}
          onClose={() => setSelectedCharacter(null)}
        />
      )}
    </>
  );
}
