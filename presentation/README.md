# Orbital presentation carousel (local first iteration)

This independent presentation lives at `presentation/` and does not alter the Episodes of Concern library. Start `python3 presentation/server.py` from the repository root, then open:

- Review and design: `http://127.0.0.1:8772/presentation/?mode=review`
- Clean presentation: `http://127.0.0.1:8772/presentation/?mode=present`

The review server saves edited presets, chapter overrides, component visibility, and camera views in `presentation/config.json`. It saves spot comments and their open or archived state in `presentation/comments.json`. Both are local and ignored by Git. `defaults.json` is the shared starting configuration. Use the browser's arrow keys to navigate; Space pauses or plays technical chapters. Choose a chapter in the top bar, adjust parameters in Scenario design, then save the preset or chapter configuration. The clean view reads the same saved configuration.

## Simulation model

Objects A and B begin as **synthetic** two-line element sets constructed from the inspector's GEO parameters. The TLE text shown in Chapter 1 is the same text used by the bundled SGP4 propagator. Each state and chart sample comes from that propagator until a modeled maneuver. After the first burn, Object B receives an instantaneous tangential velocity change and coasts under a two-body universal-variable solution. Later burns in the selected sequence are applied to the propagated state, keeping position continuous. The controls describe impulses and time between them; they do not model continuous thrust or a finite-duration burn. Object A continues under SGP4.

This is an **illustrative** design model. It does not include measured covariance, observations, a fitted orbit, real station-keeping commands, continuous thrust, or full perturbation consistency between the post-burn two-body arc and the SGP4 baseline. Long propagation after a burn can accumulate model differences. The uncertainty ellipsoid is explicitly hypothetical. Relative speed is the magnitude of the inertial velocity difference; range rate is the derivative of separation distance. Dwell time is summed from sampled midpoint intervals satisfying both user-set thresholds, so it is approximate and depends on chart resolution. No simulation establishes intent.

## Review conventions

`✚ Spot comment` lets a reviewer click a slide, scene, chart, card, playback bar, or inspector control. Comments store chapter, component, location, and simulation time. The comment drawer retains archived history. These comments are separate from the Dynamic Table and website review comment files.
