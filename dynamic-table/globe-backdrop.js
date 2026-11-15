/* A decorative globe behind the expanded card. The orbital preview owns the
   spacecraft and their trails; this canvas never changes their framing. */
import { feature } from "../visualization/Viz/vendor/topojson/topojson-client.js";

let mapPromise;
const RAD = Math.PI / 180;
const latitude0 = 20 * RAD, longitude0 = 10 * RAD;
function project(coordinate, radius, center) {
  const [longitude, latitude] = coordinate.map(value => value * RAD);
  const delta = longitude - longitude0;
  const visible = Math.sin(latitude0) * Math.sin(latitude) + Math.cos(latitude0) * Math.cos(latitude) * Math.cos(delta) > 0;
  return visible ? [center + radius * Math.cos(latitude) * Math.sin(delta), center - radius * (Math.cos(latitude0) * Math.sin(latitude) - Math.sin(latitude0) * Math.cos(latitude) * Math.cos(delta))] : null;
}
function rings(geometry) {
  if (geometry.type === "Polygon") return geometry.coordinates;
  if (geometry.type === "MultiPolygon") return geometry.coordinates.flat();
  return [];
}
export async function mountGlobeBackdrop(host) {
  const canvas = document.createElement("canvas");
  canvas.className = "globe-backdrop"; canvas.setAttribute("aria-hidden", "true");
  canvas.width = canvas.height = 900;
  host.prepend(canvas);
  const context = canvas.getContext("2d");
  const center = 450, radius = 430;
  context.beginPath(); context.arc(center, center, radius, 0, Math.PI * 2);
  const fill = context.createRadialGradient(320, 250, 25, center, center, radius);
  fill.addColorStop(0, "#f5f2ec"); fill.addColorStop(.65, "#d1ccc3"); fill.addColorStop(1, "#a9a399");
  context.fillStyle = fill; context.fill();
  context.strokeStyle = "#98938a"; context.lineWidth = 2; context.stroke();
  context.save(); context.clip();
  try {
    mapPromise ||= fetch("../visualization/Viz/vendor/countries-110m.json").then(response => {
      if (!response.ok) throw new Error("Country outlines unavailable");
      return response.json();
    });
    const topology = await mapPromise;
    if (!canvas.isConnected) return;
    context.strokeStyle = "rgba(100,98,93,.7)"; context.lineWidth = 1.45;
    for (const country of feature(topology, topology.objects.countries).features) {
      for (const ring of rings(country.geometry)) {
        context.beginPath(); let drawing = false;
        for (const coordinate of ring) {
          const point = project(coordinate, radius, center);
          if (!point) { drawing = false; continue; }
          if (drawing) context.lineTo(...point); else context.moveTo(...point);
          drawing = true;
        }
        context.stroke();
      }
    }
  } catch (error) { console.warn("Decorative globe outlines unavailable", error); }
  finally { context.restore(); }
  const selectedRow = host.closest(".expanded-row")?.previousElementSibling;
  const firstCell = selectedRow?.querySelector("td:first-child");
  if (firstCell && selectedRow.classList.contains("selected")) {
    const header = document.createElement("canvas"); header.className = "globe-header-backdrop"; header.setAttribute("aria-hidden", "true");
    header.width = canvas.width; header.height = canvas.height;
    header.getContext("2d").drawImage(canvas, 0, 0);
    header.style.setProperty("--header-height", `${selectedRow.offsetHeight}px`);
    firstCell.prepend(header);
  }
}
