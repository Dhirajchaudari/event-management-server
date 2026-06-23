import { GoogleGenerativeAI } from "@google/generative-ai";

const GEMINI_MODEL = "gemini-flash-latest";
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 1500;
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
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric"
  }).format(new Date(isoDate));
}

function buildPrompt(context: EventAiContext): string {
  return `You are writing marketing copy for a continuing medical education (CME) conference aimed at doctors and healthcare professionals.

Event details:
- Event name: ${context.name}
- Date: ${formatEventDate(context.date)}
- Speaker: ${context.speakerName}
- Speaker designation: ${context.speakerDesignation}

Generate:
1. eventDescription — 2-3 paragraphs about the medical event. Use a professional, authoritative tone suitable for doctors and CME audiences. Highlight clinical relevance, learning objectives, and why attendees should participate.
2. speakerIntro — approximately 100 words introducing the speaker. Emphasize credentials, expertise, and relevance to the event topic.

Respond with valid JSON only, no markdown fences, using exactly this shape:
{"eventDescription":"...","speakerIntro":"..."}`;
}

export function parseGeneratedEventContent(raw: string): GeneratedEventContent {
  const trimmed = raw.trim();
  const jsonText = trimmed.startsWith("```")
    ? trimmed.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")
    : trimmed;

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
  const status = extractStatusCode(error);

  if (status === 503) {
    return new EventAiGenerationError(
      "Gemini is temporarily busy. Please try again shortly or enter the content manually."
    );
  }

  if (status === 429) {
    return new EventAiGenerationError(
      "Gemini rate limit reached. Please wait a moment and try again, or enter content manually."
    );
  }

  return new EventAiGenerationError(
    "Unable to generate content right now. Please try again or enter the content manually."
  );
}

async function generateWithModel(
  apiKey: string,
  modelName: string,
  context: EventAiContext
): Promise<GeneratedEventContent> {
  const client = new GoogleGenerativeAI(apiKey);
  const model = client.getGenerativeModel({ model: modelName });
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

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    try {
      return await generateWithModel(apiKey, GEMINI_MODEL, context);
    } catch (error) {
      if (error instanceof EventAiGenerationError) {
        throw error;
      }

      lastError = error;

      if (!isRetryableGeminiError(error) || attempt === MAX_ATTEMPTS - 1) {
        break;
      }

      await sleep(RETRY_DELAY_MS * (attempt + 1));
    }
  }

  throw toUserFacingGeminiError(lastError);
}
