import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DirectionalLight, Vector3 } from "three";

/** Lighting rig for millimetre-scale dice. Directional/ambient lights
 *  (no distance falloff) so physically-correct Three.js lighting still reads. */
export function SceneLights() {
  return (
    <>
      <ambientLight color="#f4e6c4" intensity={1.7} />
      <hemisphereLight color="#ffe7b3" groundColor="#2a160e" intensity={1.35} />
      <directionalLight
        position={[30, 50, 35]}
        intensity={2.6}
        color="#fff3d2"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-40, 18, -28]} intensity={0.95} color="#8b6cff" />
      <directionalLight position={[16, -12, 32]} intensity={0.5} color="#c45a3a" />
    </>
  );
}

const _dir = new Vector3();

/** Even fill from the camera so a face-on inspect isn't a dark silhouette. */
export function CameraKeyLight({ enabled }: { enabled: boolean }) {
  const ref = useRef<DirectionalLight>(null);
  const { camera, scene } = useThree();

  useLayoutEffect(() => {
    const light = ref.current;
    if (!light) return;
    scene.add(light.target);
    return () => {
      scene.remove(light.target);
    };
  }, [scene]);

  useFrame(() => {
    const light = ref.current;
    if (!light) return;
    camera.getWorldDirection(_dir);
    light.position.copy(camera.position);
    light.target.position.copy(camera.position).add(_dir);
    light.target.updateMatrixWorld();
    light.intensity = enabled ? 2.4 : 0;
  });

  return <directionalLight ref={ref} color="#fff7e8" />;
}
