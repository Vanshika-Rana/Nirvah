import { describe, expect, it } from "vitest";
import { withAction } from "@/lib/action-result";

describe("failed saves never pretend to succeed", () => {
  it("returns ok: false and a safe error when saving throws", async () => {
    const result = await withAction(async () => {
      throw new Error("insert failed");
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("insert failed");
    }
  });

  it("strips credential-like error text", async () => {
    const result = await withAction(async () => {
      throw new Error("Invalid API key: supabase anon key leaked");
    }, "Could not save the transaction.");
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBe("Could not save the transaction.");
      expect(result.error.toLowerCase()).not.toContain("api key");
    }
  });
});
