import Groq from "groq-sdk";
import { z } from "zod";
import { extractPartialFormulation } from "./partials.js";
import { systemPrompt } from "./formulationSchema.js";

const requestSchema = z.object({
  description: z.string().min(10),
  sustainabilityPriority: z.number().min(0).max(100),
  costSensitivity: z.enum(["low", "medium", "high"]),
  region: z.enum(["US", "EU", "Global"]),
});

const responseSchema = z.object({
  formulation_name: z.string(),
  ingredients: z.array(
    z.object({
      name: z.string(),
      cas_number: z.string(),
      function: z.string(),
      weight_percent_min: z.number(),
      weight_percent_max: z.number(),
      notes: z.string(),
    }),
  ).min(3),
  trade_offs: z.array(
    z.object({
      dimension: z.string(),
      score: z.number(),
      note: z.string(),
    }),
  ).min(3),
  regulatory_flags: z.array(
    z.object({
      substance: z.string(),
      jurisdiction: z.string(),
      flag: z.string(),
    }),
  ).min(1),
  disclaimer: z.string(),
});

function extractJsonObject(text) {
  const cleaned = text.replace(/```json/gi, "").replace(/```/g, "").trim();
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No complete JSON object found in model output.");
  }

  return cleaned.slice(start, end + 1);
}

function sendEvent(response, event, payload) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeFormulationPayload(payload) {
  return {
    formulation_name: String(payload?.formulation_name ?? "").trim(),
    ingredients: Array.isArray(payload?.ingredients)
      ? payload.ingredients.map((ingredient) => ({
          name: String(ingredient?.name ?? "").trim(),
          cas_number: String(ingredient?.cas_number ?? "").trim(),
          function: String(ingredient?.function ?? "").trim(),
          weight_percent_min: toNumber(ingredient?.weight_percent_min),
          weight_percent_max: toNumber(ingredient?.weight_percent_max),
          notes: String(ingredient?.notes ?? "").trim(),
        }))
      : [],
    trade_offs: Array.isArray(payload?.trade_offs)
      ? payload.trade_offs.map((tradeOff) => ({
          dimension: String(tradeOff?.dimension ?? "").trim(),
          score: toNumber(tradeOff?.score),
          note: String(tradeOff?.note ?? "").trim(),
        }))
      : [],
    regulatory_flags: Array.isArray(payload?.regulatory_flags)
      ? payload.regulatory_flags.map((flag) => ({
          substance: String(flag?.substance ?? "").trim(),
          jurisdiction: String(flag?.jurisdiction ?? "").trim(),
          flag: String(flag?.flag ?? "").trim(),
        }))
      : [],
    disclaimer: String(payload?.disclaimer ?? "").trim(),
  };
}

function buildUserPrompt({
  description,
  sustainabilityPriority,
  costSensitivity,
  region,
}) {
  return [
    `Target product: ${description}`,
    `Sustainability priority: ${sustainabilityPriority}/100`,
    `Cost sensitivity: ${costSensitivity}`,
    `Regulatory region: ${region}`,
    "Return exactly one JSON object with the required schema.",
    "Do not wrap the JSON in markdown.",
    "Do not include comments or prose outside the JSON.",
    "Use realistic ingredient ranges for a plausible first-pass concept.",
    "Include at least 3 trade_offs.",
    "Include at least 1 regulatory_flag.",
    "Honor explicit brief constraints like silicone-free, low-VOC, bio-based, solvent-free, or region-specific compliance.",
  ].join("\n");
}

function validateAgainstBrief(description, payload) {
  const brief = description.toLowerCase();
  const ingredientText = payload.ingredients
    .map((ingredient) => `${ingredient.name} ${ingredient.function} ${ingredient.notes}`.toLowerCase())
    .join(" ");

  if (brief.includes("silicone-free") && ingredientText.includes("silicone")) {
    throw new Error("Generated formulation contradicts a silicone-free brief.");
  }

  if ((brief.includes("biobased") || brief.includes("bio-based")) &&
    /(polydimethylsiloxane|silicone|mineral oil|paraffin|polyethylene wax|microcrystalline wax)/i.test(
      ingredientText,
    )) {
    throw new Error("Generated formulation contradicts a bio-based brief.");
  }

  if (brief.includes("low-voc") && /(nmp|toluene|xylene|mineral spirits|high voc)/i.test(ingredientText)) {
    throw new Error("Generated formulation contradicts a low-VOC brief.");
  }
}

async function generateDraft(client, userPrompt, stream = true) {
  return client.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    temperature: 0.1,
    stream,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });
}

async function repairMalformedJson(client, rawOutput) {
  const repair = await client.chat.completions.create({
    model: process.env.GROQ_MODEL || "llama-3.3-70b-versatile",
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You repair malformed formulation JSON. Return only valid JSON with the required schema and no extra text.",
      },
      {
        role: "user",
        content: [
          "Rewrite the following content into valid JSON only.",
          "Keep the same chemistry meaning where possible.",
          rawOutput,
        ].join("\n\n"),
      },
    ],
  });

  return repair.choices[0]?.message?.content ?? "";
}

export async function streamFormulation(request, response) {
  const parsedRequest = requestSchema.safeParse(request.body);

  if (!parsedRequest.success) {
    response.status(400).json({
      error: "Please provide a richer product brief and valid parameters.",
    });
    return;
  }

  if (!process.env.GROQ_API_KEY) {
    response.status(500).json({
      error: "GROQ_API_KEY is missing. Add it to your environment.",
    });
    return;
  }

  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

  const { description, sustainabilityPriority, costSensitivity, region } =
    parsedRequest.data;

  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");

  let rawOutput = "";

  try {
    const userPrompt = buildUserPrompt({
      description,
      sustainabilityPriority,
      costSensitivity,
      region,
    });

    const stream = await generateDraft(client, userPrompt, true);

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        rawOutput += delta;
        sendEvent(response, "delta", { text: delta });
        sendEvent(response, "partial", {
          data: extractPartialFormulation(rawOutput),
        });
      }

      if (chunk.choices[0]?.finish_reason === "stop") {
        try {
          const parsed = responseSchema.parse(
            normalizeFormulationPayload(JSON.parse(extractJsonObject(rawOutput))),
          );
          validateAgainstBrief(description, parsed);
          sendEvent(response, "complete", { data: parsed });
        } catch {
          try {
            const repairedOutput = await repairMalformedJson(client, rawOutput);
            const repaired = responseSchema.parse(
              normalizeFormulationPayload(JSON.parse(extractJsonObject(repairedOutput))),
            );
            validateAgainstBrief(description, repaired);
            sendEvent(response, "complete", { data: repaired });
          } catch (parseError) {
            try {
              const retryPrompt = [
                userPrompt,
                "",
                "The prior draft did not satisfy the brief or schema.",
                "Regenerate and be stricter about explicit constraints from the brief.",
              ].join("\n");

              const retry = await generateDraft(client, retryPrompt, false);
              const retryContent = retry.choices[0]?.message?.content ?? "";
              const regenerated = responseSchema.parse(
                normalizeFormulationPayload(JSON.parse(extractJsonObject(retryContent))),
              );
              validateAgainstBrief(description, regenerated);
              sendEvent(response, "complete", { data: regenerated });
            } catch (retryError) {
              sendEvent(response, "error", {
                error:
                  retryError instanceof Error
                    ? retryError.message
                    : parseError instanceof Error
                      ? parseError.message
                      : "Failed to generate a valid formulation response.",
              });
            }
          }
        }
      }
    }
  } catch (error) {
    sendEvent(response, "error", {
      error:
        error instanceof Error
          ? error.message
          : "The formulation request failed unexpectedly.",
    });
  } finally {
    response.end();
  }
}
