
import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Stars, Instance, Instances } from '@react-three/drei';
import { Player } from './Player';
import { Enemy } from './Enemy';
import { Radar } from './Radar';
import { useGameStore } from '../store';
import { GameStatus } from '../types';
import * as THREE from 'three';

const WaveManager = () => {
    const { level, enemies, spawnEnemy, status, nextLevel, setStatus } = useGameStore();
    const spawnTimer = useRef(0);
    const enemiesSpawned = useRef(0);

    // Further increased difficulty: more enemies, faster spawn, higher speeds
    const levels = [
        { count: 40, rate: 800, types: ['normal'] },
        { count: 60, rate: 700, types: ['normal', 'fast'] },
        { count: 1, rate: 1000, types: ['boss'], boss: true }, 
        { count: 80, rate: 600, types: ['normal', 'fast'] },
        { count: 100, rate: 500, types: ['fast', 'tank'] },
        { count: 1, rate: 1000, types: ['boss'], boss: true }, 
        { count: 150, rate: 400, types: ['normal', 'tank', 'fast'] },
        { count: 200, rate: 300, types: ['fast'] },
        { count: 2, rate: 1000, types: ['boss'], boss: true }, 
        { count: 300, rate: 200, types: ['normal', 'fast', 'tank', 'boss'] },
    ];

    useFrame((state, delta) => {
        if (status !== GameStatus.PLAYING) return;

        const currentLevelConfig = levels[Math.min(level - 1, levels.length - 1)];
        const isLevelComplete = enemiesSpawned.current >= currentLevelConfig.count && enemies.every(e => e.isDead);

        if (isLevelComplete) {
            if (level === 10) {
                setStatus(GameStatus.VICTORY);
            } else {
                nextLevel();
                enemiesSpawned.current = 0;
            }
            return;
        }

        if (enemiesSpawned.current < currentLevelConfig.count) {
            spawnTimer.current += delta * 1000;
            if (spawnTimer.current > currentLevelConfig.rate) {
                spawnTimer.current = 0;
                enemiesSpawned.current++;

                const angle = Math.random() * Math.PI * 2;
                const radius = 30 + Math.random() * 20; 
                const x = Math.sin(angle) * radius;
                const z = Math.cos(angle) * radius;

                let type: any = 'normal';
                if (currentLevelConfig.boss && enemiesSpawned.current === 1) type = 'boss';
                else {
                    const types = currentLevelConfig.types;
                    type = types[Math.floor(Math.random() * types.length)];
                }

                // Increased Speeds for difficulty
                let hp = 30;
                let speed = 3.5; // Up from 2
                if (type === 'fast') { hp = 20; speed = 7.0; } // Up from 4.5
                if (type === 'tank') { hp = 100; speed = 2.0; } // Up from 1.2
                if (type === 'boss') { hp = 1200; speed = 3.0; } // Up from 2.0

                spawnEnemy({
                    id: Math.random().toString(36).substr(2, 9),
                    x,
                    z,
                    hp,
                    maxHp: hp,
                    speed,
                    type,
                    isDead: false
                });
            }
        }
    });

    return null;
}

const CoinMesh: React.FC<{ x: number, z: number }> = ({ x, z }) => {
    const ref = useRef<THREE.Mesh>(null);
    useFrame((state) => {
        if(ref.current) {
            ref.current.rotation.z += 0.05; // Spin on local Z (since we rotated X 90)
            // Bobbing effect
            ref.current.position.y = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.2;
        }
    });
    return (
        <mesh ref={ref} position={[x, 1, z]} rotation={[Math.PI/2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.3, 0.3, 0.05, 16]} />
            <meshStandardMaterial color="#FFD700" metalness={0.9} roughness={0.1} emissive="#ffaa00" emissiveIntensity={0.4} />
        </mesh>
    )
}

const CoinManager = () => {
    const { droppedCoins, collectCoin } = useGameStore();
    const { camera } = useThree();

    useFrame(() => {
        // Check for pickup
        const pPos = camera.position;
        droppedCoins.forEach(coin => {
            const dx = pPos.x - coin.x;
            const dz = pPos.z - coin.z;
            const distSq = dx*dx + dz*dz;
            if (distSq < 4) { // 2 units distance
                collectCoin(coin.id);
            }
        });
    });

    return (
        <group>
            {droppedCoins.map(coin => (
                <CoinMesh key={coin.id} x={coin.x} z={coin.z} />
            ))}
        </group>
    );
}

const Ground = React.memo(() => {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        const context = canvas.getContext('2d');
        
        if (context) {
            context.fillStyle = '#1a2615'; 
            context.fillRect(0, 0, 512, 512);
            
            for (let i = 0; i < 200000; i++) {
                const x = Math.random() * 512;
                const y = Math.random() * 512;
                const opacity = Math.random() * 0.3;
                context.fillStyle = Math.random() > 0.6 ? `rgba(80, 100, 40, ${opacity})` : `rgba(60, 50, 30, ${opacity})`;
                context.fillRect(x, y, 2, 2);
            }
        }

        const t = new THREE.CanvasTexture(canvas);
        t.wrapS = THREE.RepeatWrapping;
        t.wrapT = THREE.RepeatWrapping;
        t.repeat.set(80, 80);
        return t;
    }, []);

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
            <planeGeometry args={[500, 500]} />
            <meshStandardMaterial map={texture} roughness={1} />
        </mesh>
    );
});

const Vegetation = React.memo(() => {
    const treeCount = 80;
    const treeData = useMemo(() => {
        return new Array(treeCount).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 150,
            z: (Math.random() - 0.5) * 150,
            s: 0.5 + Math.random() * 1.2,
            foliageScale: 1 + Math.random() * 0.5,
            rot: Math.random() * Math.PI * 2
        }))
    }, []);

    const grassCount = 1500;
    const grassData = useMemo(() => {
        return new Array(grassCount).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 120,
            z: (Math.random() - 0.5) * 120,
            scale: 0.5 + Math.random() * 0.5,
            rot: Math.random() * Math.PI * 2,
            colorTint: Math.random() * 0.2
        }))
    }, []);

    return (
        <group>
            {treeData.map((d, i) => (
                <group key={i} position={[d.x, 0, d.z]} scale={[d.s, d.s * d.foliageScale, d.s]} rotation={[0, d.rot, 0]}>
                    <mesh position={[0, 1.5, 0]} castShadow>
                        <cylinderGeometry args={[0.15, 0.4, 3, 6]} />
                        <meshStandardMaterial color="#1a1510" roughness={1} />
                    </mesh>
                    <mesh position={[0, 3.5, 0]}>
                         <dodecahedronGeometry args={[1.2, 0]} />
                         <meshStandardMaterial color="#1b2e15" roughness={1} />
                    </mesh>
                     <mesh position={[0.8, 2.5, 0]} scale={0.6}>
                         <dodecahedronGeometry args={[1, 0]} />
                         <meshStandardMaterial color="#162410" roughness={1} />
                    </mesh>
                </group>
            ))}
            
            <Instances range={grassCount} position={[0,0,0]}>
                <coneGeometry args={[0.15, 0.6, 3]} />
                <meshStandardMaterial color="#2d4020" roughness={1} />
                {grassData.map((d, i) => (
                    <Instance
                        key={i}
                        position={[d.x, 0.3 * d.scale, d.z]}
                        rotation={[0, d.rot, 0]}
                        scale={[d.scale, d.scale * 1.5, d.scale]}
                        color={new THREE.Color('#2d4020').lerp(new THREE.Color('#405030'), d.colorTint)}
                    />
                ))}
            </Instances>
        </group>
    )
});

export const GameScene = () => {
  const { enemies } = useGameStore();

  return (
    <Canvas shadows camera={{ fov: 80 }}>
      <color attach="background" args={['#1a2035']} />
      <fog attach="fog" args={['#1a2035', 10, 70]} />
      
      <hemisphereLight args={['#607080', '#203020', 0.6]} />
      <ambientLight intensity={0.3} />
      <directionalLight position={[50, 50, 25]} intensity={1.2} color="#ffeebb" castShadow shadow-mapSize={[1024, 1024]} />
      <pointLight position={[-20, 10, -20]} color="#4444ff" intensity={2} distance={40} />

      <Stars radius={100} depth={50} count={3000} factor={4} saturation={0} fade speed={0.5} />
      
      <Ground />
      <Vegetation />
      <Player />
      <WaveManager />
      <CoinManager />
      <Radar />

      {enemies.map((enemy) => (
          !enemy.isDead && (
            <Enemy key={enemy.id} config={enemy} />
          )
      ))}
    </Canvas>
  );
};
