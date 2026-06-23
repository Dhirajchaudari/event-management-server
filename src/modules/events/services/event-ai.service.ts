import Anthropic from "@anthropic-ai/sdk";

const CLAUDE_MODEL = "claude-sonnet-4-6";

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
    throw new EventAiGenerationError("Claude returned an invalid content format");
  }

  if (
    typeof parsed !== "object" ||
    parsed === null ||
    typeof (parsed as GeneratedEventContent).eventDescription !== "string" ||
    typeof (parsed as GeneratedEventContent).speakerIntro !== "string"
  ) {
    throw new EventAiGenerationError("Claude response is missing required content fields");
  }

  const eventDescription = (parsed as GeneratedEventContent).eventDescription.trim();
  const speakerIntro = (parsed as GeneratedEventContent).speakerIntro.trim();

  if (!eventDescription || !speakerIntro) {
    throw new EventAiGenerationError("Claude returned empty content");
  }

  return { eventDescription, speakerIntro };
}

export async function generateEventContentWithClaude(
  apiKey: string,
  context: EventAiContext
): Promise<GeneratedEventContent> {
  if (!apiKey) {
    throw new EventAiGenerationError("AI content generation is not configured");
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 1200,
      messages: [
        {
          role: "user",
          content: buildPrompt(context)
        }
      ]
    });

    const textBlock = message.content.find((block) => block.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      throw new EventAiGenerationError("Claude returned no text content");
    }

    return parseGeneratedEventContent(textBlock.text);
  } catch (error) {
    if (error instanceof EventAiGenerationError) {
      throw error;
    }

    const message = error instanceof Error ? error.message : "Unknown AI generation error";
    throw new EventAiGenerationError(`Failed to generate event content: ${message}`);
  }
}
