import { useGameStore } from '../store';
import { audioManager } from '../audioSystem';
import { GameStatus } from '../types';

export const UI = () => {
  const { hp, maxHp, score, level, status, startGame, resetGame, ammo, maxAmmo, isReloading, coins } = useGameStore();

  const handleStart = () => {
    audioManager.resume();
    audioManager.playMusic();
    startGame();
  };

  const handleRestart = () => {
    resetGame();
    setTimeout(() => {
        audioManager.playMusic();
        startGame();
    }, 100);
  }

  if (status === GameStatus.START) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 text-green-500 z-50 font-mono">
        <h1 className="text-6xl font-bold mb-4 tracking-tighter text-red-600 animate-pulse">Z-OUTBREAK</h1>
        <div className="border border-green-800 p-8 bg-black/50 rounded-lg max-w-md text-center backdrop-blur-md">
            <p className="mb-6 text-lg text-gray-300">
                Survive 10 waves of the undead.<br/>
                Every 3rd wave brings a Boss.<br/>
                <br/>
                <span className="text-yellow-400 font-bold">CONTROLS</span><br/>
                WASD: Move<br/>
                Mouse: Aim<br/>
                R: Reload (20 Rounds)<br/>
                Auto-Shoot when Locked On
            </p>
            <button 
                onClick={handleStart}
                className="px-8 py-4 bg-green-700 hover:bg-green-600 text-white font-bold rounded text-xl transition-all shadow-[0_0_15px_rgba(0,255,0,0.5)] hover:scale-105"
            >
                ENTER COMBAT
            </button>
        </div>
      </div>
    );
  }

  if (status === GameStatus.GAME_OVER) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-900/90 text-white z-50 font-mono">
        <h1 className="text-8xl font-black mb-4 animate-bounce">YOU DIED</h1>
        <p className="text-2xl mb-2">Score: {score} | Coins: {coins}</p>
        <p className="text-xl mb-8">Level Reached: {level}</p>
        <button 
            onClick={handleRestart}
            className="px-8 py-3 bg-black hover:bg-gray-800 border-2 border-white text-white font-bold rounded text-xl transition-all hover:scale-110"
        >
            TRY AGAIN
        </button>
      </div>
    );
  }

  if (status === GameStatus.VICTORY) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-blue-900/90 text-white z-50 font-mono">
        <h1 className="text-6xl font-black mb-4 text-yellow-300 shadow-lg">SURVIVOR!</h1>
        <p className="text-2xl mb-4">You survived the outbreak.</p>
        <p className="text-xl mb-8">Final Score: {score} | Total Coins: {coins}</p>
        <button 
            onClick={handleRestart}
            className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded text-xl transition-all hover:scale-110"
        >
            PLAY AGAIN
        </button>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none z-10 p-4 font-mono">
        {/* Crosshair */}
        <div className={`crosshair ${isReloading ? 'opacity-20' : 'opacity-100'}`}></div>
        
        {/* Reloading Warning */}
        {isReloading && (
             <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-8 text-red-500 font-bold tracking-widest animate-pulse">
                 RELOADING...
             </div>
        )}

        {/* HUD Header */}
        <div className="flex justify-between items-start">
            <div className="bg-black/70 p-3 border-l-4 border-green-500 skew-x-[-10deg]">
                <div className="skew-x-[10deg]">
                    <div className="text-xs text-green-300">SCORE</div>
                    <div className="text-2xl text-white font-bold tracking-widest">{score.toString().padStart(6, '0')}</div>
                </div>
            </div>
            
            <div className="flex flex-col items-center">
                <div className="bg-black/70 p-3 border-b-4 border-yellow-500 text-center min-w-[120px]">
                    <div className="text-xs text-yellow-300 tracking-widest">WAVE</div>
                    <div className="text-4xl text-white font-bold">{level} / 10</div>
                    {level % 3 === 0 && <div className="text-red-500 font-black text-xs animate-bounce mt-1">!!! BOSS !!!</div>}
                </div>
                
                {/* Coin Display */}
                <div className="mt-2 bg-black/60 px-4 py-2 rounded border border-yellow-600 text-yellow-400 font-bold flex items-center gap-2">
                    <span className="text-lg">●</span> 
                    <span>{coins}</span>
                </div>
            </div>

            <div className="bg-black/70 p-3 border-r-4 border-red-500 text-right skew-x-[10deg]">
                <div className="skew-x-[-10deg]">
                    <div className="text-xs text-red-300">INTEGRITY</div>
                    <div className={`text-2xl font-bold ${hp < 30 ? 'text-red-600 animate-pulse' : 'text-white'}`}>{Math.ceil(hp)}%</div>
                </div>
            </div>
        </div>

        {/* Bottom HUD: Health and Ammo */}
        <div className="absolute bottom-8 left-0 right-0 px-8 flex justify-between items-end">
            {/* Health Bar Visual */}
            <div className="w-1/3 max-w-md">
                <div className="flex justify-between text-xs text-gray-400 mb-1">
                    <span>CRITICAL</span>
                    <span>STABLE</span>
                </div>
                <div className="h-4 bg-gray-900/80 rounded-sm overflow-hidden border border-gray-600 backdrop-blur-sm">
                    <div 
                        className="h-full bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 transition-all duration-300"
                        style={{ width: `${(hp / maxHp) * 100}%` }}
                    />
                </div>
                <div className="text-center mt-1 text-xs text-gray-500">HP MONITORING SYSTEM</div>
            </div>

            {/* Ammo Counter */}
            <div className="flex flex-col items-end">
                 <div className={`text-6xl font-black tracking-tighter ${isReloading ? 'text-red-500' : ammo < 5 ? 'text-yellow-500' : 'text-white'}`}>
                     {ammo}<span className="text-2xl text-gray-500">/{maxAmmo}</span>
                 </div>
                 <div className="text-xs text-gray-400 tracking-widest">AMMUNITION</div>
                 <div className="flex gap-1 mt-1">
                     {/* Visual bullet representation */}
                     {Array.from({length: Math.ceil(ammo / 2)}).map((_, i) => (
                         <div key={i} className="w-1 h-3 bg-yellow-500/80"></div>
                     ))}
                 </div>
            </div>
        </div>

        {/* Damage Overlay */}
        <div className={`absolute inset-0 bg-red-600 pointer-events-none transition-opacity duration-200 ${hp < 30 ? 'opacity-20 animate-pulse' : 'opacity-0'}`} style={{ mixBlendMode: 'overlay' }}></div>
    </div>
  );
};