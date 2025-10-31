import { useRef, useState, useEffect, Suspense } from 'react';
import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';

interface Book3DProps {
  frontImage?: string;
  backImage?: string;
  binderImage?: string;
  innerPages?: string[];
  dimensions?: { width: number; height: number; depth: number };
}

function BookModel({ frontImage, backImage, binderImage, innerPages, dimensions }: Book3DProps) {
  const meshRef = useRef<THREE.Group>(null);
  const [pageFlipProgress, setPageFlipProgress] = useState(0);
  const [showInnerPage, setShowInnerPage] = useState(false);

  // Load textures
  const frontTexture = frontImage ? useLoader(THREE.TextureLoader, frontImage) : null;
  const backTexture = backImage ? useLoader(THREE.TextureLoader, backImage) : null;
  const binderTexture = binderImage ? useLoader(THREE.TextureLoader, binderImage) : null;
  const innerPageTexture = innerPages?.[0] ? useLoader(THREE.TextureLoader, innerPages[0]) : null;

  // Default dimensions in cm, convert to units (1 unit = 10cm)
  const width = (dimensions?.width || 15) / 10;
  const height = (dimensions?.height || 20) / 10;
  const depth = (dimensions?.depth || 2) / 10;

  // One-time page flip animation on mount
  useEffect(() => {
    if (innerPages && innerPages.length > 0) {
      const timeout = setTimeout(() => {
        setShowInnerPage(true);
        let progress = 0;
        const interval = setInterval(() => {
          progress += 0.02;
          setPageFlipProgress(progress);
          if (progress >= 1) {
            clearInterval(interval);
            // Reset after showing
            setTimeout(() => {
              setShowInnerPage(false);
              setPageFlipProgress(0);
            }, 2000);
          }
        }, 16);
      }, 1000);
      return () => clearTimeout(timeout);
    }
  }, [innerPages]);

  // Gentle rotation
  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Front cover */}
      <mesh position={[0, 0, depth / 2]}>
        <boxGeometry args={[width, height, 0.01]} />
        <meshStandardMaterial 
          map={frontTexture} 
          color={frontTexture ? 'white' : '#8B4513'}
        />
      </mesh>

      {/* Back cover */}
      <mesh position={[0, 0, -depth / 2]} rotation={[0, Math.PI, 0]}>
        <boxGeometry args={[width, height, 0.01]} />
        <meshStandardMaterial 
          map={backTexture} 
          color={backTexture ? 'white' : '#654321'}
        />
      </mesh>

      {/* Spine/Binder */}
      <mesh position={[-width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, height, 0.01]} />
        <meshStandardMaterial 
          map={binderTexture} 
          color={binderTexture ? 'white' : '#5D4E37'}
        />
      </mesh>

      {/* Top edge */}
      <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[width, depth, 0.01]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>

      {/* Bottom edge */}
      <mesh position={[0, -height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <boxGeometry args={[width, depth, 0.01]} />
        <meshStandardMaterial color="#F5F5DC" />
      </mesh>

      {/* Right edge (pages) */}
      <mesh position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <boxGeometry args={[depth, height, 0.01]} />
        <meshStandardMaterial color="#FFFACD" />
      </mesh>

      {/* Animated inner page */}
      {showInnerPage && innerPageTexture && (
        <mesh 
          position={[
            width / 2 - depth / 2 - 0.05, 
            0, 
            depth / 4
          ]} 
          rotation={[
            0, 
            -Math.PI / 2 - pageFlipProgress * Math.PI, 
            0
          ]}
        >
          <planeGeometry args={[width * 0.9, height * 0.9]} />
          <meshStandardMaterial 
            map={innerPageTexture} 
            side={THREE.DoubleSide}
            transparent
            opacity={0.9}
          />
        </mesh>
      )}
    </group>
  );
}

export default function Book3DView(props: Book3DProps) {
  return (
    <div className="w-full h-[500px] bg-gradient-to-b from-background to-muted rounded-lg overflow-hidden">
      <Canvas>
        <PerspectiveCamera makeDefault position={[0, 0, 5]} />
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <directionalLight position={[-10, -10, -5]} intensity={0.3} />
        <Suspense fallback={null}>
          <BookModel {...props} />
        </Suspense>
        <OrbitControls 
          enableZoom={true} 
          enablePan={false}
          minDistance={3}
          maxDistance={8}
        />
      </Canvas>
    </div>
  );
}