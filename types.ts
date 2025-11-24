export enum GameStatus {
  START = 'START',
  PLAYING = 'PLAYING',
  GAME_OVER = 'GAME_OVER',
  VICTORY = 'VICTORY'
}

export interface EnemyConfig {
  id: string;
  x: number;
  z: number;
  hp: number;
  maxHp: number;
  speed: number;
  type: 'normal' | 'fast' | 'tank' | 'boss';
  isDead: boolean;
}

export interface LevelConfig {
  levelNumber: number;
  enemyCount: number;
  spawnRate: number; // ms
  types: ('normal' | 'fast' | 'tank')[];
  isBossLevel: boolean;
}