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

export const systemPrompt =
  'You are FormulAI, an expert formulation chemist AI. When given a target product description, respond ONLY with valid JSON in this structure: { "formulation_name": string, "ingredients": [{ "name": string, "cas_number": string, "function": string, "weight_percent_min": number, "weight_percent_max": number, "notes": string }], "trade_offs": [{ "dimension": string, "score": number, "note": string }], "regulatory_flags": [{ "substance": string, "jurisdiction": string, "flag": string }], "disclaimer": string }. Draw on real industrial chemistry knowledge. Be specific with ingredient names and CAS numbers where known.';
