import { describe, expect, it } from "vitest";

import {
  EventAiGenerationError,
  parseGeneratedEventContent
} from "../src/modules/events/services/event-ai.service.js";

describe("parseGeneratedEventContent", () => {
  it("parses valid JSON content", () => {
    const result = parseGeneratedEventContent(
      JSON.stringify({
        eventDescription: "A detailed CME session on fetal medicine.",
        speakerIntro: "Dr. Smith is a leading consultant."
      })
    );

    expect(result.eventDescription).toContain("fetal medicine");
    expect(result.speakerIntro).toContain("Dr. Smith");
  });

  it("parses JSON wrapped in markdown fences", () => {
    const result = parseGeneratedEventContent(
      '```json\n{"eventDescription":"Event copy","speakerIntro":"Speaker copy"}\n```'
    );

    expect(result.eventDescription).toBe("Event copy");
    expect(result.speakerIntro).toBe("Speaker copy");
  });

  it("parses JSON embedded in prose", () => {
    const result = parseGeneratedEventContent(
      'Here is the copy:\n{"eventDescription":"Event copy","speakerIntro":"Speaker copy"}\nThanks.'
    );

    expect(result.eventDescription).toBe("Event copy");
    expect(result.speakerIntro).toBe("Speaker copy");
  });

  it("rejects invalid payloads", () => {
    expect(() => parseGeneratedEventContent("not-json")).toThrow(EventAiGenerationError);
    expect(() => parseGeneratedEventContent('{"eventDescription":""}')).toThrow(
      EventAiGenerationError
    );
  });
});
