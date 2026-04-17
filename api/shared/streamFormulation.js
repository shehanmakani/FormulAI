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
  ),
  trade_offs: z.array(
    z.object({
      dimension: z.string(),
      score: z.number(),
      note: z.string(),
    }),
  ),
  regulatory_flags: z.array(
    z.object({
      substance: z.string(),
      jurisdiction: z.string(),
      flag: z.string(),
    }),
  ),
  disclaimer: z.string(),
});

function extractJsonObject(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("No complete JSON object found in model output.");
  }

  return text.slice(start, end + 1);
}

function sendEvent(response, event, payload) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(payload)}\n\n`);
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
    const stream = await client.chat.completions.create({
      model: process.env.GROQ_MODEL || "openai/gpt-oss-20b",
      stream: true,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        {
          role: "user",
          content: [
            `Target product: ${description}`,
            `Sustainability priority: ${sustainabilityPriority}/100`,
            `Cost sensitivity: ${costSensitivity}`,
            `Regulatory region: ${region}`,
            "Return only valid JSON matching the requested schema. Keep ingredient windows realistic and ensure total ranges imply a plausible finished formula.",
          ].join("\n"),
        },
      ],
    });

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
            JSON.parse(extractJsonObject(rawOutput)),
          );
          sendEvent(response, "complete", { data: parsed });
        } catch (parseError) {
          sendEvent(response, "error", {
            error:
              parseError instanceof Error
                ? parseError.message
                : "Failed to parse formulation response.",
          });
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
