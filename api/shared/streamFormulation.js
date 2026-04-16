import OpenAI from "openai";
import { z } from "zod";
import { extractPartialFormulation } from "./partials.js";
import { formulationJsonSchema, systemPrompt } from "./formulationSchema.js";

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

  if (!process.env.OPENAI_API_KEY) {
    response.status(500).json({
      error: "OPENAI_API_KEY is missing. Add it to your environment to generate formulations.",
    });
    return;
  }

  const client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
  });

  const {
    description,
    sustainabilityPriority,
    costSensitivity,
    region,
  } = parsedRequest.data;

  response.setHeader("Content-Type", "text/event-stream");
  response.setHeader("Cache-Control", "no-cache, no-transform");
  response.setHeader("Connection", "keep-alive");

  let rawOutput = "";

  try {
    const stream = await client.responses.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-2024-08-06",
      stream: true,
      instructions: systemPrompt,
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: [
                `Target product: ${description}`,
                `Sustainability priority: ${sustainabilityPriority}/100`,
                `Cost sensitivity: ${costSensitivity}`,
                `Regulatory region: ${region}`,
                "Return only JSON matching the requested schema. Keep ingredient windows realistic and ensure total ranges imply a plausible finished formula.",
              ].join("\n"),
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          ...formulationJsonSchema,
        },
      },
    });

    for await (const event of stream) {
      if (event.type === "response.output_text.delta") {
        rawOutput += event.delta;
        sendEvent(response, "delta", { text: event.delta });
        sendEvent(response, "partial", {
          data: extractPartialFormulation(rawOutput),
        });
      }

      if (event.type === "response.completed") {
        const parsed = responseSchema.parse(JSON.parse(rawOutput));
        sendEvent(response, "complete", { data: parsed });
      }

      if (event.type === "error") {
        sendEvent(response, "error", {
          error: event.message || "The OpenAI stream returned an error.",
        });
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
