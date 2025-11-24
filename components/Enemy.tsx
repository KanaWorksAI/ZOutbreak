
import React, { useRef, useState, useMemo } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { Vector3, Group, MathUtils } from 'three';
import { EnemyConfig } from '../types';
import { useGameStore } from '../store';
import { audioManager } from '../audioSystem';

interface EnemyProps {
  config: EnemyConfig;
}

export const Enemy: React.FC<EnemyProps> = ({ config }) => {
  const groupRef = useRef<Group>(null);
  const { camera } = useThree();
  
  // Limb refs
  const leftArmRef = useRef<Group>(null);
  const rightArmRef = useRef<Group>(null);
  const leftLegRef = useRef<Group>(null);
  const rightLegRef = useRef<Group>(null);
  const headRef = useRef<Group>(null);
  const bodyRef = useRef<Group>(null);

  const { takeDamage } = useGameStore();
  const [flash, setFlash] = useState(0);
  const animOffset = useMemo(() => Math.random() * 100, []);
  
  // Attack cooldown state
  const lastAttackTime = useRef(0);
  const ATTACK_COOLDOWN = 1.5; // Seconds between attacks

  useFrame((state, delta) => {
    if (!groupRef.current || config.isDead) return;

    const currentPos = groupRef.current.position;
    const playerPos = camera.position; // Get dynamic player position
    
    // Ignore Y axis for distance check to behave like a cylinder trigger
    const flatDist = Math.sqrt(Math.pow(currentPos.x - playerPos.x, 2) + Math.pow(currentPos.z - playerPos.z, 2));
    const direction = new Vector3().subVectors(playerPos, currentPos);
    direction.y = 0; // Keep enemies on ground
    direction.normalize();
    
    // Movement
    const isAttacking = flatDist < 1.5;
    const moveSpeed = isAttacking ? 0 : config.speed;
    
    groupRef.current.position.add(direction.multiplyScalar(moveSpeed * delta));
    groupRef.current.lookAt(playerPos.x, 0, playerPos.z);

    // Animation
    const time = state.clock.elapsedTime * (config.type === 'fast' ? 15 : 8) + animOffset;
    
    if (isAttacking) {
      // Attack Animation
      if (leftArmRef.current) leftArmRef.current.rotation.x = MathUtils.lerp(leftArmRef.current.rotation.x, -Math.PI / 2, delta * 10);
      if (rightArmRef.current) rightArmRef.current.rotation.x = MathUtils.lerp(rightArmRef.current.rotation.x, -Math.PI / 2, delta * 10);
      if (bodyRef.current) bodyRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 20) * 0.1;
      
      // Attack Logic (Deterministic)
      if (state.clock.elapsedTime - lastAttackTime.current > ATTACK_COOLDOWN) {
         lastAttackTime.current = state.clock.elapsedTime;
         
         // Damage calculation: Player has 100HP. 
         // 34 damage = ~3 hits to kill.
         // Boss = 50 damage (2 hits).
         const damage = config.type === 'boss' ? 50 : 34;
         takeDamage(damage);
         audioManager.playHit();
      }
    } else {
      // Walk Animation
      if (leftLegRef.current) leftLegRef.current.rotation.x = Math.sin(time) * 0.5;
      if (rightLegRef.current) rightLegRef.current.rotation.x = Math.sin(time + Math.PI) * 0.5;

      if (config.type === 'fast') {
         if (leftArmRef.current) leftArmRef.current.rotation.x = Math.sin(time + Math.PI) * 0.5;
         if (rightArmRef.current) rightArmRef.current.rotation.x = Math.sin(time) * 0.5;
      } else {
         if (leftArmRef.current) leftArmRef.current.rotation.x = -1.3 + Math.sin(time) * 0.1;
         if (rightArmRef.current) rightArmRef.current.rotation.x = -1.3 + Math.sin(time + Math.PI) * 0.1;
      }
      groupRef.current.position.y = Math.abs(Math.sin(time)) * 0.1;
    }
    
    if (headRef.current) {
        headRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2 + animOffset) * 0.1;
    }

    if (flash > 0) setFlash(f => Math.max(0, f - delta * 5));
  });

  // ... Styles logic ...
  let skinColor = '#5D7052'; 
  let shirtColor = '#555555';
  let pantsColor = '#2b2b2b';
  let scale = 1;
  
  if (config.type === 'fast') { skinColor = '#6b5228'; shirtColor = '#8f3434'; scale = 0.9; }
  if (config.type === 'tank') { skinColor = '#3a4a3a'; shirtColor = '#1a1a1a'; scale = 1.6; }
  if (config.type === 'boss') { skinColor = '#2a1a1a'; shirtColor = '#4a0000'; scale = 3.5; }

  const finalSkinColor = flash > 0 ? '#ffffff' : skinColor;
  const finalShirtColor = flash > 0 ? '#ffffff' : shirtColor;
  const finalPantsColor = flash > 0 ? '#ffffff' : pantsColor;

  if (config.isDead) return null;

  return (
    <group ref={groupRef} position={[config.x, 0, config.z]} scale={scale} userData={{ isEnemy: true, id: config.id }}>
      <group ref={bodyRef}>
        <mesh position={[0, 1.1, 0]} castShadow receiveShadow>
            <boxGeometry args={[0.5, 0.7, 0.3]} />
            <meshStandardMaterial color={finalShirtColor} roughness={0.9} />
        </mesh>
        <group ref={headRef} position={[0, 1.6, 0]}>
            <mesh castShadow>
                <boxGeometry args={[0.3, 0.35, 0.3]} />
                <meshStandardMaterial color={finalSkinColor} roughness={0.7} />
            </mesh>
            <mesh position={[0.08, 0.05, 0.16]}>
                <boxGeometry args={[0.05, 0.02, 0.01]} />
                <meshBasicMaterial color="red" />
            </mesh>
            <mesh position={[-0.08, 0.05, 0.16]}>
                <boxGeometry args={[0.05, 0.02, 0.01]} />
                <meshBasicMaterial color="red" />
            </mesh>
        </group>
        <group position={[0.35, 1.35, 0]} ref={leftArmRef}>
            <mesh position={[0, -0.3, 0]} castShadow>
                <boxGeometry args={[0.15, 0.7, 0.15]} />
                <meshStandardMaterial color={finalSkinColor} />
            </mesh>
        </group>
        <group position={[-0.35, 1.35, 0]} ref={rightArmRef}>
            <mesh position={[0, -0.3, 0]} castShadow>
                <boxGeometry args={[0.15, 0.7, 0.15]} />
                <meshStandardMaterial color={finalSkinColor} />
            </mesh>
        </group>
      </group>
      <group position={[0.15, 0.7, 0]} ref={leftLegRef}>
         <mesh position={[0, -0.35, 0]} castShadow>
            <boxGeometry args={[0.18, 0.7, 0.18]} />
            <meshStandardMaterial color={finalPantsColor} />
         </mesh>
      </group>
      <group position={[-0.15, 0.7, 0]} ref={rightLegRef}>
         <mesh position={[0, -0.35, 0]} castShadow>
            <boxGeometry args={[0.18, 0.7, 0.18]} />
            <meshStandardMaterial color={finalPantsColor} />
         </mesh>
      </group>
      {config.hp < config.maxHp && (
          <group position={[0, 2.1, 0]}>
             <mesh>
                 <planeGeometry args={[1, 0.1]} />
                 <meshBasicMaterial color="black" />
             </mesh>
             <mesh 
                position={[(-0.5 + (config.hp / config.maxHp) / 2), 0, 0.005]} 
                scale={[config.hp / config.maxHp, 1, 1]}
             >
                 <planeGeometry args={[1, 0.08]} />
                 <meshBasicMaterial color="red" />
             </mesh>
          </group>
      )}
    </group>
  );
};
