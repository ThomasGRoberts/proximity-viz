# Research-area WordPress blocks

The three `space-*-complete-block.html` files in this folder are the full Custom HTML blocks copied by the website review pane. Replace the existing Custom HTML block on the corresponding WordPress page with the copied content. The local preview renders the same saved block inside the live site's page frame.

For each future area-page edit, update the affected complete block, add an entry below, and commit the files. Git preserves the exact content of each version.

| Date | Pages | Change |
| --- | --- | --- |
| 2026-11-25 | Space Security, Space Sustainability, Space Coordination | Kept the reviewed five-card page size without scrolling to Research Updates on initial load; user-initiated pagination still scrolls there. |
| 2026-11-25 | Space Security, Space Sustainability, Space Coordination | Added project-style mobile author rows from the published publication and student sheets, including full-size photos, the four-circle layout, and a `+N` circle for longer lists. Updated full blocks to `special-output-cards.js?v=10`. |
| 2026-11-25 | Space Security, Space Sustainability, Space Coordination | Preserved full author names and photos on mobile model and data repository cards, restored their category icons, and standardized author links. Updated the complete blocks to `special-output-cards.js?v=9`. |
| 2026-11-25 | Space Security, Space Sustainability, Space Coordination | Created complete replacement blocks from the then-current live WordPress area blocks and included the reviewed `special-output-cards.js?v=8` treatment. Replaced the add-on-only copy workflow. |
| 2026-11-24 | All three areas | Centered model and repository action text and added space around student hover cards (`3947255`). |
| 2026-11-24 | All three areas | Set research updates to five cards per page and kept model and repository icons from being replaced by author photos (`fd9d397`). |
| 2026-11-24 | All three areas | Aligned author lists and `+N` badges, restored area video playback, and adjusted card spacing (`3137af4`, `c605cfe`). |

The WordPress theme and page header surround these blocks; those site elements are managed separately.
