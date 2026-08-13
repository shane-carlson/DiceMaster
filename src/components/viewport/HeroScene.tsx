import { Canvas } from "@react-three/fiber";
import { Float, OrbitControls } from "@react-three/drei";
import { useMemo } from "react";
import { ACESFilmicToneMapping } from "three";
import { createDieGeometry } from "../../engine/geometry";
import { SceneLights } from "./SceneLights";

function HeroDie() {
  const geom = useMemo(() => createDieGeometry("d20", 22), []);
  const d6 = useMemo(() => createDieGeometry("d6", 12), []);
  const d8 = useMemo(() => createDieGeometry("d8", 13), []);
  const d12 = useMemo(() => createDieGeometry("d12", 14), []);

  return (
    <group>
      <Float speed={1.4} rotationIntensity={0.45} floatIntensity={0.6}>
        <mesh geometry={geom} castShadow>
          <meshStandardMaterial color="#9a2f2f" roughness={0.38} metalness={0.02} flatShading />
        </mesh>
      </Float>
      <Float speed={1.8} rotationIntensity={0.7} floatIntensity={0.8}>
        <mesh geometry={d6} position={[-16, -4, 6]} rotation={[0.4, 0.7, 0.1]}>
          <meshStandardMaterial color="#2d6a4f" roughness={0.4} metalness={0.02} flatShading />
        </mesh>
      </Float>
      <Float speed={1.2} rotationIntensity={0.5} floatIntensity={0.5}>
        <mesh geometry={d8} position={[15, 3, -4]} rotation={[0.2, -0.4, 0.3]}>
          <meshStandardMaterial color="#2c4a7a" roughness={0.38} metalness={0.02} flatShading />
        </mesh>
      </Float>
      <Float speed={1.6} rotationIntensity={0.35} floatIntensity={0.7}>
        <mesh geometry={d12} position={[8, -8, 8]}>
          <meshStandardMaterial color="#6b4c9a" roughness={0.42} metalness={0.02} flatShading />
        </mesh>
      </Float>
    </group>
  );
}

export function HeroScene() {
  return (
    <Canvas
      camera={{ position: [0, 8, 42], fov: 38 }}
      gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.45 }}
    >
      <color attach="background" args={["#0d0a08"]} />
      <SceneLights />
      <HeroDie />
      <OrbitControls enablePan={false} autoRotate autoRotateSpeed={0.7} minDistance={28} maxDistance={70} />
    </Canvas>
  );
}
