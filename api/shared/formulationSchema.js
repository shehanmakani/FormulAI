export const formulationJsonSchema = {
  name: "formulation_response",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    required: [
      "formulation_name",
      "ingredients",
      "trade_offs",
      "regulatory_flags",
      "disclaimer",
    ],
    properties: {
      formulation_name: {
        type: "string",
      },
      ingredients: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: [
            "name",
            "cas_number",
            "function",
            "weight_percent_min",
            "weight_percent_max",
            "notes",
          ],
          properties: {
            name: { type: "string" },
            cas_number: { type: "string" },
            function: { type: "string" },
            weight_percent_min: { type: "number" },
            weight_percent_max: { type: "number" },
            notes: { type: "string" },
          },
        },
      },
      trade_offs: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["dimension", "score", "note"],
          properties: {
            dimension: { type: "string" },
            score: { type: "number" },
            note: { type: "string" },
          },
        },
      },
      regulatory_flags: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: false,
          required: ["substance", "jurisdiction", "flag"],
          properties: {
            substance: { type: "string" },
            jurisdiction: { type: "string" },
            flag: { type: "string" },
          },
        },
      },
      disclaimer: {
        type: "string",
      },
    },
  },
};

export const systemPrompt = [
  "You are FormulAI, an expert formulation chemist AI for specialty chemical R&D teams.",
  "Return exactly one JSON object and nothing else.",
  "Do not use markdown, code fences, commentary, or explanatory text before or after the JSON.",
  "The JSON must contain exactly these top-level keys: formulation_name, ingredients, trade_offs, regulatory_flags, disclaimer.",
  "Each ingredient must include: name, cas_number, function, weight_percent_min, weight_percent_max, notes.",
  "Each trade_off must include: dimension, score, note.",
  "Each regulatory_flag must include: substance, jurisdiction, flag.",
  "Use numeric values for all weight_percent_min, weight_percent_max, and score fields.",
  "If a CAS number is unknown, use an empty string.",
  "Always return at least 3 trade_offs.",
  "Always return at least 1 regulatory_flag. If no severe restriction is obvious, include a screening note such as registration, SDS, CLP, EPA, or REACH verification guidance.",
  "Always prioritize explicit constraints in the user brief. Do not contradict them.",
  "Examples of contradictions to avoid: using silicone in a silicone-free product, using high-VOC solvents in a low-VOC brief, or using mostly petrochemical ingredients in a bio-based brief unless clearly disclosed as an unavoidable compromise.",
  "Keep the formulation plausible for a first-pass industrial concept.",
].join(" ");
