import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODELS = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"];
const MAX_ATTEMPTS = 2;
const RETRY_DELAY_MS = 800;
const RETRYABLE_STATUS_CODES = new Set([429, 503]);

export interface GeneratedEventContent {
  eventDescription: string;
  speakerIntro: string;
}

export class EventAiGenerationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EventAiGenerationError";
  }
}

interface EventAiContext {
  name: string;
  date: string;
  speakerName: string;
  speakerDesignation: string;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function formatEventDate(isoDate: string): string {
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(new Date(isoDate));
}

function buildPrompt(context: EventAiContext): string {
  return `Write concise CME conference copy for doctors.

Event: ${context.name}
Date: ${formatEventDate(context.date)}
Speaker: ${context.speakerName}, ${context.speakerDesignation}

Return JSON only with exactly these keys:
{"eventDescription":"two short paragraphs","speakerIntro":"about 50 words on speaker credentials"}`;
}

export function extractJsonPayload(raw: string): string {
  const trimmed = raw.trim();

  if (trimmed.startsWith("```")) {
    return trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
  }

  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return trimmed.slice(start, end + 1);
  }

  return trimmed;
}

export function parseGeneratedEventContent(raw: string): GeneratedEventContent {
  const jsonText = extractJsonPayload(raw);

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    throw new EventAiGenerationError("Gemini returned an invalid content format");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as GeneratedEventContent).eventDescription !== "string" ||
    typeof (parsed as GeneratedEventContent).speakerIntro !== "string"
  ) {
    throw new EventAiGenerationError("Gemini response is missing required content fields");
  }

  const eventDescription = (parsed as GeneratedEventContent).eventDescription.trim();
  const speakerIntro = (parsed as GeneratedEventContent).speakerIntro.trim();

  if (!eventDescription || !speakerIntro) {
    throw new EventAiGenerationError("Gemini returned empty content");
  }

  return { eventDescription, speakerIntro };
}

function extractStatusCode(error: unknown): number | null {
  if (!(error instanceof Error)) {
    return null;
  }

  const match = error.message.match(/\[\s*(\d{3})\s+/);
  return match ? Number(match[1]) : null;
}

function isRetryableGeminiError(error: unknown): boolean {
  const status = extractStatusCode(error);
  return status !== null && RETRYABLE_STATUS_CODES.has(status);
}


function toUserFacingGeminiError(error: unknown): EventAiGenerationError {
  if (error instanceof EventAiGenerationError) {
    return error;
  }

  const status = extractStatusCode(error);

  if (status === 503) {
    return new EventAiGenerationError(
      "AI is busy right now — type content manually or try again in a moment."
    );
  }

  if (status === 429) {
    return new EventAiGenerationError(
      "AI rate limit reached — type content manually or try again shortly."
    );
  }

  return new EventAiGenerationError(
    "Could not generate content — type it manually or try again."
  );
}

async function generateWithModel(
  apiKey: string,
  modelName: string,
  context: EventAiContext
): Promise<GeneratedEventContent> {
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({
    model: modelName,
    generationConfig: {
      maxOutputTokens: 1024,
      temperature: 0.4,
      responseMimeType: "application/json"
    }
  });
  const result = await model.generateContent(buildPrompt(context));
  const text = result.response.text()?.trim();

  if (!text) {
    throw new EventAiGenerationError("Gemini returned no text content");
  }

  return parseGeneratedEventContent(text);
}

export async function generateEventContentWithGemini(
  apiKey: string,
  context: EventAiContext
): Promise<GeneratedEventContent> {
  if (!apiKey) {
    throw new EventAiGenerationError(
      "AI content generation is not configured. Set GEMINI_API_KEY in the server environment."
    );
  }

  let lastError: unknown;

  for (const modelName of GEMINI_MODELS) {
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
      try {
        return await generateWithModel(apiKey, modelName, context);
      } catch (error) {
        if (
          error instanceof EventAiGenerationError &&
          error.message.includes("not configured")
        ) {
          throw error;
        }

        lastError = error;

        const retryable =
          isRetryableGeminiError(error) ||
          (error instanceof EventAiGenerationError && attempt < MAX_ATTEMPTS - 1);

        if (!retryable) {
          break;
        }

        await sleep(RETRY_DELAY_MS);
      }
    }
  }

  throw toUserFacingGeminiError(lastError);
}
