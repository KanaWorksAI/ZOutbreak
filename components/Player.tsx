import React, { useRef, useState, useEffect, useMemo, useImperativeHandle, forwardRef } from 'react';
import { useThree, useFrame } from '@react-three/fiber';
import { PointerLockControls, Instance, Instances } from '@react-three/drei';
import * as THREE from 'three';
import { useGameStore } from '../store';
import { audioManager } from '../audioSystem';

// Particle System for Muzzle Flash
const MuzzleParticles = ({ firing }: { firing: boolean }) => {
  const count = 15;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const particles = useMemo(() => {
      return new Array(count).fill(0).map(() => ({
          velocity: new THREE.Vector3(),
          position: new THREE.Vector3(),
          scale: 0,
          life: 0
      }));
  }, []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  useFrame((state, delta) => {
      if (!meshRef.current) return;

      if (firing) {
          particles.forEach(p => {
              // Reset particles on fire
              if (p.life <= 0) {
                p.life = 0.1 + Math.random() * 0.1;
                p.position.set(0, 0, 0);
                // Cone spray
                const angle = Math.random() * Math.PI * 2;
                const spread = Math.random() * 0.5;
                p.velocity.set(
                    Math.cos(angle) * spread,
                    Math.sin(angle) * spread,
                    -5 - Math.random() * 5 // Forward speed
                );
                p.scale = 0.5 + Math.random() * 0.5;
              }
          });
      }

      particles.forEach((p, i) => {
          if (p.life > 0) {
              p.life -= delta;
              p.position.addScaledVector(p.velocity, delta);
              p.scale = Math.max(0, p.scale - delta * 5);
              
              dummy.position.copy(p.position);
              dummy.scale.set(p.scale, p.scale, p.scale);
              dummy.rotation.z = Math.random() * Math.PI;
              dummy.updateMatrix();
              meshRef.current!.setMatrixAt(i, dummy.matrix);
          } else {
              dummy.scale.set(0,0,0);
              dummy.updateMatrix();
              meshRef.current!.setMatrixAt(i, dummy.matrix);
          }
      });
      meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
      <Instances range={count} ref={meshRef} position={[0, 0.1, -0.6]}>
          <planeGeometry args={[0.05, 0.05]} />
          <meshBasicMaterial color="#ffaa00" transparent opacity={0.8} blending={THREE.AdditiveBlending} depthWrite={false} />
          {particles.map((_, i) => <Instance key={i} />)}
      </Instances>
  )
};

// Blood Particle System - Enhanced for Spray Effect
const BloodParticles = forwardRef((props, ref) => {
    // Significantly increased pool size to guarantee visibility during rapid fire
    const count = 600; 
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    // Particle state
    const particles = useMemo(() => {
        return new Array(count).fill(0).map(() => ({
            velocity: new THREE.Vector3(),
            position: new THREE.Vector3(),
            life: 0,
            active: false
        }));
    }, []);

    useImperativeHandle(ref, () => ({
        explode: (position: THREE.Vector3) => {
            // Activate a burst of particles
            let spawned = 0;
            const burstSize = 25; // Increased burst size
            for(let i=0; i < count && spawned < burstSize; i++) {
                if(!particles[i].active) {
                    particles[i].active = true;
                    particles[i].life = 0.4 + Math.random() * 0.4;
                    particles[i].position.copy(position);
                    
                    // Spray upward and outward
                    particles[i].velocity.set(
                        (Math.random() - 0.5) * 4,
                        (Math.random() * 3) + 1, // Upward bias
                        (Math.random() - 0.5) * 4
                    ).normalize().multiplyScalar(3 + Math.random() * 4); // Random speed
                    
                    spawned++;
                }
            }
        }
    }));

    useFrame((state, delta) => {
        if(!meshRef.current) return;

        let activeCount = 0;
        particles.forEach((p, i) => {
            if(p.active) {
                p.life -= delta;
                if(p.life <= 0) {
                    p.active = false;
                    dummy.scale.set(0,0,0);
                } else {
                    p.velocity.y -= delta * 9.8; // Gravity
                    p.position.addScaledVector(p.velocity, delta);
                    
                    dummy.position.copy(p.position);
                    const s = p.life * 1.5; // shrink
                    dummy.scale.set(s, s, s);
                    dummy.rotation.set(Math.random(), Math.random(), Math.random());
                }
                dummy.updateMatrix();
                meshRef.current!.setMatrixAt(i, dummy.matrix);
                activeCount++;
            } else {
                 // Ensure hidden
                 dummy.scale.set(0,0,0);
                 dummy.updateMatrix();
                 meshRef.current!.setMatrixAt(i, dummy.matrix);
            }
        });
        
        if(activeCount > 0 || meshRef.current.count > 0) {
             meshRef.current.instanceMatrix.needsUpdate = true;
        }
    });

    return (
        <Instances range={count} ref={meshRef}>
            <boxGeometry args={[0.08, 0.08, 0.08]} />
            <meshStandardMaterial color="#8a0303" roughness={0.1} emissive="#300000" />
            {particles.map((_, i) => <Instance key={i} />)}
        </Instances>
    )
});

export const Player = () => {
  const { camera, raycaster, scene } = useThree();
  const gunRef = useRef<THREE.Group>(null);
  const muzzleLightRef = useRef<THREE.PointLight>(null);
  const bloodParticlesRef = useRef<any>(null);
  // Ref for PointerLockControls
  const controlsRef = useRef<any>(null);

  const { damageEnemy, status, ammo, shootAmmo, startReload, finishReload, isReloading } = useGameStore();
  
  // Input State
  const [keys, setKeys] = useState({ w: false, a: false, s: false, d: false });

  // Cooldown & Recoil
  const lastShot = useRef(0);
  const FIRE_RATE = 100; 
  const recoilIntensity = useRef(0);
  const [isFiring, setIsFiring] = useState(false);

  // Animation Refs - Store local offsets to ensure smooth interpolation relative to camera
  const currentGunY = useRef(-0.25);
  const currentGunRotX = useRef(0);

  useEffect(() => {
    camera.position.y = 1.7;

    const handleKeyDown = (e: KeyboardEvent) => {
        switch(e.key.toLowerCase()) {
            case 'w': setKeys(k => ({...k, w: true})); break;
            case 'a': setKeys(k => ({...k, a: true})); break;
            case 's': setKeys(k => ({...k, s: true})); break;
            case 'd': setKeys(k => ({...k, d: true})); break;
            case 'r': if (!isReloading && ammo < 20) startReload(); break; // Reload check 20
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
        switch(e.key.toLowerCase()) {
            case 'w': setKeys(k => ({...k, w: false})); break;
            case 'a': setKeys(k => ({...k, a: false})); break;
            case 's': setKeys(k => ({...k, s: false})); break;
            case 'd': setKeys(k => ({...k, d: false})); break;
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
        window.removeEventListener('keydown', handleKeyDown);
        window.removeEventListener('keyup', handleKeyUp);
    }
  }, [camera, isReloading, ammo]);

  // Handle Reload Timer
  useEffect(() => {
      let timer: ReturnType<typeof setTimeout>;
      if (isReloading) {
          audioManager.playReload();
          timer = setTimeout(() => {
              finishReload();
          }, 3000);
      }
      return () => clearTimeout(timer);
  }, [isReloading]);

  // Auto-Grab Mouse on Start / Release on End
  useEffect(() => {
      if (status === 'PLAYING') {
          // Try to lock immediately if component is ready
          if (controlsRef.current) {
              controlsRef.current.lock();
          }
          // Safety fallback for mount race conditions
          const t = setTimeout(() => {
             if (controlsRef.current) controlsRef.current.lock();
          }, 100);
          return () => clearTimeout(t);
      } else {
          document.exitPointerLock();
      }
  }, [status]);

  useFrame((state, delta) => {
    if (status !== 'PLAYING') return;

    // 1. Movement Logic
    const speed = 5.0;
    const direction = new THREE.Vector3();
    
    const forward = new THREE.Vector3();
    camera.getWorldDirection(forward);
    forward.y = 0; 
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, camera.up).normalize();

    if (keys.w) direction.add(forward);
    if (keys.s) direction.sub(forward);
    if (keys.d) direction.add(right);
    if (keys.a) direction.sub(right);

    if (direction.lengthSq() > 0) {
        direction.normalize().multiplyScalar(speed * delta);
        camera.position.add(direction);
    }

    // 2. Auto-Aim Shooting
    let firingFrame = false;

    if (!isReloading && ammo > 0) {
        raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
        const intersects = raycaster.intersectObjects(scene.children, true);
        
        let hitEnemy = false;
        for (const intersect of intersects) {
            if (intersect.distance > 50) continue;

            let obj: THREE.Object3D | null = intersect.object;
            while(obj) {
                if (obj.userData && obj.userData.isEnemy && obj.userData.id) {
                    hitEnemy = true;
                    const now = Date.now();
                    if (now - lastShot.current > FIRE_RATE) {
                        // SHOOT
                        lastShot.current = now;
                        shootAmmo();
                        damageEnemy(obj.userData.id, 12); 
                        audioManager.playShoot();
                        recoilIntensity.current = 1.0;
                        firingFrame = true;

                        // Trigger Blood Effect
                        if(bloodParticlesRef.current) {
                            bloodParticlesRef.current.explode(intersect.point);
                        }
                    }
                    break;
                }
                obj = obj.parent;
            }
            if (hitEnemy) break;
        }
    }

    if (ammo === 0 && !isReloading) {
        startReload();
    }

    setIsFiring(firingFrame);

    // 3. Gun Animation & Recoil
    if (gunRef.current) {
        const t = state.clock.getElapsedTime();
        const isMoving = keys.w || keys.a || keys.s || keys.d;
        
        // --- Calculate Target Animation Values ---
        const targetY = isReloading ? -0.6 : -0.25; 
        const targetRotX = isReloading ? -0.5 : 0;  
        
        // Smoothly Interpolate current values to targets
        currentGunY.current = THREE.MathUtils.lerp(currentGunY.current, targetY, delta * 8);
        currentGunRotX.current = THREE.MathUtils.lerp(currentGunRotX.current, targetRotX, delta * 8);

        // --- Recoil Calculation ---
        let recoilZ = 0;
        let recoilY = 0;
        
        if (recoilIntensity.current > 0) {
            recoilZ = 0.2 * recoilIntensity.current;
            recoilY = 0.05 * recoilIntensity.current;
            recoilIntensity.current -= delta * 10; 
            if (recoilIntensity.current < 0) recoilIntensity.current = 0;
        }

        // --- Bobbing ---
        const bobFreq = isMoving ? 10 : 2;
        const bobAmp = isMoving ? 0.015 : 0.005;
        const bobY = Math.sin(t * bobFreq) * bobAmp;
        const bobX = Math.cos(t * bobFreq * 0.5) * bobAmp;

        // --- Apply Transforms ---
        
        // 1. Reset Gun to Camera Position/Rotation (World Space)
        gunRef.current.position.copy(camera.position);
        gunRef.current.quaternion.copy(camera.quaternion);

        // 2. Apply Local Translations (Relative to Camera)
        // We use Translate methods which apply relative to the object's current orientation
        
        gunRef.current.translateX(0.35 + bobX); // Right offset
        gunRef.current.translateY(currentGunY.current + bobY + recoilY); // Up/Down (Animation + Bob + Recoil)
        gunRef.current.translateZ(-0.5 + recoilZ); // Forward/Back (Position + Recoil)

        // 3. Apply Local Rotation (Tipping up/down)
        // We apply this rotation on top of the camera's quaternion
        gunRef.current.rotateX(currentGunRotX.current + (recoilIntensity.current * 0.2));
    }

    // Light Flash
    if (muzzleLightRef.current) {
        if (firingFrame) {
            muzzleLightRef.current.intensity = 2 + Math.random() * 2;
        } else {
            muzzleLightRef.current.intensity = THREE.MathUtils.lerp(muzzleLightRef.current.intensity, 0, delta * 20);
        }
    }
  });

  return (
    <>
      {status === 'PLAYING' && <PointerLockControls ref={controlsRef} selector="#root" />}
      
      {/* Visual Effects */}
      <BloodParticles ref={bloodParticlesRef} />

      <group ref={gunRef}>
        {/* Main Body */}
        <mesh castShadow receiveShadow>
            <boxGeometry args={[0.08, 0.12, 0.4]} />
            <meshStandardMaterial color="#2a2a2a" roughness={0.3} metalness={0.8} />
        </mesh>
        {/* Handle */}
        <mesh position={[0, -0.1, 0.1]}>
             <boxGeometry args={[0.06, 0.15, 0.08]} />
             <meshStandardMaterial color="#1a1a1a" />
        </mesh>
        {/* Magazine */}
        <mesh position={[0, -0.15, -0.05]}>
             <boxGeometry args={[0.06, 0.2, 0.1]} />
             <meshStandardMaterial color="#111" />
        </mesh>
        {/* Barrel */}
        <mesh position={[0, 0.05, -0.3]} rotation={[Math.PI/2, 0, 0]}>
            <cylinderGeometry args={[0.03, 0.03, 0.4]} />
            <meshStandardMaterial color="#444" roughness={0.2} metalness={0.9} />
        </mesh>
        {/* Sight */}
        <mesh position={[0, 0.09, -0.1]}>
            <boxGeometry args={[0.02, 0.04, 0.05]} />
            <meshStandardMaterial color="#0f0" emissive="#0f0" emissiveIntensity={0.5} />
        </mesh>

        {/* Particle Muzzle Flash */}
        <MuzzleParticles firing={isFiring} />
        
        <pointLight ref={muzzleLightRef} position={[0, 0.1, -0.6]} color="#ffaa00" distance={10} decay={2} intensity={0} />
      </group>
    </>
  );
};