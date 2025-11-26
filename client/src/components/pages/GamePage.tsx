import { Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { Game3DScene } from '@/game/3d/Game3DScene';

function LoadingScreen() {
  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: '#1a1a2e',
      color: 'white',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '20px' }}>🏛️</div>
      <div style={{ fontSize: '24px', marginBottom: '10px' }}>정랜디 3D</div>
      <div style={{ fontSize: '16px', color: '#888' }}>로딩 중...</div>
      <div style={{
        width: '200px',
        height: '4px',
        background: '#333',
        borderRadius: '2px',
        marginTop: '20px',
        overflow: 'hidden',
      }}>
        <div style={{
          width: '50%',
          height: '100%',
          background: '#3498db',
          animation: 'loading 1s infinite ease-in-out',
        }} />
      </div>
      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}

export function GamePage() {
  const navigate = useNavigate();

  const handleBackToLobby = () => {
    navigate('/');
  };

  return (
    <Suspense fallback={<LoadingScreen />}>
      <Game3DScene onBackToLobby={handleBackToLobby} />
    </Suspense>
  );
}
