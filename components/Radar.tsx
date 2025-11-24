
import React, { useRef } from 'react';
import { Hud, OrthographicCamera } from '@react-three/drei';
import { useFrame, useThree } from '@react-three/fiber';
import { useGameStore } from '../store';
import * as THREE from 'three';

export const Radar = () => {
  const { enemies } = useGameStore();
  const { camera } = useThree();
  const blipsGroupRef = useRef<THREE.Group>(null);
  
  const RADAR_RANGE = 40;
  const RADAR_RADIUS = 50;

  // We use a ref to store temp vectors to avoid garbage collection
  const tempVec = useRef(new THREE.Vector3());
  const tempForward = useRef(new THREE.Vector3());
  const tempRight = useRef(new THREE.Vector3());

  useFrame(() => {
    if (blipsGroupRef.current) {
      // 1. Get Camera Direction Vectors
      camera.getWorldDirection(tempForward.current);
      tempForward.current.y = 0;
      tempForward.current.normalize();

      // 2. Calculate Right Vector (Cross Product of Forward and World Up)
      tempRight.current.crossVectors(tempForward.current, camera.up).normalize();
      
      const children = blipsGroupRef.current.children;
      let childIndex = 0;
      
      enemies.forEach((enemy) => {
          if (enemy.isDead) return;
          
          const mesh = children[childIndex] as THREE.Mesh;
          if (!mesh) return; 

          // Calculate vector from Player to Enemy
          tempVec.current.set(enemy.x, 0, enemy.z).sub(camera.position);
          tempVec.current.y = 0; 

          // Project onto Local Axes
          const distForward = tempVec.current.dot(tempForward.current);
          const distRight = tempVec.current.dot(tempRight.current);

          // Scale to Radar Size
          const scale = RADAR_RADIUS / RADAR_RANGE;
          let finalX = distRight * scale;
          let finalY = distForward * scale;

          // Clamp to Radar Circle
          const dist = Math.sqrt(finalX * finalX + finalY * finalY);
          if (dist > RADAR_RADIUS) {
              finalX = (finalX / dist) * RADAR_RADIUS;
              finalY = (finalY / dist) * RADAR_RADIUS;
          }
          
          mesh.visible = true;
          mesh.position.set(finalX, finalY, 0);
          childIndex++;
      });

      for (let i = childIndex; i < children.length; i++) {
          children[i].visible = false;
      }
    }
  });
  
  return (
    <Hud renderPriority={1}>
      <OrthographicCamera makeDefault position={[0, 0, 10]} zoom={1} />
      {/* Moved down by increasing y offset subtraction (from -80 to -200) */}
      <group position={[-window.innerWidth / 2 + 80, window.innerHeight / 2 - 200, 0]}>
        
        {/* Radar Background */}
        <mesh>
          <circleGeometry args={[60, 32]} />
          <meshBasicMaterial color="#000000" opacity={0.7} transparent />
        </mesh>
        <mesh>
           <ringGeometry args={[58, 60, 64]} />
           <meshBasicMaterial color="#00ff00" opacity={0.5} transparent />
        </mesh>
        <mesh>
           <ringGeometry args={[29, 30, 32]} />
           <meshBasicMaterial color="#00ff00" opacity={0.2} transparent />
        </mesh>

        {/* Crosslines */}
        <mesh>
            <planeGeometry args={[120, 1]} />
            <meshBasicMaterial color="#00ff00" opacity={0.3} transparent />
        </mesh>
        <mesh rotation={[0, 0, Math.PI/2]}>
            <planeGeometry args={[120, 1]} />
            <meshBasicMaterial color="#00ff00" opacity={0.3} transparent />
        </mesh>

        {/* Player Blip (Fixed Center) */}
        <mesh position={[0, 0, 1]}>
           <coneGeometry args={[4, 10, 3]} />
           <meshBasicMaterial color="white" />
        </mesh>

        {/* Blips Container */}
        <group ref={blipsGroupRef}>
            {enemies.map((enemy) => (
                 <mesh key={enemy.id} userData={{ id: enemy.id }}>
                    <circleGeometry args={[enemy.type === 'boss' ? 5 : 2.5, 8]} />
                    <meshBasicMaterial color={enemy.type === 'boss' ? '#ff0000' : '#ffaa00'} />
                 </mesh>
            ))}
        </group>

      </group>
    </Hud>
  );
};
