import { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { Font } from "opentype.js";
import { useDieBuild } from "../../hooks/useDieBuild";
import { useProjectStore } from "../../store/projectStore";
import { DieMesh } from "./DieMesh";
import type { DieInstance } from "../../engine/types";

function PlacedDie({
  die,
  font,
  index,
  count,
  solo,
}: {
  die: DieInstance;
  font: Font;
  index: number;
  count: number;
  solo: boolean;
}) {
  const logos = useProjectStore((s) => s.project.logos);
  const scale = useProjectStore((s) => s.project.globalFontScale);
  const selectedDieId = useProjectStore((s) => s.selectedDieId);
  const selectedFaceIndex = useProjectStore((s) => s.selectedFaceIndex);
  const selectDie = useProjectStore((s) => s.selectDie);
  const selectFace = useProjectStore((s) => s.selectFace);
  const { build } = useDieBuild(die, font, logos, scale);

  const position = useMemo(() => {
    if (solo) return [0, 0, 0] as [number, number, number];
    const spacing = Math.max(24, die.sizeMm * 1.45);
    const x = (index - (count - 1) / 2) * spacing;
    return [x, 0, 0] as [number, number, number];
  }, [index, count, solo]);

  if (!build) return null;
  const selected = die.id === selectedDieId;

  return (
    <group position={position}>
      <DieMesh
        build={build}
        color={die.color}
        selected={selected}
        selectedFace={selected ? selectedFaceIndex : null}
        onSelectDie={() => selectDie(die.id)}
        onSelectFace={(i) => selectFace(i)}
      />
    </group>
  );
}

export function DiceViewport({ font }: { font: Font | null }) {
  const dice = useProjectStore((s) => s.project.dice);
  const shown = dice;

  return (
    <div className="viewport">
      <Canvas
        shadows
        camera={{ position: [0, 28, 62], fov: 35, near: 0.1, far: 400 }}
        onPointerMissed={() => undefined}
      >
        <color attach="background" args={["#0c0907"]} />
        <hemisphereLight args={["#6a5a44", "#1a100c", 0.55]} />
        <spotLight
          position={[40, 70, 30]}
          angle={0.45}
          penumbra={0.5}
          intensity={2.2}
          color="#f0d7a0"
          castShadow
        />
        <pointLight position={[-30, 20, -20]} intensity={0.7} color="#6e4d9e" />
        <pointLight position={[10, -10, 40]} intensity={0.35} color="#9a2f2f" />
        <Suspense fallback={null}>
          {font &&
            shown.map((die, i) => (
              <PlacedDie
                key={die.id}
                die={die}
                font={font}
                index={i}
                count={shown.length}
                solo={shown.length === 1}
              />
            ))}
        </Suspense>
        <ContactShadows position={[0, -18, 0]} opacity={0.45} scale={180} blur={2.4} far={40} />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -18.02, 0]} receiveShadow>
          <circleGeometry args={[22, 64]} />
          <meshStandardMaterial color="#1a120c" metalness={0.3} roughness={0.7} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -17.96, 0]}>
          <ringGeometry args={[16, 16.35, 64]} />
          <meshBasicMaterial color="#d7b15a" transparent opacity={0.35} />
        </mesh>
        <OrbitControls enablePan makeDefault minDistance={18} maxDistance={160} />
      </Canvas>
      <div className="viewport-hint">
        Drag to orbit · Scroll to zoom · Click a face to inscribe it
      </div>
    </div>
  );
}
