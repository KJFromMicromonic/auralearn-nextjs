import { describe, expect, it } from "vitest";
import { getUserInitials } from "../get-user-initials";

describe("getUserInitials", () => {
  it("returns two initials when both first and last names are present", () => {
    expect(getUserInitials("Jane Doe", "jane@example.com")).toBe("JD");
  });

  it("returns the first letter when only one name part exists", () => {
    expect(getUserInitials("Plato", "plato@example.com")).toBe("P");
  });

  it("falls back to email when no name is provided", () => {
    expect(getUserInitials(undefined, "fallback@example.com")).toBe("F");
  });

  it("returns default placeholder when neither name nor email exist", () => {
    expect(getUserInitials()).toBe("U");
  });
});


