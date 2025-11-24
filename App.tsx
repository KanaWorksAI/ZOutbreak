import React from 'react';
import { GameScene } from './components/GameScene';
import { UI } from './components/UI';

const App: React.FC = () => {
  return (
    <div className="w-full h-full relative bg-black select-none">
      <GameScene />
      <UI />
    </div>
  );
};

export default App;