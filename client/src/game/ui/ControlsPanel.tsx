// ===== CONTROLS PANEL UI (Left side info) =====
import { CharacterData, MonsterData, TargetingMode } from '../types';

interface ControlsPanelProps {
  characters: CharacterData[];
  monsters: MonsterData[];
  totalMonstersKilled: number;
  targetingMode: TargetingMode;
  onChangeTargetingMode: (mode: TargetingMode) => void;
  onSkipWave: () => void;
}

export function ControlsPanel({
  characters,
  monsters,
  totalMonstersKilled,
  targetingMode,
  onChangeTargetingMode,
  onSkipWave,
}: ControlsPanelProps) {
  const targetingOptions: { id: TargetingMode; label: string }[] = [
    { id: 'closest', label: '가장 가까움' },
    { id: 'lowest_hp', label: '체력 낮음' },
    { id: 'highest_hp', label: '체력 높음' },
    { id: 'boss_first', label: '보스 우선' },
    { id: 'clustered', label: '군집 우선' },
  ];

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: 20,
      zIndex: 100,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '15px',
      borderRadius: '8px',
      fontFamily: 'monospace'
    }}>
      <h2 style={{ margin: '0 0 10px 0' }}>3D Game</h2>
      <p style={{ margin: '5px 0', color: '#888' }}>Characters: {characters.length}</p>
      <p style={{ margin: '5px 0', color: '#888' }}>Monsters alive: {monsters.filter(m => !m.isDying).length}</p>
      <p style={{ margin: '5px 0', color: '#888' }}>Total kills: {totalMonstersKilled}</p>
      <div style={{ margin: '10px 0' }}>
        <div style={{ marginBottom: 6, color: '#bbb', fontWeight: 700, fontSize: 12 }}>타겟 우선순위</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {targetingOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onChangeTargetingMode(opt.id)}
              style={{
                padding: '6px 8px',
                borderRadius: 8,
                border: targetingMode === opt.id ? '1px solid #ffd700' : '1px solid #333',
                background: targetingMode === opt.id ? 'rgba(255, 215, 0, 0.12)' : 'rgba(255, 255, 255, 0.06)',
                color: '#fff',
                fontSize: 11,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
      {import.meta.env.DEV && (
        <div style={{ margin: '8px 0' }}>
          <button
            onClick={onSkipWave}
            style={{
              width: '100%',
              padding: '8px 10px',
              borderRadius: 8,
              border: '1px solid #ff6b6b',
              background: 'rgba(255, 107, 107, 0.12)',
              color: '#fff',
              fontSize: 11,
              cursor: 'pointer',
              fontWeight: 700,
            }}
          >
            다음 웨이브 (디버그)
          </button>
        </div>
      )}
      <hr style={{ margin: '10px 0', borderColor: '#444' }} />
      <p style={{ margin: '5px 0', color: '#666' }}>Left-drag: Box select</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Right-click: Move</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Wheel: Zoom</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Ctrl+Wheel: Angle</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Middle-drag: Pan</p>
      <p style={{ margin: '5px 0', color: '#666' }}>X: Toggle pointer lock + pan</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Shift+click: Add to selection</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Ctrl+Number: Assign control group</p>
      <p style={{ margin: '5px 0', color: '#666' }}>C: Recipe panel</p>
      <p style={{ margin: '5px 0', color: '#666' }}>S: Unit stop</p>
    </div>
  );
}
