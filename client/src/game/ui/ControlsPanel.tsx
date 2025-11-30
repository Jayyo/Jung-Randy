// ===== CONTROLS PANEL UI (Left side info) =====
import { CharacterData, MonsterData } from '../types';

interface ControlsPanelProps {
  characters: CharacterData[];
  monsters: MonsterData[];
  totalMonstersKilled: number;
}

export function ControlsPanel({ characters, monsters, totalMonstersKilled }: ControlsPanelProps) {
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
      <hr style={{ margin: '10px 0', borderColor: '#444' }} />
      <p style={{ margin: '5px 0', color: '#666' }}>Left-drag: Box select</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Right-click: Move</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Wheel: Zoom</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Ctrl+Wheel: Angle</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Middle-drag: Pan</p>
      <p style={{ margin: '5px 0', color: '#666' }}>Shift+click: Add to selection</p>
      <p style={{ margin: '5px 0', color: '#666' }}>C: Recipe panel</p>
    </div>
  );
}
