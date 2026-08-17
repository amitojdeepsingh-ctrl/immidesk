import { describe, it, expect } from "vitest";
import {
  sanitizeFileName,
  validateStoragePath,
  getExtensionFromMimeType,
} from "../../document-naming";
import { getStoragePath } from "../../storage";

describe("sanitizeFileName path safety", () => {
  it("strips parens, commas, accents, and quotes from filenames", () => {
    expect(sanitizeFileName("Bank Statement (1).pdf")).toBe("bank-statement-1.pdf");
    expect(sanitizeFileName("résumé.pdf")).toBe("r-sum.pdf");
    expect(sanitizeFileName("photo, 2024.png")).toBe("photo-2024.png");
    expect(sanitizeFileName("Passport’s copy.pdf")).toBe("passport-s-copy.pdf");
    expect(sanitizeFileName("scan(2) (final).JPG")).toBe("scan-2-final.jpg");
  });

  it("keeps simple safe filenames unchanged (lowercase)", () => {
    expect(sanitizeFileName("normal-passport.pdf")).toBe("normal-passport.pdf");
    expect(sanitizeFileName("passport-pdf.pdf")).toBe("passport-pdf.pdf");
  });

  it("produces paths that pass validateStoragePath", () => {
    const orgId = "23ca7eec-b18c-4352-a75e-80bac0e78eb6";
    const caseId = "1e1b2eea-4a22-4a28-aba8-c6bf42554558";
    const names = ["Bank Statement (1).pdf", "résumé.pdf", "photo, 2024.png"];
    for (const name of names) {
      const safe = sanitizeFileName(name);
      const ext = getExtensionFromMimeType("application/pdf");
      const fileName = safe.endsWith(ext) ? safe : safe + ext;
      const path = getStoragePath({
        orgId,
        entityType: "cases",
        entityId: caseId,
        category: "IMMIGRATION_FORM",
        fileName,
      });
      expect(validateStoragePath(path).valid, `path should be valid for ${name}`).toBe(
        true,
      );
    }
  });
});