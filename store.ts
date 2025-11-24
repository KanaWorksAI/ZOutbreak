
import { create } from 'zustand';
import { EnemyConfig, GameStatus } from './types';
import { Vector3 } from 'three';
import { audioManager } from './audioSystem';

export interface CoinDrop {
  id: string;
  x: number;
  z: number;
  value: number;
}

interface GameState {
  status: GameStatus;
  level: number;
  score: number;
  hp: number;
  maxHp: number;
  enemies: EnemyConfig[];
  
  // Ammo & Coins
  ammo: number;
  maxAmmo: number;
  isReloading: boolean;
  coins: number;
  droppedCoins: CoinDrop[];
  
  // Actions
  startGame: () => void;
  nextLevel: () => void;
  takeDamage: (amount: number) => void;
  spawnEnemy: (enemy: EnemyConfig) => void;
  damageEnemy: (id: string, amount: number) => void;
  resetGame: () => void;
  setStatus: (status: GameStatus) => void;
  
  shootAmmo: () => void;
  startReload: () => void;
  finishReload: () => void;
  collectCoin: (id: string) => void;
}

export const useGameStore = create<GameState>((set, get) => ({
  status: GameStatus.START,
  level: 1,
  score: 0,
  hp: 100,
  maxHp: 100,
  enemies: [],
  ammo: 20,
  maxAmmo: 20,
  isReloading: false,
  coins: 0,
  droppedCoins: [],

  startGame: () => set({ 
    status: GameStatus.PLAYING, 
    hp: 100, 
    score: 0, 
    level: 1, 
    enemies: [],
    ammo: 20,
    isReloading: false,
    coins: 0,
    droppedCoins: []
  }),
  
  setStatus: (status) => set({ status }),

  resetGame: () => set({ 
    status: GameStatus.START, 
    level: 1, 
    score: 0, 
    hp: 100, 
    enemies: [],
    ammo: 20,
    isReloading: false,
    coins: 0,
    droppedCoins: []
  }),

  nextLevel: () => set((state) => ({ 
    level: state.level + 1, 
    enemies: [], 
    hp: Math.min(state.hp + 20, state.maxHp) 
  })),

  takeDamage: (amount) => set((state) => {
    const newHp = state.hp - amount;
    if (newHp <= 0) {
      return { hp: 0, status: GameStatus.GAME_OVER };
    }
    return { hp: newHp };
  }),

  spawnEnemy: (enemy) => set((state) => ({ enemies: [...state.enemies, enemy] })),

  shootAmmo: () => set((state) => ({ ammo: Math.max(0, state.ammo - 1) })),

  startReload: () => set({ isReloading: true }),

  finishReload: () => set({ isReloading: false, ammo: 20 }),

  collectCoin: (id) => {
      const state = get();
      const coin = state.droppedCoins.find(c => c.id === id);
      if (coin) {
          audioManager.playCoin();
          set({
              droppedCoins: state.droppedCoins.filter(c => c.id !== id),
              coins: state.coins + coin.value
          });
      }
  },

  damageEnemy: (id, amount) => {
    set((state) => {
      let killedEnemy: EnemyConfig | null = null;
      
      const newEnemies = state.enemies.map(e => {
        if (e.id === id && !e.isDead) {
          const remaining = e.hp - amount;
          if (remaining <= 0) {
            killedEnemy = e;
            return { ...e, hp: 0, isDead: true };
          }
          return { ...e, hp: remaining };
        }
        return e;
      });
      
      if (killedEnemy) {
        // Drop visual coin instead of instant collect
        const val = (killedEnemy as any).type === 'boss' ? 50 : (killedEnemy as any).type === 'tank' ? 10 : 5;
        const newCoin: CoinDrop = {
            id: Math.random().toString(36).substr(2, 9),
            x: (killedEnemy as any).x,
            z: (killedEnemy as any).z,
            value: val
        };
        
        const scoreAdd = (killedEnemy as any).type === 'boss' ? 500 : (killedEnemy as any).type === 'tank' ? 100 : 50;
        
        return { 
          enemies: newEnemies,
          score: state.score + scoreAdd,
          droppedCoins: [...state.droppedCoins, newCoin]
        };
      }

      return { enemies: newEnemies };
    });
  },
}));
