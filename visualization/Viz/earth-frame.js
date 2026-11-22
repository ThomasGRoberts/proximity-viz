import * as THREE from "./vendor/three/three.module.js";

const siderealRotation = new THREE.Matrix4();
const inertialToRelative = new THREE.Matrix4();
const orientation = new THREE.Matrix4();

// The Earth texture is fixed to the rotating Earth. In relative mode the
// spacecraft positions are expressed in the target's orbital basis, so the
// globe needs that same change of basis as well as sidereal rotation.
export function orientEarth(earth, mode, frame, ms) {
  siderealRotation.makeRotationY(window.satellite.gstime(new Date(ms)));
  if (mode === "eci") {
    earth.quaternion.setFromRotationMatrix(siderealRotation);
    return;
  }
  inertialToRelative.makeBasis(frame.along, frame.normal, frame.radial).transpose();
  orientation.multiplyMatrices(inertialToRelative, siderealRotation);
  earth.quaternion.setFromRotationMatrix(orientation);
}
