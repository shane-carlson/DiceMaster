import { Suspense, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping, BufferGeometry, PerspectiveCamera, Vector3 } from "three";
import type { Font } from "opentype.js";
import { useDieBuild } from "../../hooks/useDieBuild";
import { useProjectStore } from "../../store/projectStore";
import { DieMesh } from "./DieMesh";
import { SceneLights } from "./SceneLights";
import type { DieInstance } from "../../engine/types";
import {
  applyViewPose,
  dieViewPose,
  faceViewPose,
  finiteVec,
  interpolatePose,
  type ViewPose,
} from "../../engine/cameraFocus";
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

function currentUp(camera: { up: Vector3 }): Vector3 {
  if (finiteVec(camera.up) && camera.up.lengthSq() > 1e-8) {
    return camera.up.clone().normalize();
  }
  return new Vector3(0, 1, 0);
}

function poseForSelection(
  dice: DieInstance[],
  spacing: number,
  selectedDieId: string,
  selectedFaceIndex: number | null,
): ViewPose | null {
  const idx = dice.findIndex((d) => d.id === selectedDieId);
  if (idx < 0) return null;
  const die = dice[idx];
  const origin = dieWorldPosition(idx, dice.length, spacing);
  if (selectedFaceIndex === null) return dieViewPose(origin, die.sizeMm);
  let geom: BufferGeometry | undefined;
  try {
    geom = createDieGeometry(die.type, die.sizeMm);
    const face = extractFaces(geom, die.type)[selectedFaceIndex];
    if (!face) return dieViewPose(origin, die.sizeMm);
    const rot = usesVertexNumerals(die.type)
      ? 0
      : (die.faces[selectedFaceIndex]?.primary.rotation ?? 0);
    return faceViewPose(origin, face, die.sizeMm, rot);
  } catch {
    return dieViewPose(origin, die.sizeMm);
  } finally {
    geom?.dispose();
  }
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
  const latest = useRef({ dice, spacing, selectedDieId, selectedFaceIndex, camera, controls });
  latest.current = { dice, spacing, selectedDieId, selectedFaceIndex, camera, controls };
  const anim = useRef<{ from: ViewPose; to: ViewPose; started: number } | null>(null);

  useLayoutEffect(() => {
    if (!focusGeneration) return;
    const snap = latest.current;
    const orbit = snap.controls as OrbitLike | null;
    if (!snap.selectedDieId || !orbit?.target) return;
    const to = poseForSelection(snap.dice, snap.spacing, snap.selectedDieId, snap.selectedFaceIndex);
    if (!to) return;
    anim.current = {
      from: {
        position: snap.camera.position.clone(),
        target: orbit.target.clone(),
        up: currentUp(snap.camera),
      },
      to: {
        position: to.position.clone(),
        target: to.target.clone(),
        up: to.up.clone(),
      },
      started: performance.now(),
    };
  }, [focusGeneration]);

  useFrame(() => {
    const a = anim.current;
    const orbit = latest.current.controls as OrbitLike | null;
    const cam = latest.current.camera;
    if (!a || !orbit?.target) return;
    if (orbit.enabled === false) orbit.enabled = true;
    const t = Math.min(1, (performance.now() - a.started) / 520);
    const k = 1 - (1 - t) ** 3;
    const pose = interpolatePose(a.from, a.to, k);
    if (applyViewPose(cam, pose)) {
      orbit.target.copy(pose.target);
    }
    if (t >= 1) {
      applyViewPose(cam, a.to);
      orbit.target.copy(a.to.target);
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
  const [glKey, setGlKey] = useState(0);
  const recovers = useRef(0);

  return (
    <div className="viewport">
      <Canvas
        key={glKey}
        shadows
        dpr={[1, 1.5]}
        gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.45 }}
        camera={{
          position: [0, layout.cameraY, layout.cameraZ],
          fov: layout.fov,
          near: 0.1,
          far: 4000,
        }}
        onCreated={({ gl }) => {
          const el = gl.domElement;
          const onLost = (event: Event) => {
            event.preventDefault();
            if (recovers.current >= 2) return;
            recovers.current += 1;
            window.setTimeout(() => setGlKey((k) => k + 1), 250);
          };
          el.addEventListener("webglcontextlost", onLost, { once: true });
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
          minPolarAngle={0.12}
          maxPolarAngle={Math.PI - 0.12}
        />
        <FocusOnDie dice={dice} spacing={layout.spacing} />
      </Canvas>
      <div className="viewport-hint">
        Drag to orbit · Scroll to zoom · Pick a face to zoom in with the numeral upright
      </div>
    </div>
  );
}
