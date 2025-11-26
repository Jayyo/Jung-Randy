import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LobbyPage } from './components/pages/LobbyPage';
import { GamePage } from './components/pages/GamePage';
import { TierListPage } from './components/pages/TierListPage';
import SimpleTestScene from './game/3d-test/SimpleTestScene';
import SeamlessAnimationExample from './game/3d-test/SeamlessAnimationExample';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/game" element={<GamePage />} />
        <Route path="/tierlist" element={<TierListPage />} />
        <Route path="/test" element={<SimpleTestScene />} />
        <Route path="/test-seamless" element={<SeamlessAnimationExample />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
