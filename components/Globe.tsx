
import React, { useRef, useMemo, useState, useEffect, Suspense } from 'react';
import { useFrame } from '@react-three/fiber';
import { Stars, ArcballControls } from '@react-three/drei';
import * as THREE from 'three';
import { GLOBE_RADIUS } from '../constants';
import { SlotData } from '../types';

// The problematic manual JSX.IntrinsicElements declaration has been removed.
// Standard React and @react-three/fiber elements are automatically typed when
// the project is correctly configured with @types/react and @react-three/fiber.

interface SlotMarkerProps {
  slot: SlotData;
  onClick: (id: number) => void;
  onHover: (id: number | null) => void;
  isActive: boolean;
  isHovered: boolean;
}

interface GlobeViewProps {
  slots: SlotData[];
  onSlotClick: (id: number) => void;
  onHover: (id: number | null) => void;
  selectedSlotId: number | null;
  hoveredSlotId: number | null;
}

const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');
const textureCache: Record<string, THREE.Texture> = {};

const SlotMarker: React.FC<SlotMarkerProps> = ({ slot, onClick, onHover, isActive, isHovered }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const [textures, setTextures] = useState<THREE.Texture[]>([]);
  const frameIndex = useRef<number>(0);
  const lastUpdate = useRef<number>(0);

  useEffect(() => {
    const loadTex = (url: string): Promise<THREE.Texture | null> => {
      if (!url) return Promise.resolve(null);
      // Limpeza de URL para garantir cache eficiente e carregamento
      const optUrl = url.includes('picsum.photos') && !url.includes('?') ? `${url}?w=400` : url;
      
      if (textureCache[optUrl]) return Promise.resolve(textureCache[optUrl]);

      return new Promise((resolve) => {
        textureLoader.load(optUrl, (tex: THREE.Texture) => {
          tex.colorSpace = THREE.SRGBColorSpace;
          tex.minFilter = THREE.LinearFilter;
          textureCache[optUrl] = tex;
          resolve(tex);
        }, undefined, () => {
          console.warn(`Erro ao carregar textura: ${optUrl}`);
          resolve(null);
        });
      });
    };

    let isMounted = true;

    if (slot.imageUrl?.startsWith('LOOP:')) {
      try {
        const frames = JSON.parse(slot.imageUrl.replace('LOOP:', ''));
        Promise.all(frames.map((f: string) => loadTex(f))).then((texs: (THREE.Texture | null)[]) => {
          if (isMounted) {
            setTextures(texs.filter((t: THREE.Texture | null): t is THREE.Texture => t !== null));
          }
        });
      } catch (e) { 
        loadTex(slot.imageUrl).then((t: THREE.Texture | null) => {
          if (isMounted && t) setTextures([t]);
        });
      }
    } else {
      loadTex(slot.imageUrl).then((t: THREE.Texture | null) => {
        if (isMounted && t) setTextures([t]);
      });
    }

    return () => { isMounted = false; };
  }, [slot.imageUrl]);

  useFrame((state: any) => {
    if (meshRef.current) {
      const targetScale = isHovered || isActive ? 1.25 : 1.0;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.15);
    }
    if (textures.length > 0 && matRef.current) {
      if (textures.length > 1) {
        const now = state.clock.getElapsedTime();
        if (now - lastUpdate.current > 0.12) {
          frameIndex.current = (frameIndex.current + 1) % textures.length;
          matRef.current.map = textures[frameIndex.current];
          matRef.current.needsUpdate = true;
          lastUpdate.current = now;
        }
      } else {
        if (matRef.current.map !== textures[0]) {
          matRef.current.map = textures[0];
          matRef.current.needsUpdate = true;
        }
      }
    }
  });

  const position = useMemo(() => new THREE.Vector3(...slot.position), [slot.position]);
  const orientation = useMemo(() => {
    const q = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 0, 1);
    const normal = position.clone().normalize();
    q.setFromUnitVectors(up, normal);
    return q;
  }, [position]);

  return (
    <group position={position} quaternion={orientation}>
      <mesh 
        ref={meshRef}
        onClick={(e: any) => { e.stopPropagation(); onClick(slot.id); }} 
        onPointerOver={(e: any) => { e.stopPropagation(); onHover(slot.id); }} 
        onPointerOut={() => onHover(null)}
        rotation={[0, 0, slot.sides === 5 ? Math.PI / 10 : Math.PI / 6]}
      >
        <circleGeometry args={[GLOBE_RADIUS * 0.22, slot.sides]} />
        <meshBasicMaterial 
          ref={matRef}
          side={THREE.DoubleSide} 
          transparent 
          color={textures.length > 0 ? '#ffffff' : (slot.sides === 5 ? '#ef4444' : '#00e5ff')}
        />
      </mesh>
    </group>
  );
};

export const GlobeView: React.FC<GlobeViewProps> = ({ slots, onSlotClick, selectedSlotId, hoveredSlotId, onHover }) => {
  const globeGroupRef = useRef<THREE.Group>(null);

  useFrame((_state: any, delta: number) => {
    if (!selectedSlotId && globeGroupRef.current) {
      globeGroupRef.current.rotation.y += 0.08 * delta;
    }
  });

  return (
    <>
      <ArcballControls enablePan={false} minDistance={0.1} maxDistance={35} />
      <ambientLight intensity={0.6} />
      <pointLight position={[10, 10, 10]} intensity={1.5} />
      <Stars radius={100} depth={50} count={3000} factor={5} saturation={1} fade speed={3} />
      
      <group ref={globeGroupRef}>
          <mesh>
              <sphereGeometry args={[GLOBE_RADIUS - 0.08, 32, 32]} />
              <meshPhongMaterial color="#020205" side={THREE.BackSide} transparent opacity={0.6} />
          </mesh>
          <Suspense fallback={null}>
            {slots.map((slot: SlotData) => (
                <SlotMarker 
                  key={`${slot.id}-${slot.startTime}`} 
                  slot={slot} 
                  onClick={onSlotClick} 
                  onHover={onHover} 
                  isActive={selectedSlotId === slot.id} 
                  isHovered={hoveredSlotId === slot.id} 
                />
            ))}
          </Suspense>
      </group>
    </>
  );
};
