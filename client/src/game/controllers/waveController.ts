// ===== WAVE CONTROLLER UTILITIES =====
// Centralized helpers for wave timing and limit coloring

export interface WaveTickState {
  waveTimeLeft: number;
  spawnTimeLeft: number;
}

export interface WaveTicker {
  stop: () => void;
}

interface WaveTickerOptions {
  totalWaveMs: number;
  spawnMs: number;
  onTick: (state: WaveTickState) => void;
}

export function startWaveTickers({ totalWaveMs, spawnMs, onTick }: WaveTickerOptions): WaveTicker {
  const startedAt = Date.now();

  const tick = () => {
    const elapsed = Date.now() - startedAt;
    const waveTimeLeft = Math.max(0, totalWaveMs - elapsed);
    const spawnTimeLeft = Math.max(0, spawnMs - elapsed);
    onTick({ waveTimeLeft, spawnTimeLeft });
  };

  tick();
  const interval = setInterval(tick, 200);

  return {
    stop: () => clearInterval(interval),
  };
}

export function scheduleWaveEnd(durationMs: number, onComplete: () => void): () => void {
  const timer = setTimeout(onComplete, durationMs);
  return () => clearTimeout(timer);
}

export function formatCountdown(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const m = Math.floor(totalSeconds / 60).toString().padStart(1, '0');
  const s = (totalSeconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function getMonsterLimitColor(count: number): string {
  if (count >= 150) return '#ff4444';
  if (count >= 100) return '#ff9900';
  return '#4caf50';
}
