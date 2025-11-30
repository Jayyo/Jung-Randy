// ===== WAVE INFO UI =====
import {
  WAVE_CONFIG,
  isBossWave,
  MAX_ACTIVE_MONSTERS,
} from '../gameData';
import { formatCountdown, getMonsterLimitColor } from '../controllers/waveController';

interface WaveInfoProps {
  currentWave: number;
  waveTimeLeftMs: number;
  monstersAlive: number;
}

export function WaveInfo({ currentWave, waveTimeLeftMs, monstersAlive }: WaveInfoProps) {
  const isBoss = isBossWave(currentWave);
  const limitColor = getMonsterLimitColor(monstersAlive);

  return (
    <div style={{
      position: 'absolute',
      top: 20,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 100,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px 30px',
      borderRadius: '8px',
      fontFamily: 'monospace',
      textAlign: 'center',
      minWidth: '280px',
    }}>
      <div style={{ fontSize: '20px', fontWeight: 'bold', color: isBoss ? '#ff0000' : '#ff9900' }}>
        {isBoss ? '⚠ BOSS WAVE' : 'Wave'} {currentWave} / {WAVE_CONFIG.totalWaves}
      </div>
      {isBoss && (
        <div style={{ fontSize: '14px', color: '#888' }}>
          Boss status: {monstersAlive > 0 ? 'Alive !' : 'Defeated ✔'}
        </div>
      )}
      <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 12, color: '#ccc' }}>
          Alive: <span style={{ color: limitColor, fontWeight: 'bold' }}>{monstersAlive}</span> / {MAX_ACTIVE_MONSTERS}
        </div>
        <div style={{ fontSize: 12, color: '#ccc' }}>
          Next wave in {formatCountdown(waveTimeLeftMs)}
        </div>
      </div>
    </div>
  );
}
