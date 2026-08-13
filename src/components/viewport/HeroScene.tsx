import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { createDieGeometry } from "../../engine/geometry";
import { MeshStandardMaterial } from "three";

function HeroDie() {
  const geom = useMemo(() => createDieGeometry("d20", 22), []);
  const mat = useMemo(
    () =>
      new MeshStandardMaterial({
        color: "#6b1d1d",
        metalness: 0.28,
        roughness: 0.35,
        emissive: "#2a0a0a",
        emissiveIntensity: 0.15,
      }),
    [],
  );
  const d6 = useMemo(() => createDieGeometry("d6", 12), []);
  const d8 = useMemo(() => createDieGeometry("d8", 13), []);
  const d12 = useMemo(() => createDieGeometry("d12", 14), []);

  return (
    <group>
      <Float speed={1.4} rotationIntensity={0.45} floatIntensity={0.6}>
        <mesh geometry={geom} material={mat} castShadow />
      </Float>
      <Float speed={1.8} rotationIntensity={0.7} floatIntensity={0.8}>
        <mesh geometry={d6} position={[-16, -4, 6]} rotation={[0.4, 0.7, 0.1]}>
          <meshStandardMaterial color="#1e3d2f" metalness={0.2} roughness={0.4} />
        </mesh>
      </Float>
      <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh geometry={d8} position={[15, 3, -4]} rotation={[0.2, -0.4, 0.3]}>
          <meshStandardMaterial color="#1a2744" metalness={0.25} roughness={0.38} />
        </mesh>
      </Float>
      <Float speed={1.6} rotationIntensity={0.35} floatIntensity={0.7}>
        <mesh geometry={d12} position={[8, -8, 8]}>
          <meshStandardMaterial color="#4a2c6a" metalness={0.22} roughness={0.42} />
        </mesh>
      </Float>
    </group>
  );
}

export function HeroScene() {
  return (
    <Canvas camera={{ position: [0, 8, 42], fov: 38 }}>
      <color attach="background" args={["#0d0a08"]} />
      <ambientLight intensity={0.35} />
      <spotLight position={[20, 30, 20]} intensity={2} color="#f2d7a0" />
      <pointLight position={[-20, 10, -10]} intensity={0.8} color="#6e4d9e" />
      <HeroDie />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.7} minDistance={28} maxDistance={70} />
    </Canvas>
  );
}
