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

type BookState = 'idle' | 'openingCover' | 'openHold' | 'pageFlip' | 'pageHold' | 'closingPages' | 'closingCover';
function BookModel({ frontImage, backImage, binderImage, innerPages, dimensions }: Book3DProps) {
    const meshRef = useRef<THREE.Group>(null);
    const frontCoverRef = useRef<THREE.Group>(null);
    const flippingPageRef = useRef<THREE.Group>(null); 
    
    // Load textures
    const [frontTexture] = useLoader(THREE.TextureLoader, frontImage ? [frontImage] : []);
    const [backTexture] = useLoader(THREE.TextureLoader, backImage ? [backImage] : []);
    const [binderTexture] = useLoader(THREE.TextureLoader, binderImage ? [binderImage] : []);
    const innerPageTextures = useLoader(THREE.TextureLoader, innerPages || []); 
    
    // --- DIMENSIONS & CONSTANTS ---
    const width = (dimensions?.width || 15) / 10;
    const height = (dimensions?.height || 20) / 10;
    const depth = (dimensions?.depth || 2) / 10;
    const coverThickness = 0.015;
    const pageThickness = 0.0005;
    const innerPageWidth = width * 0.95; // Page width for plane geometry

    // --- ANIMATION STATE ---
    const stateRef = useRef<BookState>('idle');
    const coverProgRef = useRef(0);
    const pageProgRef = useRef(0);
    const holdStartRef = useRef<number | null>(null);
    const hasEnoughPagesForFlip = innerPageTextures.length >= 2; 

    // Trigger the opening animation loop (UNCHANGED)
    useEffect(() => {
        if (!innerPages || innerPages.length === 0) return;
        const t = window.setTimeout(() => {
            if (stateRef.current === 'idle') {
                stateRef.current = 'openingCover';
                coverProgRef.current = 0;
                pageProgRef.current = 0;
            }
        }, 700);
        return () => clearTimeout(t);
    }, [innerPages]);

    // Animation Loop (Update rotation)
    useFrame((state, delta) => {
        if (meshRef.current) meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.06;

        const speed = 1.0;
        const fullAngle = Math.PI; 
        const holdMs = 2000;
        const now = performance.now();
        const checkHold = () => (holdStartRef.current ?? now) + holdMs <= now;

        // --- STATE MACHINE --- (UNCHANGED)
        switch (stateRef.current) {
            case 'openingCover':
                coverProgRef.current = Math.min(1, coverProgRef.current + delta * speed);
                if (coverProgRef.current >= 1) { stateRef.current = 'openHold'; holdStartRef.current = now; }
                break;
            case 'openHold':
                if (checkHold()) { stateRef.current = hasEnoughPagesForFlip ? 'pageFlip' : 'closingCover'; pageProgRef.current = 0; }
                break;
            case 'pageFlip':
                pageProgRef.current = Math.min(1, pageProgRef.current + delta * speed);
                if (pageProgRef.current >= 1) { stateRef.current = 'pageHold'; holdStartRef.current = now; }
                break;
            case 'pageHold':
                if (checkHold()) { stateRef.current = 'closingPages'; }
                break;
            case 'closingPages':
                pageProgRef.current = Math.max(0, pageProgRef.current - delta * speed);
                if (pageProgRef.current <= 0) { stateRef.current = 'closingCover'; }
                break;
            case 'closingCover':
                coverProgRef.current = Math.max(0, coverProgRef.current - delta * speed);
                if (coverProgRef.current <= 0) { 
                    stateRef.current = 'idle';
                    window.setTimeout(() => {
                        if (stateRef.current === 'idle') stateRef.current = 'openingCover';
                    }, 500); 
                }
                break;
            case 'idle':
            default:
                break;
        }

        // --- APPLY ROTATIONS ---
        // 1. Front Cover (Rotates 180 degrees to the LEFT)
        if (frontCoverRef.current) {
            frontCoverRef.current.rotation.y = -coverProgRef.current * fullAngle;
        }

        // 2. Flipping Page (Second Page) - Starts at 0 (open), flips to -PI (left side)
        if (flippingPageRef.current && hasEnoughPagesForFlip) {
            let currentAngle = 0;

            if (stateRef.current === 'pageFlip') {
                currentAngle = -(pageProgRef.current * fullAngle); 
            } else if (stateRef.current === 'pageHold') {
                currentAngle = -fullAngle; 
            } else if (stateRef.current === 'closingPages') {
                currentAngle = -fullAngle + (pageProgRef.current * fullAngle);
            } 
            
            // This ensures the page is flat on the right when the cover first opens
            if (coverProgRef.current < 1 && stateRef.current !== 'idle') {
                currentAngle = 0; 
            }

            flippingPageRef.current.rotation.y = currentAngle;
        }
    });

    // --- RENDERING ---
    return (
        <group ref={meshRef}>
            
            {/* 1. SPINE (STATIONARY) */}
            <mesh position={[-width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
                <boxGeometry args={[depth, height, coverThickness]} />
                <meshStandardMaterial map={binderTexture} color={!binderTexture ? "#5D4E37" : "white"} />
            </mesh>

            {/* 2. BACK COVER (STATIONARY) - Visible when cover is closed (z is negative) */}
            <mesh position={[0, 0, -depth / 2 - coverThickness / 2]} renderOrder={25}>
                <boxGeometry args={[width, height, coverThickness]} />
                <meshStandardMaterial 
                    map={backTexture} 
                    color={backTexture ? "white" : "#654321"} 
                    side={THREE.DoubleSide}
                />
            </mesh>
            
            {/* 3. PAGES BLOCK (Static mass) - Sits in the middle */}
            <group position={[-width / 2 + coverThickness, 0, 0]}>
                <mesh position={[width / 2 - coverThickness, 0, 0]} renderOrder={5}>
                    <boxGeometry args={[width - coverThickness * 2, height, depth - coverThickness * 2]} />
                    <meshStandardMaterial color="#FFFACD" />
                </mesh>
            </group>

            {/* 4. STATIC RIGHT PAGE (Page 4) - Revealed when the flipping page is on the left */}
            {/* This static page is at the same hinge as the flipping page, but doesn't move */}
            {innerPageTextures.length >= 3 && (
                <group
                    // Hinge point
                    position={[-width / 2 + pageThickness, 0, depth / 2 - coverThickness - pageThickness]} 
                >
                    {/* *** FIX: Mesh offset to place it flat on the right side *** */}
                    <mesh position={[innerPageWidth / 2, 0, 0]} renderOrder={14}>
                        <planeGeometry args={[innerPageWidth, height * 0.95]} />
                        <meshStandardMaterial 
                            map={innerPageTextures[2]} 
                            side={THREE.FrontSide} 
                            color={"white"} 
                        /> 
                    </mesh>
                </group>
            )}
            
            {/* 5. FLIPPING PAGE (Page 2/3 Spread) - STARTS ON RIGHT, FLIPS TO LEFT */}
            {hasEnoughPagesForFlip && (
                <group
                    ref={flippingPageRef}
                    // Hinge point (at the spine)
                    position={[-width / 2 + pageThickness, 0, depth / 2 - coverThickness - pageThickness]} 
                >
                    {/* *** FIX: Mesh offset to place its left edge on the hinge (rotation point) *** */}
                    <mesh position={[innerPageWidth / 2, 0, 0]} renderOrder={15}>
                         <planeGeometry args={[innerPageWidth, height * 0.95]} />
                         <meshStandardMaterial 
                             // Front side (Page 2)
                             map={innerPageTextures[1]} 
                             // Back side (Page 3)
                             map-back={innerPageTextures[2] || undefined}
                             side={THREE.DoubleSide}
                             color={"white"}
                         /> 
                    </mesh>
                </group>
            )}


            {/* 6. FRONT COVER GROUP (INSIDE COVER/FIRST INNER PAGE) - ROTATES */}
            <group
                ref={frontCoverRef}
                // Hinge point is at the spine's edge (x = -width/2, z is positive)
                position={[-width / 2, 0, depth / 2 + coverThickness / 2]} 
            >
                {/* Front Cover Mesh (The outside of the cover) */}
                <mesh position={[width / 2, 0, 0]} renderOrder={20}>
                    <boxGeometry args={[width, height, coverThickness]} />
                    <meshStandardMaterial map={frontTexture} color={!frontTexture ? "#8B4513" : "white"} />
                </mesh>
                
                {/* First Inner Page Texture (Inside of the front cover - LEFT PAGE) */}
                {innerPageTextures[0] && (
                    <mesh 
                        // Positioned on the left side when open (offset half width back)
                        position={[width / 2, 0, -coverThickness / 2 - 0.001]}
                        rotation={[0, Math.PI, 0]} // Rotated 180 deg to face inward
                        renderOrder={19}
                    >
                        <planeGeometry args={[innerPageWidth, height * 0.95]} />
                        <meshStandardMaterial map={innerPageTextures[0]} side={THREE.FrontSide} />
                    </mesh>
                )}
            </group>

            {/* 7. TOP / BOTTOM EDGES (STATIONARY) */}
            <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[width, depth, 0.01]} />
                <meshStandardMaterial color="#F5F5DC" />
            </mesh>
            <mesh position={[0, -height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <boxGeometry args={[width, depth, 0.01]} />
                <meshStandardMaterial color="#F5F5DC" />
            </mesh>
        </group>
    );
}
// function BookModel2({ frontImage, backImage, binderImage, innerPages, dimensions }: Book3DProps) {
//     const meshRef = useRef<THREE.Group>(null);
//     const frontCoverRef = useRef<THREE.Group>(null);
//     const flippingPageRef = useRef<THREE.Group>(null); // Renamed from secondPageRef for clarity
    
//     // Load textures
//     const [frontTexture] = useLoader(THREE.TextureLoader, frontImage ? [frontImage] : []);
//     const [backTexture] = useLoader(THREE.TextureLoader, backImage ? [backImage] : []);
//     const [binderTexture] = useLoader(THREE.TextureLoader, binderImage ? [binderImage] : []);
//     const innerPageTextures = useLoader(THREE.TextureLoader, innerPages || []); 
    
//     // --- DIMENSIONS & CONSTANTS ---
//     const width = (dimensions?.width || 15) / 10;
//     const height = (dimensions?.height || 20) / 10;
//     const depth = (dimensions?.depth || 2) / 10;
//     const coverThickness = 0.015;
//     const pageThickness = 0.0005;

//     // --- ANIMATION STATE ---
//     const stateRef = useRef<BookState>('idle');
//     const coverProgRef = useRef(0);
//     const pageProgRef = useRef(0);
//     const holdStartRef = useRef<number | null>(null);
//     // Need at least 2 pages for the first page spread and the first flip
//     const hasEnoughPagesForFlip = innerPageTextures.length >= 2; 

//     // Trigger the opening animation loop (UNCHANGED)
//     useEffect(() => {
//         if (!innerPages || innerPages.length === 0) return;
//         const t = window.setTimeout(() => {
//             if (stateRef.current === 'idle') {
//                 stateRef.current = 'openingCover';
//                 coverProgRef.current = 0;
//                 pageProgRef.current = 0;
//             }
//         }, 700);
//         return () => clearTimeout(t);
//     }, [innerPages]);

//     // Animation Loop (Update rotation) - STATE MACHINE UNCHANGED
//     useFrame((state, delta) => {
//         if (meshRef.current) meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.06;

//         const speed = 1.0;
//         const fullAngle = Math.PI; 
//         const holdMs = 2000;
//         const now = performance.now();
//         const checkHold = () => (holdStartRef.current ?? now) + holdMs <= now;

//         // --- STATE MACHINE --- (UNCHANGED)
//         switch (stateRef.current) {
//             case 'openingCover':
//                 coverProgRef.current = Math.min(1, coverProgRef.current + delta * speed);
//                 if (coverProgRef.current >= 1) { stateRef.current = 'openHold'; holdStartRef.current = now; }
//                 break;
//             case 'openHold':
//                 if (checkHold()) { stateRef.current = hasEnoughPagesForFlip ? 'pageFlip' : 'closingCover'; pageProgRef.current = 0; }
//                 break;
//             case 'pageFlip':
//                 pageProgRef.current = Math.min(1, pageProgRef.current + delta * speed);
//                 if (pageProgRef.current >= 1) { stateRef.current = 'pageHold'; holdStartRef.current = now; }
//                 break;
//             case 'pageHold':
//                 if (checkHold()) { stateRef.current = 'closingPages'; }
//                 break;
//             case 'closingPages':
//                 pageProgRef.current = Math.max(0, pageProgRef.current - delta * speed);
//                 if (pageProgRef.current <= 0) { stateRef.current = 'closingCover'; }
//                 break;
//             case 'closingCover':
//                 coverProgRef.current = Math.max(0, coverProgRef.current - delta * speed);
//                 if (coverProgRef.current <= 0) { 
//                     stateRef.current = 'idle';
//                     window.setTimeout(() => {
//                         if (stateRef.current === 'idle') stateRef.current = 'openingCover';
//                     }, 500); 
//                 }
//                 break;
//             case 'idle':
//             default:
//                 break;
//         }

//         // --- APPLY ROTATIONS ---
//         // 1. Front Cover (Rotates 180 degrees to the LEFT)
//         if (frontCoverRef.current) {
//             frontCoverRef.current.rotation.y = -coverProgRef.current * fullAngle;
//         }

//         // 2. Flipping Page (Second Page)
//         if (flippingPageRef.current && hasEnoughPagesForFlip) {
//             let targetAngle = 0;

//             // Base state: If cover is open, page is static at 0 degrees, ready to flip
//             if (coverProgRef.current > 0) {
//                 targetAngle = 0; 
//             }
            
//             // Active page flip: Rotates from 0 to -180 degrees (to the left, ending flat on the left side)
//             if (stateRef.current === 'pageFlip') {
//                 targetAngle = -(pageProgRef.current * fullAngle); 
//             } else if (stateRef.current === 'pageHold') {
//                 targetAngle = -fullAngle; // Fully flipped position (left side)
//             } else if (stateRef.current === 'closingPages') {
//                 // Page flips back from -180 to 0
//                 targetAngle = -fullAngle + (pageProgRef.current * fullAngle);
//             } 
            
//             flippingPageRef.current.rotation.y = targetAngle;
//         }
//     });

//     // --- RENDERING ---
//     return (
//         <group ref={meshRef}>
            
//             {/* 1. SPINE (STATIONARY) */}
//             <mesh position={[-width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
//                 <boxGeometry args={[depth, height, coverThickness]} />
//                 <meshStandardMaterial map={binderTexture} color={!binderTexture ? "#5D4E37" : "white"} />
//             </mesh>

//             {/* 2. BACK COVER (STATIONARY) */}
//             <mesh position={[0, 0, -depth / 2 - coverThickness / 2]}>
//                 <boxGeometry args={[width, height, coverThickness]} />
//                 <meshStandardMaterial 
//                     map={backTexture} 
//                     color={backTexture ? "white" : "#654321"} 
//                     side={THREE.DoubleSide}
//                 />
//             </mesh>
            
//             {/* 3. PAGES BLOCK (Static mass on the right) */}
//             <group position={[-width / 2 + coverThickness, 0, 0]}>
//                 <mesh position={[width / 2 - coverThickness, 0, 0]} renderOrder={5}>
//                     <boxGeometry args={[width - coverThickness * 2, height, depth - coverThickness * 2]} />
//                     <meshStandardMaterial color="#FFFACD" />
//                 </mesh>
//             </group>

//             {/* 4. RIGHT PAGE (STATIC) - Page 3/4 spread, sits on the right side */}
//             {/* This replaces the old thirdPageRef logic to display the *next* static page on the right */}
//             {hasEnoughPagesForFlip && (
//                 <group
//                     // Positioned exactly like the spine/hinge, but renders on top of the page block
//                     position={[-width / 2 + pageThickness, 0, depth / 2 - coverThickness - pageThickness]} 
//                 >
//                     <mesh position={[width / 2 - pageThickness, 0, 0]} renderOrder={14}>
//                         <planeGeometry args={[width * 0.95, height * 0.95]} />
//                         {/* If page 3 exists, show it. Otherwise, show blank/white. */}
//                         <meshStandardMaterial 
//                             map={innerPageTextures[2]} 
//                             side={THREE.FrontSide} 
//                             color={!innerPageTextures[2] ? "#FFFFFF" : "white"} 
//                         /> 
//                     </mesh>
//                 </group>
//             )}
            
//             {/* 5. FLIPPING PAGE (Page 2/3 Spread) - STARTS ON RIGHT, FLIPS TO LEFT */}
//             {/* This will reveal Page 2 on the right, and when it flips, Page 3/4 spread will be visible */}
//             {hasEnoughPagesForFlip && (
//                 <group
//                     ref={flippingPageRef}
//                     // Hinge point is slightly inside the book stack (at the spine)
//                     position={[-width / 2 + pageThickness, 0, depth / 2 - coverThickness - pageThickness]} 
//                 >
//                     {/* The page mesh needs to be offset half its width to the right of the hinge */}
//                     <mesh position={[width / 2 - pageThickness, 0, 0]} renderOrder={15}>
//                          <planeGeometry args={[width * 0.95, height * 0.95]} />
//                          <meshStandardMaterial 
//                              // Front side (when open, this is the right page): Page 2
//                              map={innerPageTextures[1]} 
//                              // Back side (when flipped, this is the left page): Page 3
//                              map-side={THREE.BackSide} 
//                              // Front side map (innerPageTextures[1])
//                              map-front={innerPageTextures[1]}
//                              // Back side map (if available, Page 3 is mapped to the back of the flipping page)
//                              map-back={innerPageTextures[2] || undefined}
//                              side={THREE.DoubleSide}
//                              color={"white"}
//                          /> 
//                     </mesh>
//                 </group>
//             )}


//             {/* 6. FRONT COVER GROUP (INSIDE COVER/FIRST INNER PAGE) - ROTATES */}
//             <group
//                 ref={frontCoverRef}
//                 position={[-width / 2, 0, depth / 2 + coverThickness / 2]}
//             >
//                 {/* Front Cover Mesh (The outside of the cover) */}
//                 <mesh position={[width / 2, 0, 0]} renderOrder={20}>
//                     <boxGeometry args={[width, height, coverThickness]} />
//                     <meshStandardMaterial map={frontTexture} color={!frontTexture ? "#8B4513" : "white"} />
//                 </mesh>
                
//                 {/* First Inner Page Texture (Inside of the front cover - LEFT PAGE) */}
//                 {innerPageTextures[0] && (
//                     <mesh 
//                         position={[width / 2, 0, -coverThickness / 2 - 0.001]}
//                         rotation={[0, Math.PI, 0]} // Rotated 180 deg to face inward
//                         renderOrder={19}
//                     >
//                         <planeGeometry args={[width * 0.95, height * 0.95]} />
//                         <meshStandardMaterial map={innerPageTextures[0]} side={THREE.FrontSide} />
//                     </mesh>
//                 )}
//             </group>


//             {/* 7. TOP / BOTTOM EDGES (STATIONARY) */}
//             <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
//                 <boxGeometry args={[width, depth, 0.01]} />
//                 <meshStandardMaterial color="#F5F5DC" />
//             </mesh>
//             <mesh position={[0, -height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
//                 <boxGeometry args={[width, depth, 0.01]} />
//                 <meshStandardMaterial color="#F5F5DC" />
//             </mesh>
//         </group>
//     );
// }

// function BookModel({ frontImage, backImage, binderImage, innerPages, dimensions }: Book3DProps) {
//   const meshRef = useRef<THREE.Group>(null);
//   const [pageFlipProgress, setPageFlipProgress] = useState(0);
//   const [showInnerPage, setShowInnerPage] = useState(false);

//   // Load textures
//   const frontTexture = frontImage ? useLoader(THREE.TextureLoader, frontImage) : null;
//   const backTexture = backImage ? useLoader(THREE.TextureLoader, backImage) : null;
//   const binderTexture = binderImage ? useLoader(THREE.TextureLoader, binderImage) : null;
//   const innerPageTexture = innerPages?.[0] ? useLoader(THREE.TextureLoader, innerPages[0]) : null;

//   // Default dimensions in cm, convert to units (1 unit = 10cm)
//   const width = (dimensions?.width || 15) / 10;
//   const height = (dimensions?.height || 20) / 10;
//   const depth = (dimensions?.depth || 2) / 10;

//   // One-time page flip animation on mount
//   useEffect(() => {
//     if (innerPages && innerPages.length > 0) {
//       const timeout = setTimeout(() => {
//         setShowInnerPage(true);
//         let progress = 0;
//         const interval = setInterval(() => {
//           progress += 0.02;
//           setPageFlipProgress(progress);
//           if (progress >= 1) {
//             clearInterval(interval);
//             // Reset after showing
//             setTimeout(() => {
//               setShowInnerPage(false);
//               setPageFlipProgress(0);
//             }, 2000);
//           }
//         }, 16);
//       }, 1000);
//       return () => clearTimeout(timeout);
//     }
//   }, [innerPages]);

//   // Gentle rotation
//   useFrame((state) => {
//     if (meshRef.current) {
//       meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;
//     }
//   });

//   return (
//     <group ref={meshRef}>
//       {/* Front cover */}
//       <mesh position={[0, 0, depth / 2]}>
//         <boxGeometry args={[width, height, 0.01]} />
//         <meshStandardMaterial 
//           map={frontTexture} 
//           color={frontTexture ? 'white' : '#8B4513'}
//         />
//       </mesh>

//       {/* Back cover */}
//       <mesh position={[0, 0, -depth / 2]} rotation={[0, Math.PI, 0]}>
//         <boxGeometry args={[width, height, 0.01]} />
//         <meshStandardMaterial 
//           map={backTexture} 
//           color={backTexture ? 'white' : '#654321'}
//         />
//       </mesh>

//       {/* Spine/Binder */}
//       <mesh position={[-width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
//         <boxGeometry args={[depth, height, 0.01]} />
//         <meshStandardMaterial 
//           map={binderTexture} 
//           color={binderTexture ? 'white' : '#5D4E37'}
//         />
//       </mesh>

//       {/* Top edge */}
//       <mesh position={[0, height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
//         <boxGeometry args={[width, depth, 0.01]} />
//         <meshStandardMaterial color="#F5F5DC" />
//       </mesh>

//       {/* Bottom edge */}
//       <mesh position={[0, -height / 2, 0]} rotation={[Math.PI / 2, 0, 0]}>
//         <boxGeometry args={[width, depth, 0.01]} />
//         <meshStandardMaterial color="#F5F5DC" />
//       </mesh>

//       {/* Right edge (pages) */}
//       <mesh position={[width / 2, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
//         <boxGeometry args={[depth, height, 0.01]} />
//         <meshStandardMaterial color="#FFFACD" />
//       </mesh>

//       {/* Animated inner page */}
//       {showInnerPage && innerPageTexture && (
//         <mesh 
//           position={[
//             width / 2 - depth / 2 - 0.05, 
//             0, 
//             depth / 4
//           ]} 
//           rotation={[
//             0, 
//             -Math.PI / 2 - pageFlipProgress * Math.PI, 
//             0
//           ]}
//         >
//           <planeGeometry args={[width * 0.9, height * 0.9]} />
//           <meshStandardMaterial 
//             map={innerPageTexture} 
//             side={THREE.DoubleSide}
//             transparent
//             opacity={0.9}
//           />
//         </mesh>
//       )}
//     </group>
//   );
// }

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