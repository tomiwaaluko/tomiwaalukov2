'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COLORS = [0x1a2a4a, 0x2d4a6f, 0x6bc4d4];
const BLOCK_COUNT = 1000;
const BLOCK_SIZE = 0.3;
const MAX_DISTANCE = 25;
const DURATION_MS = 2000;

interface GridTunnelSceneProps {
  onComplete: () => void;
}

function randomSpherePoint(): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = 1;
  return new THREE.Vector3(
    r * Math.sin(phi) * Math.cos(theta),
    r * Math.sin(phi) * Math.sin(theta),
    r * Math.cos(phi)
  );
}

export function GridTunnelScene({ onComplete }: GridTunnelSceneProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const startTime = useRef<number | null>(null);
  const completed = useRef(false);

  const instanceColor = useMemo(
    () => new THREE.InstancedBufferAttribute(new Float32Array(BLOCK_COUNT * 3), 3),
    []
  );

  const instanceData = useMemo(() => {
    const directions: THREE.Vector3[] = [];
    const speeds: number[] = [];
    const colors: number[] = [];

    for (let i = 0; i < BLOCK_COUNT; i++) {
      directions.push(randomSpherePoint());
      speeds.push(0.6 + Math.random() * 0.6);
      colors.push(COLORS[Math.floor(Math.random() * COLORS.length)]);
    }

    return { directions, speeds, colors };
  }, []);

  useFrame((state) => {
    if (!meshRef.current) return;
    if (!meshRef.current.instanceColor) {
      meshRef.current.instanceColor = instanceColor;
    }
    if (completed.current) return;
    if (startTime.current === null) startTime.current = state.clock.elapsedTime * 1000;
    const elapsed = state.clock.elapsedTime * 1000 - startTime.current;
    const t = Math.min(elapsed / DURATION_MS, 1);

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();

    for (let i = 0; i < BLOCK_COUNT; i++) {
      const dist = t * MAX_DISTANCE * instanceData.speeds[i];
      position.copy(instanceData.directions[i]).multiplyScalar(dist);
      matrix.makeTranslation(position.x, position.y, position.z);
      meshRef.current.setMatrixAt(i, matrix);
      meshRef.current.setColorAt(i, new THREE.Color(instanceData.colors[i]));
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }

    if (t >= 1 && !completed.current) {
      completed.current = true;
      onComplete();
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, BLOCK_COUNT]}
      frustumCulled={false}
    >
      <boxGeometry args={[BLOCK_SIZE, BLOCK_SIZE, BLOCK_SIZE * 1.5]} />
      <meshBasicMaterial
        vertexColors={true}
        transparent
        opacity={0.9}
      />
    </instancedMesh>
  );
}
