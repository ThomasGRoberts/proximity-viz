import * as THREE from "../visualization/Viz/vendor/three/three.module.js";
import { feature } from "../visualization/Viz/vendor/topojson/topojson-client.js";
import { miniLandTexture } from "../visualization/Viz/mini-scene-style.js";
import { fadingTrailMaterial } from "../visualization/Viz/relative-rendering.js";

// The episode visualizer's deduplicated, interpolated country-boundary treatment.
let countriesPromise;
let sharedLandTexture;
export async function loadGlobeGeography({ land = false, radius = 1.005 } = {}) {
  countriesPromise ||= fetch("../visualization/Viz/vendor/countries-50m.json").then(response => {
    if (!response.ok) throw new Error(`Country boundaries unavailable (${response.status})`);
    return response.json();
  }).then(topology => feature(topology, topology.objects.countries).features);
  const countries = await countriesPromise;
  const positions = [], seen = new Set();
  const key = coordinate => `${coordinate[0].toFixed(5)},${coordinate[1].toFixed(5)}`;
  const point = ([lon, lat]) => {
    const phi = THREE.MathUtils.degToRad(lat), theta = THREE.MathUtils.degToRad(lon);
    return new THREE.Vector3(radius * Math.cos(phi) * Math.cos(theta), radius * Math.sin(phi), -radius * Math.cos(phi) * Math.sin(theta));
  };
  for (const country of countries) {
    const geometry = country.geometry;
    const rings = geometry.type === "Polygon" ? geometry.coordinates : geometry.type === "MultiPolygon" ? geometry.coordinates.flat() : [];
    for (const ring of rings) for (let i = 1; i < ring.length; i++) {
      const a = ring[i - 1], b = ring[i], edge = [key(a), key(b)].sort().join("|");
      if (seen.has(edge)) continue;
      seen.add(edge);
      const first = point(a), last = point(b), angle = first.angleTo(last);
      if (angle > THREE.MathUtils.degToRad(25)) continue;
      const steps = Math.max(1, Math.ceil(THREE.MathUtils.radToDeg(angle)));
      let previous = first;
      for (let j = 1; j <= steps; j++) {
        const next = first.clone().lerp(last, j / steps).normalize().multiplyScalar(radius);
        positions.push(...previous.toArray(), ...next.toArray());
        previous = next;
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if(land)sharedLandTexture ||= miniLandTexture(THREE,countries);
  return { geometry, landTexture: land ? sharedLandTexture : null };
}

export function adjustableCountryBorders(segments, color, opacity, thickness, width, height) {
  const position=[],previous=[],next=[],side=[],age=[],indices=[];
  for(let i=0;i<segments.length;i+=6){
    const a=segments.slice(i,i+3),b=segments.slice(i+3,i+6),base=position.length/3;
    for(const [point,edge] of [[a,-1],[a,1],[b,-1],[b,1]]){
      position.push(...point);previous.push(...a);next.push(...b);side.push(edge);age.push(1);
    }
    indices.push(base,base+1,base+2,base+1,base+3,base+2);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(position,3));
  geometry.setAttribute("previous",new THREE.Float32BufferAttribute(previous,3));
  geometry.setAttribute("next",new THREE.Float32BufferAttribute(next,3));
  geometry.setAttribute("side",new THREE.Float32BufferAttribute(side,1));
  geometry.setAttribute("age",new THREE.Float32BufferAttribute(age,1));
  geometry.setIndex(indices);
  const material=fadingTrailMaterial("A",Number(thickness)/2,1);
  material.uniforms.uColor.value.set(color);
  material.uniforms.uOpacity.value=Number(opacity);
  material.uniforms.uResolution.value.set(width,height);
  const borders=new THREE.Mesh(geometry,material);
  borders.frustumCulled=false;borders.renderOrder=3;
  return borders;
}
