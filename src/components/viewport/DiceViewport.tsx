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
import { dieViewPose, faceViewPose, interpolatePose } from "../../engine/cameraFocus";
import { usesVertexNumerals } from "../../engine/d4";
import { extractFaces } from "../../engine/faces";
import { createDieGeometry } from "../../engine/geometry";
import { dieWorldPosition, layoutSet } from "../../engine/layout";

type OrbitLike = {
  target: Vector3;
  update: () => void;
  enabled: boolean;
};

function FrameCamera({ y, z, fov }: { y: number; z: number; fov: number }) {
  const { camera, controls } = useThree();
  useLayoutEffect(() => {
    camera.up.set(0, 1, 0);
    camera.position.set(0, y, z);
    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov;
    }
    camera.far = 4000;
    camera.near = 0.1;
    camera.updateProjectionMatrix();
    camera.lookAt(0, 0, 0);
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
  const selectedFaceIndex = useProjectStore((s) => s.selectedFaceIndex);
  const focusGeneration = useProjectStore((s) => s.focusGeneration);
  const anim = useRef<{
    from: { target: Vector3; position: Vector3; up: Vector3 };
    to: { target: Vector3; position: Vector3; up: Vector3 };
    t: number;
  } | null>(null);

  useLayoutEffect(() => {
    if (!focusGeneration || !selectedDieId) return;
    const idx = dice.findIndex((d) => d.id === selectedDieId);
    if (idx < 0) return;
    const orbit = controls as OrbitLike | null;
    if (!orbit?.target) return;
    const die = dice[idx];
    const origin = dieWorldPosition(idx, dice.length, spacing);
    let pose = dieViewPose(origin, die.sizeMm);
    if (selectedFaceIndex !== null) {
      const geom = createDieGeometry(die.type, die.sizeMm);
      const faces = extractFaces(geom, die.type);
      const face = faces[selectedFaceIndex];
      geom.dispose();
      if (face) {
        const rot = usesVertexNumerals(die.type)
          ? 0
          : (die.faces[selectedFaceIndex]?.primary.rotation ?? 0);
        pose = faceViewPose(origin, face, die.sizeMm, rot);
      }
    }
    anim.current = {
      from: {
        position: camera.position.clone(),
        target: orbit.target.clone(),
        up: camera.up.clone().normalize(),
      },
      to: pose,
      t: 0,
    };
    orbit.enabled = false;
    return () => {
      orbit.enabled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusGeneration, camera, controls]);

  useFrame((_, dt) => {
    const a = anim.current;
    const orbit = controls as OrbitLike | null;
    if (!a || !orbit?.target) return;
    a.t = Math.min(1, a.t + dt / 0.52);
    const k = 1 - (1 - a.t) ** 3;
    const pose = interpolatePose(a.from, a.to, k);
    camera.up.copy(pose.up);
    camera.position.copy(pose.position);
    orbit.target.copy(pose.target);
    camera.lookAt(orbit.target);
    if (a.t >= 1) {
      camera.up.copy(a.to.up);
      camera.position.copy(a.to.position);
      camera.lookAt(a.to.target);
      orbit.target.copy(a.to.target);
      orbit.enabled = true;
      orbit.update();
      anim.current = null;
    }
  }, 1);

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
  const focusDieFace = useProjectStore((s) => s.focusDieFace);
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
        onSelectFace={(i) => focusDieFace(die.id, i)}
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
        <FocusOnDie dice={dice} spacing={layout.spacing} />
      </Canvas>
      <div className="viewport-hint">
        Drag to orbit · Scroll to zoom · Pick a face to zoom in with the numeral upright
      </div>
    </div>
  );
}
