// Render the textured Earth head-on for wide miniature compositions. The main
// perspective camera still controls the orbit, satellites and saved view;
// only the globe's screen silhouette is made circular.
export function miniCircularEarth(THREE, renderer, scene, earth, camera, sceneHost) {
  const planetScene = new THREE.Scene();
  const planet = earth.clone(true);
  planet.position.set(0, 0, 0);
  planetScene.add(planet);
  const planetCamera = new THREE.OrthographicCamera(-1.2, 1.2, 1.2, -1.2, .1, 10);
  const target = new THREE.WebGLRenderTarget(256, 256, { depthBuffer: true, stencilBuffer: false });
  const disk = new THREE.Sprite(new THREE.SpriteMaterial({ map: target.texture, transparent: true, alphaTest: .02, depthTest: true, depthWrite: true, sizeAttenuation: false }));
  disk.renderOrder = 0;
  scene.add(disk);
  earth.visible = false;
  const screenUp = new THREE.Vector3();
  const clearColor = new THREE.Color();
  let lastPaint = -Infinity;
  return () => {
    camera.updateMatrixWorld();
    screenUp.set(0, 1, 0).applyQuaternion(camera.quaternion);
    const upper = earth.position.clone().add(screenUp).project(camera);
    const lower = earth.position.clone().sub(screenUp).project(camera);
    const height = Math.max(1, sceneHost.clientHeight);
    const diameterPx = Math.abs(upper.y - lower.y) * height / 2;
    // A globe that fills the frame needs the native sphere's texture detail.
    if (diameterPx > 340) { disk.visible = false; earth.visible = true; return; }
    disk.visible = true; earth.visible = false;
    const now = performance.now();
    if (now - lastPaint >= 100) {
      lastPaint = now;
      planet.quaternion.copy(earth.quaternion);
      planetCamera.position.copy(camera.position).sub(earth.position).normalize().multiplyScalar(4);
      planetCamera.up.copy(screenUp);
      planetCamera.lookAt(0, 0, 0);
      const previousTarget = renderer.getRenderTarget();
      renderer.getClearColor(clearColor);
      const previousAlpha = renderer.getClearAlpha();
      renderer.setRenderTarget(target);
      renderer.setClearColor(0xffffff, 0);
      renderer.render(planetScene, planetCamera);
      renderer.setRenderTarget(previousTarget);
      renderer.setClearColor(clearColor, previousAlpha);
    }
    disk.position.copy(earth.position);
    // The disk occupies 2/2.4 of its square texture.
    const spritePx = diameterPx * 1.2;
    disk.scale.setScalar(spritePx * 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) / (height * camera.zoom));
  };
}
