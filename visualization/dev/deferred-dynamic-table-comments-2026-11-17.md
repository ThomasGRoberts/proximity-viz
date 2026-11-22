# Dynamic Table feedback received during E-005 panel review

Source: `/Users/troberts84/Downloads/review-comments.json` (two Library comments). These are recorded for a later Dynamic Table pass; this E-005 control-panel iteration does not change the table.

- E-002 expanded-row mini: its background is darker than the expanded row, and the globe is cropped to a small viewport rather than showing the whole globe.
- E-001 expanded-row mini: it should appear immediately when the row expands.

## 2026-11-22 follow-up

- E-001: resolved. Its scene now prewarms first and mounts directly when opened. The local browser showed the configured scene 0.19 seconds after row selection.
- E-002: the miniature and expanded row now use the same `#fffcf6` background. The remaining cropped Earth is produced by the later user-saved E-002 camera, which frames the satellite encounter at close scale. Preserve that saved framing for the next camera review rather than silently replacing it with a wide globe view.
