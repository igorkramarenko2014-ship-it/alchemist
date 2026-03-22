'use client';

/**
 * Liquid Mercury — **Master GLSL injection** (6-droplet centers + teal floor + chrome peaks).
 * `MeshPhysicalMaterial.onBeforeCompile`; fragment patches **outgoingLight** (Three.js physical pipeline).
 * **No remote HDRI:** `RoomEnvironment` + PMREM. Cache: `alchemist-mercury-master-glsl-v3`
 */

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { ContactShadows, Float } from '@react-three/drei';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { mercuryTransmutationRate, type EarTier } from '../../lib/ear-tier';

export interface MercuryBallProps {
  vividness: number;
  isEarMode?: boolean;
  fitParent?: boolean;
  earTier?: EarTier;
}

/** Ultra: full detail. Basic: ~4× fewer sphere verts — default dock path stays smooth on laptops. */
function sphereSegmentsForTier(tier: EarTier): number {
  return tier === 'ultra' ? 256 : 128;
}

/**
 * Six impact centers (master prompt) — normalized in TS for parity with GLSL `c[0..5]`:
 * `(1,1,1)`, `(-1,-1,1)`, `(1,-1,-1)`, `(-1,1,-1)`, `(0,1,0.5)`, `(0.5,-1,0)`.
 * Shader uses the precomputed literals `0.577…` / `0.894…` etc. for zero CPU cost.
 */

type MercuryCompiledShader = {
  uniforms: Record<string, THREE.IUniform>;
};

function ProceduralRoomEnvironment() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);

  useLayoutEffect(() => {
    const pmrem = new THREE.PMREMGenerator(gl);
    const room = new RoomEnvironment();
    const { texture } = pmrem.fromScene(room, 0.04);
    scene.environment = texture;
    return () => {
      scene.environment = null;
      texture.dispose();
      pmrem.dispose();
    };
  }, [gl, scene]);

  return null;
}

function OrbAmbient() {
  return (
    <div
      className="pointer-events-none absolute inset-0 -z-10 rounded-[inherit] opacity-[0.48]"
      style={{
        background:
          'radial-gradient(ellipse 88% 72% at 50% 68%, rgba(94,234,212,0.16) 0%, transparent 55%), radial-gradient(ellipse 100% 78% at 50% 100%, rgba(94,234,212,0.06) 0%, transparent 42%)',
      }}
      aria-hidden
    />
  );
}

function useMercuryMaterial(shaderRef: MutableRefObject<MercuryCompiledShader | null>) {
  return useMemo(() => {
    const m = new THREE.MeshPhysicalMaterial({
      color: '#ffffff',
      metalness: 1,
      roughness: 0.02,
      ior: 2.5,
      iridescence: 0.35,
      iridescenceIOR: 1.5,
      clearcoat: 1,
      clearcoatRoughness: 0.02,
      envMapIntensity: 1.2,
    });

    m.customProgramCacheKey = () => 'alchemist-mercury-master-glsl-v3';

    m.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.uniforms.uVividness = { value: 0.5 };
      shader.uniforms.uTealFloor = { value: new THREE.Color('#5EEAD4') };
      shader.uniforms.uRippleTimeScale = { value: 1 };
      shaderRef.current = shader as MercuryCompiledShader;

      // Vertex: replace <begin_vertex> only — do NOT re-include it (would reset `transformed`).
      shader.vertexShader =
        `
        uniform float uTime;
        uniform float uVividness;
        uniform float uRippleTimeScale;
        varying float vDisplacement;
        ` +
        shader.vertexShader.replace(
          '#include <begin_vertex>',
          /* glsl */ `
          vec3 p0 = vec3(position);
          vec3 n0 = normalize(objectNormal);
          vec3 dir = normalize(p0);

          float totalDisp = 0.0;
          vec3 c[6];
          c[0] = vec3(0.577, 0.577, 0.577);
          c[1] = vec3(-0.577, -0.577, 0.577);
          c[2] = vec3(0.577, -0.577, -0.577);
          c[3] = vec3(-0.577, 0.577, -0.577);
          c[4] = vec3(0.0, 0.894, 0.447);
          c[5] = vec3(0.447, -0.894, 0.0);

          for (int i = 0; i < 6; i++) {
            float d = acos(clamp(dot(dir, c[i]), -1.0, 1.0));
            totalDisp += sin(d * 14.0 - uTime * 2.5 * uRippleTimeScale) / (1.0 + d * 3.0);
          }

          float finalDisp = totalDisp * 0.08 * clamp(uVividness, 0.0, 1.0);
          vec3 transformed = p0 + n0 * finalDisp;
          vDisplacement = finalDisp;
        `,
        );

      // Fragment: physical shader aggregates into `outgoingLight` before dithering — not `gl_FragColor`.
      shader.fragmentShader =
        `
        uniform vec3 uTealFloor;
        varying float vDisplacement;
        ` +
        shader.fragmentShader.replace(
          '#include <dithering_fragment>',
          /* glsl */ `
          {
            float floorMask = smoothstep(-0.1, -1.0, normalize(vNormal).y);
            outgoingLight = mix(outgoingLight, uTealFloor, floorMask * 0.45);
            outgoingLight += vec3(0.15) * step(0.04, max(vDisplacement, 0.0));
          }
          #include <dithering_fragment>
        `,
        );
    };

    return m;
  }, [shaderRef]);
}

function LiquidChromeMesh({
  vividness,
  isEarMode,
  earTier = 'basic',
  material,
  shaderRef,
}: {
  vividness: number;
  isEarMode?: boolean;
  earTier?: EarTier;
  material: THREE.MeshPhysicalMaterial;
  shaderRef: MutableRefObject<MercuryCompiledShader | null>;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rate = mercuryTransmutationRate(earTier);
  const sphereSeg = sphereSegmentsForTier(earTier);
  const reducedMotionRef = useRef(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => {
      reducedMotionRef.current = mq.matches;
    };
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, []);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    const sh = shaderRef.current;
    const earBoost = isEarMode ? Math.sin(t * 2.8) * 0.12 : 0;
    const v = THREE.MathUtils.clamp(vividness + earBoost, 0, 1);
    const motionScale = reducedMotionRef.current ? 0.35 : 1;

    if (sh?.uniforms?.uTime) {
      sh.uniforms.uTime.value = t * motionScale;
      sh.uniforms.uVividness.value = v;
      sh.uniforms.uRippleTimeScale.value = rate;
    }

    material.envMapIntensity = 1.05 + vividness * 0.3 + (isEarMode ? Math.sin(t * 2.8) * 0.07 : 0);
  });

  return (
    <mesh ref={meshRef} material={material}>
      <sphereGeometry args={[1, sphereSeg, sphereSeg]} />
    </mesh>
  );
}

function MercurySceneContent({
  vividness,
  isEarMode,
  earTier,
}: {
  vividness: number;
  isEarMode?: boolean;
  earTier?: EarTier;
}) {
  const shaderRef = useRef<MercuryCompiledShader | null>(null);
  const material = useMercuryMaterial(shaderRef);

  useEffect(() => {
    return () => {
      material.dispose();
    };
  }, [material]);

  return (
    <>
      <ProceduralRoomEnvironment />
      <ambientLight intensity={0.18} />
      <pointLight position={[2.8, 2.4, 4.5]} intensity={0.85} color="#5EEAD4" />
      <directionalLight position={[-4.5, 3.5, 5.5]} intensity={0.45} color="#ffffff" />
      <directionalLight position={[5, 5, 5]} intensity={2} color="#ffffff" />

      <ContactShadows
        position={[0, -1.5, 0]}
        opacity={0.5}
        scale={10}
        blur={2.5}
        far={1.5}
        color="#5EEAD4"
      />

      <Float speed={1.5} rotationIntensity={0.2} floatIntensity={0.4}>
        <LiquidChromeMesh
          vividness={vividness}
          isEarMode={isEarMode}
          earTier={earTier}
          material={material}
          shaderRef={shaderRef}
        />
      </Float>
    </>
  );
}

export function MercuryBall({
  vividness,
  isEarMode = false,
  fitParent = true,
  earTier = 'basic',
}: MercuryBallProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const dpr = useMemo(
    () => [1, Math.min(2, typeof window !== 'undefined' ? (window.devicePixelRatio ?? 1) : 1)] as [
      number,
      number,
    ],
    [],
  );

  if (!mounted) {
    return (
      <div
        className="flex h-full min-h-[140px] w-full items-center justify-center rounded-xl bg-gray-800/25 animate-pulse"
        aria-hidden
      />
    );
  }

  return (
    <div className={fitParent ? 'relative h-full min-h-0 w-full' : 'relative h-[280px] w-full'}>
      <OrbAmbient />
      <Canvas
        className="absolute inset-0 h-full w-full touch-none"
        style={{ pointerEvents: 'none' }}
        gl={{
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
        }}
        dpr={dpr}
        camera={{ position: [0, 0.1, 3.35], fov: 42 }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <MercurySceneContent vividness={vividness} isEarMode={isEarMode} earTier={earTier} />
      </Canvas>
    </div>
  );
}
