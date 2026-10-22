import { BadRequestException } from "@nestjs/common";
import { joinMeetingRequestSchema } from "@parlivo/schemas";
import { describe, expect, it } from "vitest";
import { ZodValidationPipe } from "./zod-validation.pipe.js";

describe("ZodValidationPipe", () => {
  const pipe = new ZodValidationPipe(joinMeetingRequestSchema);

  it("returns the parsed body", () => {
    expect(pipe.transform({ speakingLanguage: "fr", listeningLanguage: "ja" })).toEqual({
      speakingLanguage: "fr",
      listeningLanguage: "ja",
    });
  });

  it("throws 400 with the failing paths", () => {
    try {
      pipe.transform({ speakingLanguage: "fr" });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const body = (error as BadRequestException).getResponse() as { issues: { path: string }[] };
      expect(body.issues.map((issue) => issue.path)).toContain("listeningLanguage");
    }
  });
});
