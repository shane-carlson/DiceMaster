import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DirectionalLight, Vector3 } from "three";

/** Lighting rig for millimetre-scale dice. Directional/ambient lights
 *  (no distance falloff) so physically-correct Three.js lighting still reads. */
export function SceneLights({ dimmed = false }: { dimmed?: boolean }) {
  const k = dimmed ? 0.08 : 1;
  return (
    <>
      <ambientLight color="#f4e6c4" intensity={1.7 * k} />
      <hemisphereLight color="#ffe7b3" groundColor="#2a160e" intensity={1.35 * k} />
      <directionalLight
        position={[30, 50, 35]}
        intensity={2.6 * k}
        color="#fff3d2"
        castShadow={!dimmed}
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-40, 18, -28]} intensity={0.95 * k} color="#8b6cff" />
      <directionalLight position={[16, -12, 32]} intensity={0.5 * k} color="#c45a3a" />
    </>
  );
}

const _dir = new Vector3();
const _right = new Vector3();
const _up = new Vector3();

/** Copy-stand key for face inspect: off-axis, modest intensity, no headlamp blowout. */
export function FaceInspectLight({ enabled }: { enabled: boolean }) {
  const key = useRef<DirectionalLight>(null);
  const fill = useRef<DirectionalLight>(null);
  const { camera, scene, gl } = useThree();

  useLayoutEffect(() => {
    const lights = [key.current, fill.current];
    for (const light of lights) {
      if (light) scene.add(light.target);
    }
    return () => {
      for (const light of lights) {
        if (light) scene.remove(light.target);
      }
    };
  }, [scene]);

  useLayoutEffect(() => {
    gl.toneMappingExposure = enabled ? 0.92 : 1.45;
    return () => {
      gl.toneMappingExposure = 1.45;
    };
  }, [enabled, gl]);

  useFrame(() => {
    const keyLight = key.current;
    const fillLight = fill.current;
    if (!keyLight || !fillLight) return;
    camera.getWorldDirection(_dir);
    _right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    _up.copy(camera.up).normalize();
    const look = camera.position.clone().add(_dir);

    keyLight.position
      .copy(camera.position)
      .addScaledVector(_right, 10)
      .addScaledVector(_up, 14);
    keyLight.target.position.copy(look);
    keyLight.target.updateMatrixWorld();
    keyLight.intensity = enabled ? 1.05 : 0;

    fillLight.position
      .copy(camera.position)
      .addScaledVector(_right, -12)
      .addScaledVector(_up, -4);
    fillLight.target.position.copy(look);
    fillLight.target.updateMatrixWorld();
    fillLight.intensity = enabled ? 0.28 : 0;
  });

  return (
    <>
      <directionalLight ref={key} color="#f3e6c8" />
      <directionalLight ref={fill} color="#c9b89a" />
    </>
  );
}
