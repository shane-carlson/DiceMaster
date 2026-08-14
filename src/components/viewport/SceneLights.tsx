import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { DirectionalLight, Vector3 } from "three";

/** Lighting rig for millimetre-scale dice. Directional/ambient lights
 *  (no distance falloff) so physically-correct Three.js lighting still reads. */
export function SceneLights({ dimmed = false }: { dimmed?: boolean }) {
  if (dimmed) {
    return (
      <>
        <ambientLight color="#ffffff" intensity={1.2} />
        <hemisphereLight color="#f4f7fb" groundColor="#c5cdd8" intensity={0.9} />
      </>
    );
  }
  return (
    <>
      <ambientLight color="#ffffff" intensity={1.35} />
      <hemisphereLight color="#f7f9fc" groundColor="#c8d0da" intensity={1.05} />
      <directionalLight
        position={[30, 50, 35]}
        intensity={2.1}
        color="#ffffff"
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-40, 18, -28]} intensity={0.55} color="#9ec4e8" />
      <directionalLight position={[16, -12, 32]} intensity={0.35} color="#f0d8c8" />
    </>
  );
}

const _dir = new Vector3();
const _right = new Vector3();
const _up = new Vector3();

/** Copy-stand key for face inspect: off-axis, enough to read pigment without clipping. */
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
    gl.toneMappingExposure = enabled ? 1.05 : 1.12;
    return () => {
      gl.toneMappingExposure = 1.12;
    };
  }, [enabled, gl]);

  useFrame(() => {
    const keyLight = key.current;
    const fillLight = fill.current;
    if (!keyLight || !fillLight) return;
    camera.getWorldDirection(_dir);
    _right.setFromMatrixColumn(camera.matrixWorld, 0).normalize();
    _up.copy(camera.up).normalize();
    const lookAt = _dir.copy(_dir).multiplyScalar(1);
    const look = camera.position.clone().add(lookAt);

    keyLight.position
      .copy(camera.position)
      .addScaledVector(_right, 8)
      .addScaledVector(_up, 10);
    keyLight.target.position.copy(look);
    keyLight.target.updateMatrixWorld();
    keyLight.intensity = enabled ? 2.05 : 0;

    fillLight.position
      .copy(camera.position)
      .addScaledVector(_right, -10)
      .addScaledVector(_up, -3);
    fillLight.target.position.copy(look);
    fillLight.target.updateMatrixWorld();
    fillLight.intensity = enabled ? 0.85 : 0;
  });

  return (
    <>
      <directionalLight ref={key} color="#ffffff" />
      <directionalLight ref={fill} color="#d7e4f2" />
    </>
  );
}
