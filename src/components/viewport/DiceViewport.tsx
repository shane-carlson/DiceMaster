import { Suspense, useLayoutEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping, PerspectiveCamera, Vector3 } from "three";
import type { Font } from "opentype.js";
import { useDieBuild } from "../../hooks/useDieBuild";
import { useProjectStore } from "../../store/projectStore";
import { DieMesh } from "./DieMesh";
import { SceneLights } from "./SceneLights";
import type { DieInstance } from "../../engine/types";
import { dieWorldPosition, layoutSet } from "../../engine/layout";

type OrbitLike = {
  target: Vector3;
  update: () => void;
};

function FrameCamera({ y, z, fov }: { y: number; z: number; fov: number }) {
  const { camera, controls } = useThree();
  useLayoutEffect(() => {
    camera.position.set(0, y, z);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov;
    }
    camera.far = 4000;
    camera.near = 0.1;
    camera.updateProjectionMatrix();
    const orbit = controls as OrbitLike | null;
    if (orbit?.target) {
      orbit.target.set(0, 0, 0);
      orbit.update();
    }
  }, [camera, controls, y, z, fov]);
  return null;
}

function FocusOnDie({
  dice,
  spacing,
}: {
  dice: DieInstance[];
  spacing: number;
}) {
  const { camera, controls } = useThree();
  const selectedDieId = useProjectStore((s) => s.selectedDieId);
  const focusGeneration = useProjectStore((s) => s.focusGeneration);
  const anim = useRef<{
    fromCam: Vector3;
    fromTarget: Vector3;
    toCam: Vector3;
    toTarget: Vector3;
    t: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!focusGeneration || !selectedDieId) return;
    const idx = dice.findIndex((d) => d.id === selectedDieId);
    if (idx < 0) return;
    const orbit = controls as OrbitLike | null;
    if (!orbit?.target) return;
    const [x, y, z] = dieWorldPosition(idx, dice.length, spacing);
    const size = dice[idx].sizeMm;
    const dist = Math.max(size * 2.35, 28);
    anim.current = {
      fromCam: camera.position.clone(),
      fromTarget: orbit.target.clone(),
      toCam: new Vector3(x + size * 0.12, y + size * 0.4, z + dist),
      toTarget: new Vector3(x, y, z),
      t: 0,
    };
    // Zoom only when the user picks a die from the vault, not when the set changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusGeneration, camera, controls]);

  useFrame((_, dt) => {
    const a = anim.current;
    const orbit = controls as OrbitLike | null;
    if (!a || !orbit?.target) return;
    a.t = Math.min(1, a.t + dt / 0.42);
    const k = 1 - (1 - a.t) ** 3;
    camera.position.lerpVectors(a.fromCam, a.toCam, k);
    orbit.target.lerpVectors(a.fromTarget, a.toTarget, k);
    orbit.update();
    if (a.t >= 1) anim.current = null;
  });

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

  const position = useMemo(
    () => dieWorldPosition(index, count, spacing),
    [index, count, spacing],
  );

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
        <FocusOnDie dice={dice} spacing={layout.spacing} />
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
        Drag to orbit · Scroll to zoom · Pick a die from the vault to inspect it
      </div>
    </div>
  );
}
