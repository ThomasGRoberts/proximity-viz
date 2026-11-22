import { MARKER } from "../../shared/marker-spec.js";

// The countries are drawn into the globe surface texture, so their edges have
// the same radius as the ocean. Both colors darken with the globe on hover.
export function miniLandTexture(THREE, features) {
  const canvas = document.createElement("canvas");
  canvas.width = 2048;
  canvas.height = 1024;
  const context = canvas.getContext("2d");
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = "#f3f0ea";

  for (const feature of features) {
    const geometry = feature.geometry;
    const polygons = geometry?.type === "Polygon" ? [geometry.coordinates]
      : geometry?.type === "MultiPolygon" ? geometry.coordinates : [];
    for (const polygon of polygons) {
      // Unwrap each ring before painting its copies across the texture seam.
      const rings = polygon.map(ring => {
        let previous = null;
        return ring.map(([longitude, latitude]) => {
          let x = (.5 + longitude / 360) * canvas.width;
          if (previous !== null) {
            while (x - previous > canvas.width / 2) x -= canvas.width;
            while (previous - x > canvas.width / 2) x += canvas.width;
          }
          previous = x;
          return [x, (.5 - latitude / 180) * canvas.height];
        });
      });
      for (const wrap of [-1, 0, 1]) {
        context.beginPath();
        for (const ring of rings) {
          ring.forEach(([x, y], index) => index ? context.lineTo(x + wrap * canvas.width, y)
            : context.moveTo(x + wrap * canvas.width, y));
          context.closePath();
        }
        context.fill("evenodd");
      }
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 8;
  return texture;
}

function blendHex(color, background, visibleFraction) {
  const channels = [1, 3, 5].map(index => Math.round(
    parseInt(color.slice(index, index + 2), 16) * visibleFraction +
    parseInt(background.slice(index, index + 2), 16) * (1 - visibleFraction)
  ));
  return `#${channels.map(channel => channel.toString(16).padStart(2, "0")).join("")}`;
}

// The fill and outline are premixed with the mini scene's warm background.
// Their texture pixels stay fully opaque, so a trail cannot show through a dot.
export function opaqueMutedDotTexture(THREE, fill, background = "#fffcf6", visibleFraction = .55) {
  const colors = {
    fill: blendHex(fill, background, visibleFraction),
    outline: blendHex(MARKER.outline, background, visibleFraction),
  };
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const context = canvas.getContext("2d");
  context.beginPath();
  context.arc(64, 64, 37, 0, 2 * Math.PI);
  context.fillStyle = colors.fill;
  context.fill();
  context.lineWidth = 2 * 43.5 * MARKER.outlinePx / MARKER.diameterPx;
  context.strokeStyle = colors.outline;
  context.stroke();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function miniMutedDotTexture(THREE, fill, visibleFraction = .55) {
  return opaqueMutedDotTexture(THREE, fill, "#fffcf6", visibleFraction);
}

export function miniMutedColors(fill, visibleFraction = .55) {
  return {
    fill: blendHex(fill, "#fffcf6", visibleFraction),
    outline: blendHex(MARKER.outline, "#fffcf6", visibleFraction),
  };
}
