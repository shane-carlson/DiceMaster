import { Component, useMemo, useRef, type ErrorInfo, type ReactNode } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { ACESFilmicToneMapping, BufferGeometry, Vector3 } from "three";
import type { Font } from "opentype.js";
import { useDieBuild } from "../../hooks/useDieBuild";
import { useProjectStore } from "../../store/projectStore";
import { DieMesh } from "./DieMesh";
import { FaceInspectLight, SceneLights } from "./SceneLights";
import type { DieInstance } from "../../engine/types";
import {
  applyViewPose,
  dieViewPose,
  faceViewPose,
  finiteVec,
  interpolatePose,
  overviewViewPose,
  type ViewPose,
} from "../../engine/cameraFocus";
import { usesVertexNumerals } from "../../engine/d4";
import { extractFaces } from "../../engine/faces";
import { createDieGeometry } from "../../engine/geometry";
import { dieWorldPosition, layoutSet } from "../../engine/layout";

type OrbitLike = {
  target: Vector3;
};

function AimAtOrigin() {
  const { camera, controls } = useThree();
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    camera.up.set(0, 1, 0);
    camera.lookAt(0, 0, 0);
    const orbit = controls as { target: Vector3 } | null;
    if (orbit?.target) {
      orbit.target.set(0, 0, 0);
      done.current = true;
    }
  });
  return null;
}

class ViewportErrorBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state = { message: null as string | null };
  static getDerivedStateFromError(error: Error) {
    return { message: error.message || "The 3D preview failed to start." };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("3D preview error", error, info.componentStack);
  }
  render() {
    if (this.state.message) {
      return (
        <div className="viewport-error">
          <p>The 3D preview hit a snag.</p>
          <small>{this.state.message}</small>
        </div>
      );
    }
    return this.props.children;
  }
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

function startPoseAnim(
  camera: { position: Vector3; up: Vector3 },
  orbit: OrbitLike,
  to: ViewPose,
  anim: { current: { from: ViewPose; to: ViewPose; started: number } | null },
) {
  anim.current = {
    from: {
      position: camera.position.clone(),
      target: orbit.target.clone(),
      up: currentUp(camera),
    },
    to: {
      position: to.position.clone(),
      target: to.target.clone(),
      up: to.up.clone(),
    },
    started: performance.now(),
  };
}

function FocusOnDie({
  dice,
  spacing,
  cameraY,
  cameraZ,
}: {
  dice: DieInstance[];
  spacing: number;
  cameraY: number;
  cameraZ: number;
}) {
  const { camera, controls } = useThree();
  const selectedDieId = useProjectStore((s) => s.selectedDieId);
  const selectedFaceIndex = useProjectStore((s) => s.selectedFaceIndex);
  const focusGeneration = useProjectStore((s) => s.focusGeneration);
  const viewResetGeneration = useProjectStore((s) => s.viewResetGeneration);
  const latest = useRef({
    dice,
    spacing,
    selectedDieId,
    selectedFaceIndex,
    camera,
    controls,
    cameraY,
    cameraZ,
    viewResetGeneration,
    focusGeneration,
  });
  latest.current = {
    dice,
    spacing,
    selectedDieId,
    selectedFaceIndex,
    camera,
    controls,
    cameraY,
    cameraZ,
    viewResetGeneration,
    focusGeneration,
  };
  const anim = useRef<{ from: ViewPose; to: ViewPose; started: number } | null>(null);
  const playedFocus = useRef(0);
  const playedReset = useRef(0);

  useFrame(() => {
    const snap = latest.current;
    const orbit = snap.controls as OrbitLike | null;
    if (!orbit?.target) return;

    if (snap.viewResetGeneration && snap.viewResetGeneration !== playedReset.current) {
      startPoseAnim(snap.camera, orbit, overviewViewPose(snap.cameraY, snap.cameraZ), anim);
      playedReset.current = snap.viewResetGeneration;
      playedFocus.current = snap.focusGeneration;
    } else if (
      snap.focusGeneration &&
      snap.focusGeneration !== playedFocus.current &&
      snap.selectedDieId
    ) {
      const to = poseForSelection(snap.dice, snap.spacing, snap.selectedDieId, snap.selectedFaceIndex);
      if (to) startPoseAnim(snap.camera, orbit, to, anim);
      playedFocus.current = snap.focusGeneration;
    }

    const a = anim.current;
    const cam = snap.camera;
    if (!a) return;
    const t = Math.min(1, (performance.now() - a.started) / 520);
    const k = 1 - (1 - t) ** 3;
    const pose = interpolatePose(a.from, a.to, k);
    if (applyViewPose(cam, pose)) orbit.target.copy(pose.target);
    if (t >= 1) {
      applyViewPose(cam, a.to);
      orbit.target.copy(a.to.target);
      anim.current = null;
    }
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
  font: Font | null;
  index: number;
  count: number;
  spacing: number;
}) {
  const logos = useProjectStore((s) => s.project.logos);
  const scale = useProjectStore((s) => s.project.globalFontScale);
  const selectedDieId = useProjectStore((s) => s.selectedDieId);
  const selectedFaceIndex = useProjectStore((s) => s.selectedFaceIndex);
  const previewMode = useProjectStore((s) => s.previewMode);
  const selectDie = useProjectStore((s) => s.selectDie);
  const focusDieFace = useProjectStore((s) => s.focusDieFace);
  const { build } = useDieBuild(die, font, logos, scale);
  const fallback = useMemo(
    () => createDieGeometry(die.type, die.sizeMm),
    [die.type, die.sizeMm],
  );
  const position = useMemo(
    () => dieWorldPosition(index, count, spacing),
    [index, count, spacing],
  );

  const selected = die.id === selectedDieId;
  const hidden = previewMode === "face" && die.id !== selectedDieId;

  return (
    <group position={position} visible={!hidden}>
      <DieMesh
        body={build?.body ?? fallback}
        glyphs={build?.glyphs ?? []}
        faces={build?.faces ?? []}
        color={die.color}
        selected={selected}
        selectedFace={selected ? selectedFaceIndex : null}
        inspectFace={previewMode === "face" && selected}
        onSelectDie={() => selectDie(die.id)}
        onSelectFace={(i) => focusDieFace(die.id, i)}
      />
    </group>
  );
}

export function DiceViewport({ font }: { font: Font | null }) {
  const dice = useProjectStore((s) => s.project.dice);
  const previewMode = useProjectStore((s) => s.previewMode);
  const resetView = useProjectStore((s) => s.resetView);
  const frameKey = dice.map((d) => `${d.id}:${Math.round(d.sizeMm)}:${d.type}`).join("|");
  const layout = useMemo(() => layoutSet(dice), [dice, frameKey]);
  const inspectingFace = previewMode === "face";

  return (
    <div className="viewport">
      <ViewportErrorBoundary>
        <div className="viewport-stage">
        <Canvas
          dpr={1}
          resize={{ offsetSize: true, debounce: 0 }}
          gl={{ antialias: true, toneMapping: ACESFilmicToneMapping, toneMappingExposure: 1.12 }}
          camera={{
            position: [0, layout.cameraY, layout.cameraZ],
            fov: layout.fov,
            near: 0.5,
            far: 4000,
          }}
          style={{ width: "100%", height: "100%", display: "block" }}
          onCreated={({ camera }) => {
            camera.position.set(0, layout.cameraY, layout.cameraZ);
            camera.up.set(0, 1, 0);
            camera.lookAt(0, 0, 0);
            camera.updateMatrixWorld();
          }}
        >
          <AimAtOrigin />
          <color attach="background" args={["#e8eef5"]} />
          <SceneLights dimmed={inspectingFace} />
          <FaceInspectLight enabled={inspectingFace} />
          {dice.map((die, i) => (
            <PlacedDie
              key={die.id}
              die={die}
              font={font}
              index={i}
              count={dice.length}
              spacing={layout.spacing}
            />
          ))}
          {!inspectingFace && (
            <>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, layout.groundY - 0.02, 0]}>
                <circleGeometry args={[layout.groundR, 64]} />
                <meshBasicMaterial color="#dce3ec" />
              </mesh>
              <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, layout.groundY + 0.04, 0]}>
                <ringGeometry args={[layout.groundR * 0.72, layout.groundR * 0.74, 64]} />
                <meshBasicMaterial color="#3087c6" />
              </mesh>
            </>
          )}
          <OrbitControls
            makeDefault
            enablePan
            minDistance={inspectingFace ? 8 : layout.minDistance}
            maxDistance={layout.maxDistance}
          />
          <FocusOnDie
            dice={dice}
            spacing={layout.spacing}
            cameraY={layout.cameraY}
            cameraZ={layout.cameraZ}
          />
        </Canvas>
        </div>
      </ViewportErrorBoundary>
      <button type="button" className="viewport-reset" onClick={resetView}>
        Reset view
      </button>
      <div className="viewport-hint">
        Drag to orbit · Scroll to zoom · Pick a face to zoom in with the numeral upright
      </div>
    </div>
  );
}
