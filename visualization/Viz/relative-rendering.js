/* Shared marker and fading trail drawing for the full model and E-001 preview. */
import * as THREE from "./vendor/three/three.module.js";

export const DOT_SCREEN_SIZE = .022;
export const SATELLITE_STYLES = {
  A: { dot: "#eaaa00", line: 0xeaaa00 },
  B: { dot: "#7a7a7a", line: 0x7a7a7a },
};

export function dotTexture(fillColor) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d");
  ctx.beginPath(); ctx.arc(64, 64, 37, 0, Math.PI * 2);
  ctx.fillStyle = fillColor; ctx.fill();
  ctx.lineWidth = 12; ctx.strokeStyle = "#000"; ctx.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function fadingTrailGeometry(points) {
  const geometry = new THREE.BufferGeometry();
  if (points.length < 2) return geometry;
  const positions = [], previous = [], next = [], sides = [], ages = [], indices = [];
  for (let i = 0; i < points.length; i++) {
    for (const side of [-1, 1]) {
      positions.push(...points[i].toArray());
      previous.push(...points[Math.max(0, i - 1)].toArray());
      next.push(...points[Math.min(points.length - 1, i + 1)].toArray());
      sides.push(side); ages.push(i / (points.length - 1));
    }
    if (i) { const n = i * 2; indices.push(n - 2, n - 1, n, n - 1, n + 1, n); }
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("previous", new THREE.Float32BufferAttribute(previous, 3));
  geometry.setAttribute("next", new THREE.Float32BufferAttribute(next, 3));
  geometry.setAttribute("side", new THREE.Float32BufferAttribute(sides, 1));
  geometry.setAttribute("age", new THREE.Float32BufferAttribute(ages, 1));
  geometry.setIndex(indices);
  return geometry;
}

export function fadingTrailMaterial(slot) {
  return new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(SATELLITE_STYLES[slot].line) }, uOpacity: { value: .82 }, uResolution: { value: new THREE.Vector2(1, 1) } },
    vertexShader: `uniform vec2 uResolution; attribute vec3 previous; attribute vec3 next; attribute float side; attribute float age; varying float vAlpha;
      void main() {
        vec4 clip = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        vec4 a = projectionMatrix * modelViewMatrix * vec4(previous, 1.0);
        vec4 b = projectionMatrix * modelViewMatrix * vec4(next, 1.0);
        vec2 tangent = (b.xy / b.w - a.xy / a.w) * uResolution;
        tangent = length(tangent) > 0.0001 ? normalize(tangent) : vec2(1.0, 0.0);
        vec2 normal = vec2(-tangent.y, tangent.x);
        clip.xy += normal * side * 1.1 * 2.0 / uResolution * clip.w;
        gl_Position = clip;
        vAlpha = pow(age, 1.4);
      }`,
    fragmentShader: `uniform vec3 uColor; uniform float uOpacity; varying float vAlpha;
      void main() {
        gl_FragColor = vec4(uColor, vAlpha * uOpacity);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, depthTest: true, side: THREE.DoubleSide
  });
}
