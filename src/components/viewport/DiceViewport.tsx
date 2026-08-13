import { Suspense, useLayoutEffect, useMemo } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping, PerspectiveCamera } from "three";
import type { Font } from "opentype.js";
import { useDieBuild } from "../../hooks/useDieBuild";
import { useProjectStore } from "../../store/projectStore";
import { DieMesh } from "./DieMesh";
import { SceneLights } from "./SceneLights";
import type { DieInstance } from "../../engine/types";
import { layoutSet } from "../../engine/layout";

function FrameCamera({ y, z, fov }: { y: number; z: number; fov: number }) {
  const { camera } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0, y, z);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov;
    }
    camera.far = 4000;
    camera.near = 0.1;
    camera.updateProjectionMatrix();
  }, [camera, y, z, fov]);
  return null;
}

function PlacedDie({
  die,
  font,
  index,
  count,
  spacing,
}: {
  die: DieInstance;
  font: Font;
  index: number;
  count: number;
  spacing: number;
}) {
  const logos = useProjectStore((s) => s.project.logos);
  const scale = useProjectStore((s) => s.project.globalFontScale);
  const selectedDieId = useProjectStore((s) => s.selectedDieId);
  const selectedFaceIndex = useProjectStore((s) => s.selectedFaceIndex);
  const selectDie = useProjectStore((s) => s.selectDie);
  const selectFace = useProjectStore((s) => s.selectFace);
  const { build } = useDieBuild(die, font, logos, scale);

  const position = useMemo(() => {
    if (count <= 1) return [0, 0, 0] as [number, number, number];
    const x = (index - (count - 1) / 2) * spacing;
    return [x, 0, 0] as [number, number, number];
  }, [index, count, spacing]);

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
  const frameKey = dice.map((d) => `${d.id}:${Math.round(d.sizeMm)}:${d.type}`).join("|");
  const layout = useMemo(() => layoutSet(dice), [dice, frameKey]);

  return (
    <div className="viewport">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.45 }}
        camera={{
          position: [0, layout.cameraY, layout.cameraZ],
          fov: layout.fov,
          near: 0.1,
          far: 4000,
        }}
        onPointerMissed={() => undefined}
      >
        <color attach="background" args={["#0c0907"]} />
        <FrameCamera y={layout.cameraY} z={layout.cameraZ} fov={layout.fov} />
        <SceneLights />
        <Suspense fallback={null}>
          {font &&
            dice.map((die, i) => (
              <PlacedDie
                key={die.id}
                die={die}
                font={font}
                index={i}
                count={dice.length}
                spacing={layout.spacing}
              />
            ))}
        </Suspense>
        <ContactShadows
          position={[0, layout.groundY, 0]}
          opacity={0.4}
          scale={Math.max(layout.width * 1.6, 80)}
          blur={2.4}
          far={layout.maxSize * 2}
        />
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, layout.groundY - 0.02, 0]} receiveShadow>
          <circleGeometry args={[layout.groundR, 64]} />
          <meshStandardMaterial color="#1a120c" metalness={0} roughness={0.85} />
        </mesh>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, layout.groundY + 0.04, 0]}>
          <ringGeometry args={[layout.groundR * 0.72, layout.groundR * 0.74, 64]} />
          <meshBasicMaterial color="#d7b15a" transparent opacity={0.35} />
        </mesh>
        <OrbitControls
          enablePan
          makeDefault
          minDistance={layout.minDistance}
          maxDistance={layout.maxDistance}
        />
      </Canvas>
      <div className="viewport-hint">
        Drag to orbit · Scroll to zoom · Click a face to inscribe it
      </div>
    </div>
  );
}
