import { useState } from 'react';

// ===== LOBBY OVERLAY =====
// Local-only lobby feel: create a lobby code, set nickname, then start (no guest add).

interface LobbyOverlayProps {
  onStart: () => void;
}

function generateLobbyCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export function LobbyOverlay({ onStart }: LobbyOverlayProps) {
  const [hostName, setHostName] = useState('호스트');
  const [lobbyCode, setLobbyCode] = useState(generateLobbyCode());
  const [lobbyReady, setLobbyReady] = useState(false);

  const canStart = lobbyReady;

  const handleToggleReady = () => {
    const safeHostName = hostName.trim() || '호스트';
    setHostName(safeHostName);
    setLobbyReady(prev => !prev);
  };

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: 'linear-gradient(135deg, #0f172a 0%, #111827 50%, #0b1020 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 300,
        padding: 16,
      }}
    >
      <div
        style={{
          background: 'rgba(12, 18, 35, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.6)',
          borderRadius: 16,
          padding: '28px 32px',
          width: 420,
          color: '#e5e7eb',
          fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        }}
      >
        <div style={{ marginBottom: 18 }}>
          <p
            style={{
              fontSize: 12,
              letterSpacing: 2,
              textTransform: 'uppercase',
              color: '#9ca3af',
              margin: 0,
            }}
          >
            Politician Random Defense
          </p>
          <h1
            style={{
              margin: '8px 0 6px',
              fontSize: 26,
              color: '#f9fafb',
              fontWeight: 800,
            }}
          >
            로비를 만들고 입장하세요
          </h1>
          <p style={{ margin: 0, color: '#94a3b8', fontSize: 13, lineHeight: 1.5 }}>
            온라인 연동은 아직 없지만, 로비처럼 준비한 뒤 시작 버튼으로 게임을 진행할 수 있습니다.
          </p>
        </div>

        {/* Lobby code + actions */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr auto',
            gap: 10,
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 10,
              padding: '12px 14px',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ fontSize: 11, color: '#94a3b8', letterSpacing: 1 }}>LOBBY CODE</span>
              <span style={{ fontSize: 20, fontWeight: 800, color: '#f9fafb', letterSpacing: 2 }}>
                {lobbyCode}
              </span>
            </div>
            <button
              onClick={() => setLobbyCode(generateLobbyCode())}
              disabled={lobbyReady}
              style={{
                padding: '10px 12px',
                borderRadius: 10,
                border: '1px solid rgba(255, 255, 255, 0.12)',
                background: lobbyReady ? 'rgba(255, 255, 255, 0.06)' : 'rgba(255, 255, 255, 0.04)',
                color: '#e5e7eb',
                cursor: lobbyReady ? 'not-allowed' : 'pointer',
                fontWeight: 700,
                opacity: lobbyReady ? 0.6 : 1,
                minWidth: 120,
              }}
            >
              코드 새로고침
            </button>
          </div>
          <button
            onClick={handleToggleReady}
            style={{
              height: '100%',
              padding: '12px 16px',
              borderRadius: 10,
              border: 'none',
              background: lobbyReady
                ? 'linear-gradient(90deg, #38bdf8 0%, #0ea5e9 100%)'
                : 'linear-gradient(90deg, #6366f1 0%, #4f46e5 100%)',
              color: '#0b1020',
              fontWeight: 800,
              fontSize: 14,
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(99, 102, 241, 0.35)',
              minWidth: 104,
            }}
          >
            {lobbyReady ? '준비 해제' : '준비'}
          </button>
        </div>

        {/* Host name input */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr',
            gap: 8,
            marginBottom: 16,
          }}
        >
          <label style={{ fontSize: 12, color: '#cbd5e1', display: 'flex', gap: 6, alignItems: 'center' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#22c55e',
                color: '#0b1020',
                fontWeight: 800,
                fontSize: 11,
              }}
            >
              H
            </span>
            호스트 이름
          </label>
          <input
            value={hostName}
            onChange={(e) => setHostName(e.target.value)}
            placeholder="호스트 이름 입력"
            style={{
              padding: '12px 12px',
              borderRadius: 10,
              border: '1px solid rgba(255, 255, 255, 0.08)',
              background: 'rgba(255, 255, 255, 0.04)',
              color: '#f8fafc',
              outline: 'none',
              fontSize: 14,
            }}
          />
        </div>

        {/* Host summary */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 14,
                background: '#22c55e',
                color: '#0b1020',
                fontWeight: 800,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {hostName.slice(0, 2).toUpperCase()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ fontWeight: 700, color: '#f8fafc' }}>{hostName}</span>
              <span style={{ fontSize: 11, color: '#94a3b8' }}>방장 (로컬)</span>
            </div>
          </div>
          <span style={{ fontSize: 12, color: '#94a3b8' }}>게스트 추가 없음</span>
        </div>

        {/* Tips */}
        <div
          style={{
            display: 'grid',
            gap: 8,
            background: 'rgba(255, 255, 255, 0.02)',
            borderRadius: 12,
            padding: 12,
            marginBottom: 16,
            border: '1px solid rgba(255, 255, 255, 0.03)',
          }}
        >
          {[
            'C 키: 조합표 열기 / 닫기',
            'Q/W/E/R: 스킬 사용 (선택된 유닛)',
            '마우스 드래그: 유닛 다중 선택',
            '스페이스: 선택 그룹 이동',
          ].map((tip) => (
            <div
              key={tip}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                fontSize: 12,
                color: '#cbd5e1',
              }}
            >
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.4)',
                }}
              />
              {tip}
            </div>
          ))}
        </div>

        <button
          onClick={onStart}
          disabled={!canStart}
          style={{
            width: '100%',
            padding: '15px 0',
            borderRadius: 12,
            border: 'none',
            background: canStart
              ? 'linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)'
              : 'linear-gradient(90deg, #9ca3af 0%, #6b7280 100%)',
            color: '#0b1020',
            fontWeight: 800,
            fontSize: 15,
            cursor: canStart ? 'pointer' : 'not-allowed',
            boxShadow: canStart ? '0 10px 30px rgba(251, 191, 36, 0.35)' : 'none',
            transition: 'transform 0.15s ease, box-shadow 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (!canStart) return;
            e.currentTarget.style.transform = 'translateY(-1px)';
            e.currentTarget.style.boxShadow = '0 12px 32px rgba(251, 191, 36, 0.45)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = canStart
              ? '0 10px 30px rgba(251, 191, 36, 0.35)'
              : 'none';
          }}
        >
          게임 시작
        </button>
      </div>
    </div>
  );
}
