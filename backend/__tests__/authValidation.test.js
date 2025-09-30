const validator = require("validator");

function cleanInput(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeEmailSafe(rawEmail) {
  if (!validator.isEmail(rawEmail)) return false;
  const normalized = validator.normalizeEmail(rawEmail);
  return normalized || false;
}

describe("Auth input validation", () => {
  test("should trim whitespace around name/email/password", () => {
    const name = cleanInput("   Abdullah   ");
    const email = cleanInput("   test@GMAIL.com   ");
    const password = cleanInput("   myPassword123   ");

    expect(name).toBe("Abdullah");
    expect(email).toBe("test@GMAIL.com"); // trimming only
    expect(password).toBe("myPassword123");
  });

  test("should normalize email to lowercase domain", () => {
    const rawEmail = "   TestEmail@GMAIL.com   ";
    const normalized = normalizeEmailSafe(cleanInput(rawEmail));

    expect(normalized).toBe("testemail@gmail.com"); // Gmail normalized
  });

  test("should reject invalid emails before normalization", () => {
    const badEmail = "invalid@@mail.com";
    const normalized = normalizeEmailSafe(cleanInput(badEmail));

    expect(normalized).toBe(false); // fails validation
  });

  test("should accept valid non-gmail emails", () => {
    const rawEmail = "User@Example.COM";
    const normalized = normalizeEmailSafe(cleanInput(rawEmail));

    expect(normalized).toBe("user@example.com"); // validator lowercases local part + domain
  });

  test("should reject empty fields after trim", () => {
    expect(cleanInput("    ")).toBe(""); // trimmed empty string
    expect(cleanInput(null)).toBe("");
    expect(cleanInput(undefined)).toBe("");
  });
});
