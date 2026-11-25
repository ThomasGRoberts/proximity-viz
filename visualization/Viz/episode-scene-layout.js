/* All episode canvases fill the viewport; the camera's optical center follows
   the portion visible beside the open control panel. */
export function offsetCameraForPanel(camera, sceneHost, { miniScene = false, panelPreview = false } = {}) {
  const panel = document.getElementById("ui");
  const panelHidden = document.body.classList.contains("ui-collapsed") || document.body.classList.contains("episode-panel-collapsed");
  const width = Math.max(1, sceneHost.clientWidth), height = Math.max(1, sceneHost.clientHeight);
  const edge = miniScene || panelPreview || innerWidth <= 760 || panelHidden || !panel
    ? 0 : Math.max(0, Math.ceil(panel.getBoundingClientRect().right - sceneHost.getBoundingClientRect().left + 18));
  if (edge) camera.setViewOffset(width, height, -edge / 2, 0, width, height);
  else camera.clearViewOffset();
}

export function watchEpisodePanelLayout(resize) {
  new MutationObserver(resize).observe(document.body, { attributes: true, attributeFilter: ["class"] });
}
