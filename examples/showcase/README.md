# Showcase Prompt Pack

This folder packages a small set of postable FormulAI examples for GitHub visitors.

- All three examples were captured from the live public deployment on `2026-04-24`.
- The JSON files are raw outputs from the app, not hand-written demo data.
- The goal here is to show what the product can generate today while staying honest about what still needs lab, supplier, and regulatory verification.

## Why These Prompts

These prompts were chosen because they line up with active buying and formulation pressure in real markets:

- Safer industrial cleaning remains highly relevant under EPA Safer Choice and specialized industrial product criteria.
- Bio-based construction materials continue to matter as low-carbon and circular-material pressure increases.
- Silicone-free, naturally positioned conditioning systems remain a credible personal care brief for formulation teams and brand incubators.

Reference links:

- [EPA Safer Choice Standard](https://www.epa.gov/saferchoice/standard)
- [EPA Specialized Industrial Products Criteria](https://www.epa.gov/saferchoice/safer-choice-criteria-specialized-industrial-products)
- [EU Bioeconomy Factsheet](https://environment.ec.europa.eu/strategy/bioeconomy-strategy/bioeconomy-factsheet_uk)
- [WorldGBC Strategic Plan 2025-2027](https://worldgbc.org/strategic-plan-2025-2027/)

## Included Examples

### 1. Low-VOC Industrial Degreaser

Prompt:

`Low-VOC industrial degreaser for heavy equipment with high flash point, strong grease lift, and moderate foam.`

Why it is worth showing:

- The output stays away from the obvious low-flash-point solvent mistakes the app was making before the prompt fix.
- The result includes a coherent aqueous cleaning direction, populated trade-offs, and regulatory notes.

What still needs verification:

- Surfactant choice and loading should be bench-tested for real grease soils, dwell time, and rinse profile.
- The regulatory flags are useful screening notes, not final compliance determinations.

Raw output: [low-voc-industrial-degreaser.json](./low-voc-industrial-degreaser.json)

### 2. Biobased Concrete Release Agent

Prompt:

`Biobased concrete release agent with easy demold, low staining, and good storage stability in cold climates.`

Why it is worth showing:

- The result follows the bio-based brief instead of falling back to silicones or paraffinic release chemistry.
- The trade-off framing is directionally useful for a first-pass construction-chemicals review.

What still needs verification:

- Cold storage stability, emulsion robustness, and staining performance all need lab confirmation on the intended formwork surfaces.
- The composition is directionally plausible, but commercial release-agent development would still need package optimization.

Raw output: [biobased-concrete-release-agent.json](./biobased-concrete-release-agent.json)

### 3. Silicone-Free Textured-Hair Conditioner

Prompt:

`Silicone-free rinse-off hair conditioner for textured hair using a cationic emulsifier system, with rich slip, low buildup, and naturally derived positioning.`

Why it is worth showing:

- This is a better personal-care demo prompt than the original generic conditioner brief because it nudges the model toward a real cationic conditioner architecture.
- The ingredient direction is much more believable for a rinse-off conditioner base than the earlier surfactant-led result.

What still needs verification:

- This example is best used to show category range, not exact INCI or CAS accuracy.
- Conditioner actives, identifiers, preservation, and claims support would all need cosmetic-formulation review before external technical use.

Raw output: [silicone-free-conditioner.json](./silicone-free-conditioner.json)

## Suggested GitHub Positioning

If you want to reference these in the root README or a launch post, a strong honest framing is:

`Captured from the live FormulAI deployment on April 24, 2026. These are real first-pass outputs from the app, screened for plausibility and shared with verification notes rather than polished by hand.`
