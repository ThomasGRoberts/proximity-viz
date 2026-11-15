/* Adapted from SBI's polyhedron-model-link-reference.html, using its local
   Three.js r160 module, geometry, lighting, orbit drawing, and reverse motion. */
import * as THREE from "../visualization/Viz/vendor/three/three.module.js";

export function decorateModelLink(link) {
  if (!link.isConnected) return;
  const canvas = link.querySelector(".model-canvas");
  if (!canvas) return;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
  try {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 20);
    camera.position.set(0, 0, 4.3);
    camera.lookAt(0, 0, 0);
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    renderer.setSize(58, 58, false);
    renderer.setClearColor(0x000000, 0);
    scene.add(new THREE.AmbientLight(0xffffff, 0.75));
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.3);
    keyLight.position.set(1.35, 1.65, 2.4); scene.add(keyLight);
    const fillLight = new THREE.DirectionalLight(0xffe7a3, 0.2);
    fillLight.position.set(-1.35, -0.7, 1.35); scene.add(fillLight);
    const globe = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1, 1),
      new THREE.MeshStandardMaterial({ color: 0xf4ba20, emissive: 0xeaaa00,
        emissiveIntensity: 0.18, flatShading: true, roughness: 0.76, metalness: 0.08 })
    );
    globe.rotation.set(0.45, 0.65, 0); scene.add(globe);
    const orbitRoot = new THREE.Group();
    orbitRoot.rotation.set(THREE.MathUtils.degToRad(29), THREE.MathUtils.degToRad(15), THREE.MathUtils.degToRad(14));
    scene.add(orbitRoot);
    const segmentCount = 360, points = [], xAxis = new THREE.Vector3(1, 0, 0), yAxis = new THREE.Vector3(0, 1, 0);
    for (let index = 0; index <= segmentCount; index += 1) {
      const angle = index / segmentCount * Math.PI * 2;
      const point = new THREE.Vector3(Math.cos(angle) * 1.12, Math.sin(angle) * 1.12, 0);
      point.applyAxisAngle(xAxis, THREE.MathUtils.degToRad(64));
      point.applyAxisAngle(yAxis, THREE.MathUtils.degToRad(22));
      points.push(point);
    }
    const geometry = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), segmentCount, 0.024, 6, false);
    const orbit = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({ color: 0x000000, depthWrite: false }));
    orbitRoot.add(orbit);
    const setOrbit = value => geometry.setDrawRange(0, Math.floor(segmentCount * Math.max(0, Math.min(1, value))) * 6 * 6);
    const render = () => renderer.render(scene, camera);
    setOrbit(0); render();
    canvas.classList.add("model-canvas-ready");
    if (canvas.previousElementSibling) canvas.previousElementSibling.hidden = true;
    let frame = 0, animation = null, progress = 0, open = false;
    const restingRotation = globe.rotation.y;
    const ease = t => t * t * (3 - 2 * t);
    function animate(now) {
      if (!animation || !link.isConnected) return;
      const t = Math.min(1, (now - animation.start) / animation.duration), eased = ease(t);
      globe.rotation.y = animation.fromRotation + (animation.toRotation - animation.fromRotation) * eased;
      progress = animation.fromOrbit + (animation.toOrbit - animation.fromOrbit) * eased;
      setOrbit(progress); render();
      if (t < 1) frame = requestAnimationFrame(animate);
      else { progress = animation.toOrbit; animation = null; setOrbit(progress); render(); }
    }
    function startMotion(closing) {
      cancelAnimationFrame(frame);
      if (reducedMotion.matches) {
        globe.rotation.y = restingRotation + (closing ? 0 : 1.05);
        progress = closing ? 0 : 1; setOrbit(progress); render(); return;
      }
      animation = { start: performance.now(), duration: closing ? 700 : 950,
        fromRotation: globe.rotation.y, toRotation: restingRotation + (closing ? 0 : 1.05),
        fromOrbit: progress, toOrbit: closing ? 0 : 1 };
      frame = requestAnimationFrame(animate);
    }
    function setOpen(value) {
      if (open === value) return;
      open = value; link.classList.toggle("is-open", value); startMotion(!value);
    }
    link.addEventListener("pointerenter", () => setOpen(true));
    link.addEventListener("pointerleave", () => setOpen(false));
    link.addEventListener("focus", () => setOpen(true));
    link.addEventListener("blur", () => setOpen(false));
    const observer = new MutationObserver(() => {
      if (link.isConnected) return;
      observer.disconnect(); cancelAnimationFrame(frame);
      geometry.dispose(); globe.geometry.dispose(); globe.material.dispose(); orbit.material.dispose(); renderer.dispose();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch (error) {
    link.dataset.modelError = String(error?.message || error);
    canvas.remove();
    link.classList.add("model-static-fallback");
  }
}
