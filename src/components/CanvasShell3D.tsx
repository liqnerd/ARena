import { Suspense, useEffect, useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, GizmoHelper, GizmoViewport } from '@react-three/drei';
import * as THREE from 'three';
import { useEditor } from '@/store/editor';
import type { Scene, Template } from '@/types/project';
import { renderSceneToCanvas } from '@/lib/renderScene';

export function CanvasShell3D({ scene }: { scene: Scene | undefined }) {
  return (
    <div className="relative h-full w-full bg-[var(--color-canvas)]">
      <Canvas camera={{ position: [0, 1.4, 6.5], fov: 40 }}>
        <color attach="background" args={['#f7f7f9']} />
        <ambientLight intensity={1.05} />
        <Suspense fallback={null}>
          <Cylinder scene={scene} />
        </Suspense>
        <OrbitControls
          enablePan={false}
          minDistance={0.5}
          maxDistance={14}
          maxPolarAngle={Math.PI / 1.6}
        />
        <GizmoHelper alignment="top-right" margin={[64, 64]}>
          <GizmoViewport
            axisColors={['#ec4899', '#22c55e', '#3b82f6']}
            labelColor="#0f1014"
          />
        </GizmoHelper>
      </Canvas>
      <div className="pointer-events-none absolute bottom-3 left-3 rounded bg-black/40 px-2 py-1 font-mono text-[10px] text-white/70">
        3D preview · zoom in past the wall to view from inside · texture is dim from outside
      </div>
    </div>
  );
}

function Cylinder({ scene }: { scene: Scene | undefined }) {
  const template = useEditor((s) => s.project.template);
  const showGuides = useEditor((s) => s.view.showSegments);
  const outerRadius = 2.5;
  const innerRadius = 2.49;
  const height = (template.height / template.width) * (Math.PI * 2 * outerRadius);

  const outsideTexture = useLiveSceneTexture(scene, template, showGuides, false);
  const insideTexture = useLiveSceneTexture(scene, template, showGuides, true);

  return (
    <group>
      {/* Outside surface — dimmed */}
      <mesh>
        <cylinderGeometry args={[outerRadius, outerRadius, height, 96, 1, true]} />
        <meshBasicMaterial
          map={outsideTexture}
          side={THREE.FrontSide}
          transparent
          opacity={0.18}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>
      {/* Inside surface — full opacity, mirror-flipped so reads correctly */}
      <mesh>
        <cylinderGeometry args={[innerRadius, innerRadius, height, 96, 1, true]} />
        <meshBasicMaterial
          map={insideTexture}
          side={THREE.BackSide}
          toneMapped={false}
        />
      </mesh>
      {/* Floor ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -height / 2, 0]}>
        <ringGeometry args={[outerRadius - 0.005, outerRadius + 0.005, 96]} />
        <meshBasicMaterial color="#ec4899" />
      </mesh>
    </group>
  );
}

function useLiveSceneTexture(
  scene: Scene | undefined,
  template: Template,
  showGuides: boolean,
  insideFlip: boolean,
) {
  const initial = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 16;
    c.height = 16;
    const ctx = c.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 16, 16);
    }
    const tex = new THREE.CanvasTexture(c);
    applyFlip(tex, insideFlip);
    return tex;
  }, [insideFlip]);

  const [texture, setTexture] = useState<THREE.CanvasTexture>(initial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const canvas = await renderSceneToCanvas(scene, template, {
        width: 2048,
        showGuides,
      });
      if (cancelled) return;
      const tex = new THREE.CanvasTexture(canvas);
      applyFlip(tex, insideFlip);
      tex.needsUpdate = true;
      setTexture((prev) => {
        prev.dispose();
        return tex;
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [scene, template, showGuides, insideFlip]);

  return texture;
}

function applyFlip(tex: THREE.Texture, insideFlip: boolean) {
  tex.colorSpace = THREE.SRGBColorSpace;
  if (insideFlip) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = -1;
    tex.offset.x = 1;
  } else {
    tex.wrapS = THREE.RepeatWrapping;
    tex.repeat.x = 1;
    tex.offset.x = 0;
  }
}
