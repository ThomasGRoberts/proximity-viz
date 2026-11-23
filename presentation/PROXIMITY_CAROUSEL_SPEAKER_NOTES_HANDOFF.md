# Handoff for ordered side-event speaker notes

Use this to draft concise, spoken notes for Thomas González Roberts’s **How Close Is Too Close?** side event at the fourth session of the OEWG on PAROS, November 23, 2026. Follow the current carousel order below. Give each slide and each progressive reveal a short cue, a plain-language point, and a transition. Keep the four discussion questions verbatim. Make the notes useful at a lectern rather than writing a new essay. Flag claims that need a source rather than inventing them.

## Current carousel order

1. **Opening — How Close Is Too Close?** Tagline: “Building Shared Understanding of Satellite Behavior.” Introduce the event’s question: what physical characteristics and context help states discuss concerning proximity operations?
2. **The lab’s research areas.** Four progressive views: all research areas, Space Coordination, Space Sustainability, and Space Security. Situate the project at the intersection of these areas.
3. **Official statements: proximity operations, close approaches, and shadowing.** States have expressed concern in different contexts; their statements do not establish one universally accepted numerical threshold.
4. **Six voices on proximity.** Reveal the United Kingdom, China, Australia, European Union, Netherlands, and United States in that order. Use the actual on-screen statements; do not paraphrase them as a single consensus or assert common attribution beyond the source text.
5. **Physical parameters as a basis for concern.** Two reveals: unusual dynamics, then the context needed to judge whether they are disturbing. Ask what physical basis of concern can be described in common.
6. **How to describe an orbit.** Three reveals: orbital elements, orbit in motion, updated elements. Six orbital elements describe the modeled path. Public two-line element sets (TLEs) are estimates at particular epochs, refreshed when observations arrive.
7. **Orbital uncertainty.** The ellipsoid is illustrative. Public TLEs generally do not include covariance, so the shown ellipsoid is not a measured confidence region. Avoid precise claims from it.
8. **Two neighboring GEO satellites.** Three reveals: Object A, introduce Object B, and relative view. Nearby geostationary longitudes can look uneventful in an Earth-centered frame; relative motion makes differences legible. The simulation is illustrative, not a historical episode.
9. **Relative motion.** Three reveals: separation distance, relative speed, and dwell time. Separation is distance between two reconstructed positions. Relative speed is the magnitude of the difference between their velocity vectors in a common frame. Dwell time is duration inside a chosen proximity threshold. These answer different questions. Do not say a low relative speed or short distance alone establishes hostile intent.
10. **Episodes of Concerning Satellite Proximity library.** Show the historical episode table, orbital reconstructions, chapter windows, dynamic measures, and source records. Explain that examples make the discussion concrete while remaining dependent on public observations and modeling choices.
11. **How Close Is Too Close? project page.** Show the project’s broader home and where the audience can explore the library after the event. The live website may block framing in some browsers; have a direct link or static fallback ready.
12. **Discussion transition.** Invite the room’s judgments rather than offering a fixed threshold.
13. **Four discussion questions**, revealed one at a time:
    1. Which measurable characteristics of satellite behavior are most useful for distinguishing routine proximity operations from activities that may warrant concern, clarification, or consultation?
    2. Where might states’ interpretations of close approaches, shadowing, and other proximity operations converge or diverge, and what additional operational context is necessary to understand those differences?
    3. What information could states reasonably share to substantiate their concerns or enable independent assessments, without disclosing sensitive space domain awareness capabilities?
    4. How might shared physical descriptions and evidentiary practices contribute to voluntary transparency and confidence-building measures, legally binding instruments, or both?
14. **Closing — How Close Is Too Close?** Repeat the tagline and return to the central question.

## Material cut from the current carousel

These were earlier slides or demonstrations. They can inform one-sentence spoken asides or backup notes, but should not be reinserted into the main sequence without a timing decision.

- **Time-series and threshold slides:** animated separation and relative-speed charts and adjustable concern thresholds. A chosen threshold is an analytic lens, not an accepted international rule.
- **Shadowing and conjunction examples:** additional simulated behaviors that helped compare ordinary neighboring motion with sustained following or a fleeting close approach. They were cut to keep the main argument focused.
- **Covariance examples:** longer visual explanation of orbit-estimate uncertainty, including what a measured uncertainty region would require.
- **Future examples and research:** comparisons across further cases and work toward shared physical descriptions and evidence practices.
- **Dedicated limitations slide:** public reconstructions depend on TLE availability, epoch age, propagation assumptions, and incomplete observation of some objects. Numerical minima are illustrative estimates, not measured closest approaches. Keep this caveat as a brief spoken note at the library slide.

## Technical guardrails for the notes

- The carousel’s synthetic orbital scenes are demonstrations. Historical episode visualizations use public orbital data and the project’s reconstruction method; do not call either direct observations of every moment.
- Relative velocity means the difference of two velocity vectors in the same frame. For circular satellites at different phases of the same orbit, their separation may remain constant while the inertial velocity vectors differ; clarify the frame when explaining apparent motion.
- A TLE’s age matters. A propagated state should not be described as an exact location.
- Distance, speed, dwell time, and other geometry can support a shared description of behavior; intent and risk also depend on operational context.
- The current deck intentionally ends with questions. Let the audience reason about what states could share without exposing sensitive space-domain awareness capabilities.

Sources for checking exact slide copy and behavior in this repo: `presentation/config.json`, `presentation/app.js`, and `presentation/SPEAKER_NOTES.md`. The current app filters older slide IDs (`time-series`, `thresholds`, `shadowing`, `covariance-examples`, `conjunction`, `future-examples`, `limitations`, `future`) and inserts the project-page and discussion-question slides.
