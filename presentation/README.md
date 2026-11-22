# Orbital presentation carousel (local first iteration)

This independent presentation lives at `presentation/` and does not alter the Episodes of Concern library. Start `python3 presentation/server.py` from the repository root, then open:

- Review and design: `http://127.0.0.1:8772/presentation/?mode=review`
- Clean presentation: `http://127.0.0.1:8772/presentation/?mode=present`

The review server saves edited presets, chapter overrides, component visibility, and camera views in `presentation/config.json`. It saves spot comments and their open or archived state in `presentation/comments.json`. Both are local and ignored by Git. `defaults.json` is the shared starting configuration. Right Arrow and Space advance one slide or teaching beat; Left Arrow goes back. Clicking a noninteractive slide also advances. Links, orbital controls, and the design inspector remain independently clickable. The playback button pauses or resumes a technical chapter. Choose a chapter in the top bar, adjust parameters in Scenario design, then save the preset, chapter configuration, or camera for the current teaching beat. The clean view reads the same saved configuration.

## Simulation model

The opening artwork borrows the invitation studio's two-body LEO target and chaser, sampling each point of the animated trail in the target's changing radial, along-track, cross-track frame. The chapter scenes use **synthetic** two-line element sets constructed from the inspector's GEO parameters. Their initial states and chart samples come from the bundled SGP4 propagator. Chapter 1's final beat adds an illustrative 60 m/s orbit-normal impulse to Object A at hour 8; its post-burn path is propagated continuously from the burn state, the previous orbit remains drawn, and a synthetic post-burn element set is displayed. Other optional maneuver sequences apply instantaneous tangential impulses to Object B and coast under a two-body universal-variable solution. These controls describe impulses and time between them; they do not model continuous thrust or a finite-duration burn.

This is an **illustrative** design model. It does not include measured covariance, observations, a fitted orbit, real station-keeping commands, continuous thrust, or full perturbation consistency between the post-burn two-body arc and the SGP4 baseline. Long propagation after a burn can accumulate model differences. The uncertainty ellipsoid is explicitly hypothetical. Relative speed is the magnitude of the inertial velocity difference; range rate is the derivative of separation distance. Dwell time is summed from sampled midpoint intervals satisfying both user-set thresholds, so it is approximate and depends on chart resolution. No simulation establishes intent.

## Review conventions

`✚ Spot comment` lets a reviewer click a slide, scene, chart, card, playback bar, or inspector control. Comments store chapter, component, location, and simulation time. The comment drawer retains archived history. These comments are separate from the Dynamic Table and website review comment files.
