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
