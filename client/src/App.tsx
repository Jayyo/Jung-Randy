import { BrowserRouter, Routes, Route } from 'react-router-dom';
import SimpleTestScene from './game/SimpleTestScene';
import TestMapViewer from './game/TestMapViewer';
import MaterialTestViewer from './game/MaterialTestViewer';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SimpleTestScene />} />
        <Route path="/test" element={<TestMapViewer />} />
        <Route path="/material-test" element={<MaterialTestViewer />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
