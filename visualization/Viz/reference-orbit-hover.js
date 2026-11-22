// Screen-space picking keeps a thin reference orbit easy to discover without
// making the rest of the globe canvas an oversized hover target.
export function installReferenceOrbitHover({ canvas, camera, orbit, earth, description }) {
  const tooltip = document.createElement("div");
  tooltip.className = "reference-orbit-tooltip";
  tooltip.hidden = true;
  tooltip.setAttribute("role", "tooltip");
  document.body.append(tooltip);
  const style = document.createElement("style");
  style.textContent = `.reference-orbit-tooltip{position:fixed;z-index:60;max-width:310px;padding:9px 11px;border:1px solid #d4c9b8;border-radius:7px;background:#fffdf8;color:#3f3b35;box-shadow:0 5px 20px #0002;font:12px/1.45 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;pointer-events:none}.reference-orbit-tooltip[hidden]{display:none}`;
  document.head.append(style);
  const a = { x: 0, y: 0 }, b = { x: 0, y: 0 };
  let last = null;
  const hide = () => { tooltip.hidden = true; canvas.style.cursor = ""; };
  canvas.addEventListener("pointerleave", hide);
  canvas.addEventListener("pointermove", event => {
    const line = typeof orbit === "function" ? orbit() : orbit;
    const position = line?.geometry?.getAttribute("position");
    if (!line?.visible || !position || position.count < 2) { hide(); return; }
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left, y = event.clientY - rect.top;
    const Vector3 = line.position.constructor;
    const point = new Vector3(), previous = new Vector3();
    const worldPoint = new Vector3(), worldPrevious = new Vector3();
    const globeCenter = new Vector3(), globeScale = new Vector3(), eye = new Vector3();
    if (earth) {
      earth.updateWorldMatrix(true, false);
      earth.getWorldPosition(globeCenter);
      earth.getWorldScale(globeScale);
      camera.getWorldPosition(eye);
    }
    line.updateWorldMatrix(true, false);
    camera.updateMatrixWorld();
    let distanceSquared = Infinity;
    for (let index = 1; index < position.count; index++) {
      worldPrevious.fromBufferAttribute(position, index - 1).applyMatrix4(line.matrixWorld);
      worldPoint.fromBufferAttribute(position, index).applyMatrix4(line.matrixWorld);
      previous.copy(worldPrevious).project(camera);
      point.copy(worldPoint).project(camera);
      if (previous.z > 1 || point.z > 1) continue;
      a.x = (previous.x + 1) * rect.width / 2; a.y = (1 - previous.y) * rect.height / 2;
      b.x = (point.x + 1) * rect.width / 2; b.y = (1 - point.y) * rect.height / 2;
      const dx = b.x - a.x, dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      const pixelDistance = (x - a.x - t * dx) ** 2 + (y - a.y - t * dy) ** 2;
      if (pixelDistance >= distanceSquared) continue;
      if (earth) {
        const toward = worldPrevious.clone().lerp(worldPoint, t).sub(eye);
        const closest = Math.max(0, Math.min(1, globeCenter.clone().sub(eye).dot(toward) / (toward.lengthSq() || 1)));
        if (eye.clone().addScaledVector(toward, closest).distanceTo(globeCenter) < globeScale.x * .999) continue;
      }
      distanceSquared = pixelDistance;
    }
    if (distanceSquared > 64) { hide(); return; }
    const label = description();
    if (label !== last) {
      tooltip.replaceChildren();
      const satellite = /\b(?:Athena-Fidus|Luch(?:[- ]Olymp(?:-K)?)?|Olymp(?:-K)?|ICEYE[- ]X\d+|(?:Cosmos|Kosmos|USA|SJ|Shijian|Shiyan|GSSAP|SY)[ -]\d+(?:[ -]\d+)?)\b/gi;
      let start = 0, match;
      while ((match = satellite.exec(label))) {
        tooltip.append(document.createTextNode(label.slice(start, match.index)));
        const italic = document.createElement("em"); italic.textContent = match[0]; tooltip.append(italic);
        start = match.index + match[0].length;
      }
      tooltip.append(document.createTextNode(label.slice(start))); last = label;
    }
    tooltip.hidden = false;
    tooltip.style.left = `${Math.min(innerWidth - tooltip.offsetWidth - 12, event.clientX + 14)}px`;
    tooltip.style.top = `${Math.min(innerHeight - tooltip.offsetHeight - 12, event.clientY + 16)}px`;
    canvas.style.cursor = "help";
  }, { passive: true });
  return { hide, tooltip };
}
