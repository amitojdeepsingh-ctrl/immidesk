// ============================================================================
// Form Filler — Rule-based + AI-powered IRCC form pre-filler
// ============================================================================
// Uses fast keyword matching for direct field mappings, then AI (Ollama) as
// fallback for remaining unmapped fields. Runs within Vercel's 10s Hobby
// timeout by keeping the AI prompt minimal.
// ============================================================================

// --- Types -----------------------------------------------------------------

export interface FormField {
  key: string;
  label: string;
  type: "text" | "select" | "date" | "boolean";
  options?: string[];
  required: boolean;
  description?: string;
}

export type ClientDataValue = string | number | boolean | string | null | undefined;

// --- Rule-based Field Mapper (instant, no LLM needed) -----------------------

const FIELD_MAP: Record<string, string[]> = {
  givenName: ["firstName", "givenName", "first_name", "given_name", "fname"],
  lastName: ["lastName", "surname", "familyName", "family_name", "last_name", "lname"],
  dateOfBirth: ["dateOfBirth", "dob", "birthDate", "birth_date", "date_of_birth"],
  placeOfBirth: ["city", "birthPlace", "birth_place", "place_of_birth", "birthCity"],
  citizenship: ["nationality", "citizenship", "country", "citizenOf"],
  maritalStatus: ["maritalStatus", "marital_status", "marriageStatus"],
  passportNumber: ["passportNumber", "passport_number", "passportNo", "passport"],
  currentAddress: ["addressLine1", "address", "street", "currentAddress", "address_line1"],
  email: ["email", "emailAddress", "email_address"],
  phone: ["phone", "telephone", "phoneNumber", "phone_number", "mobile", "contactNo"],
  signature: ["firstName", "givenName"],
  dateSigned: [],
};

function isNullOrEmpty(v: ClientDataValue): boolean {
  return v === null || v === undefined || v === "";
}

function bestOptionMatch(val: string, options: string[]): string | undefined {
  const lower = val.toLowerCase();

  // Exact match (case-insensitive)
  const exact = options.find((o) => o.toLowerCase() === lower);
  if (exact) return exact;

  // Substring match (either direction)
  const sub = options.find((o) => o.toLowerCase().includes(lower) || lower.includes(o.toLowerCase()));
  if (sub) return sub;

  // Strip nationality suffixes: Canadian → Canada, Indian → India, Chinese → China
  const stripped = lower.replace(/(ian|ese|ish|i|n)$/, "");
  if (stripped.length > 2) {
    const suffix = options.find((o) => o.toLowerCase().includes(stripped));
    if (suffix) return suffix;
  }

  return undefined;
}

function mapFieldByRules(
  fieldKey: string,
  _fieldLabel: string,
  fieldType: string,
  fieldOptions: string[] | undefined,
  clientData: Record<string, ClientDataValue>,
): ClientDataValue {
  const candidates = FIELD_MAP[fieldKey];
  if (!candidates) return undefined;
  for (const key of candidates) {
    const val = clientData[key];
    if (!isNullOrEmpty(val)) {
      const strVal = String(val);
      if (fieldType === "select" && fieldOptions && fieldOptions.length > 0) {
        const matched = bestOptionMatch(strVal, fieldOptions);
        if (matched) return matched;
      }
      return val;
    }
  }
  return undefined;
}

// --- AI Pre-filler (fallback for unmapped fields) ---------------------------

const OLLAMA_BASE_URL = process.env["OLLAMA_BASE_URL"] ?? "http://localhost:11434";
const OLLAMA_MODEL = process.env["OLLAMA_MODEL"] ?? "qwen2.5:7b";
const AI_TIMEOUT_MS = 8_000;

async function aiPrefillRemaining(
  unmappedFields: FormField[],
  clientData: Record<string, ClientDataValue>,
): Promise<Record<string, ClientDataValue>> {
  const fieldsJson = JSON.stringify(unmappedFields.map((f) => ({ key: f.key, label: f.label, type: f.type, options: f.options })));
  const dataJson = JSON.stringify(clientData);

  const prompt = `Map IRCC form fields to client data. Return ONLY a JSON object with field keys as keys and values as values.

Fields: ${fieldsJson}
Client data: ${dataJson}

Rules:
- Match by semantic meaning (e.g. "Given Name" -> firstName)
- For "select" fields, value MUST be from the options array
- For "date" fields, use YYYY-MM-DD
- Empty string if required field has no match, null if optional`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json", "ngrok-skip-browser-warning": "1" },
      body: JSON.stringify({
        model: OLLAMA_MODEL,
        messages: [
          { role: "system", content: "You are a precise form-filler. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        stream: false,
        options: { temperature: 0.1 },
      }),
    });

    if (!response.ok) return {};

    const body = await response.json() as { message?: { content?: string } };
    const raw = body?.message?.content ?? "{}";
    const cleaned = raw.replace(/^```(?:json)?\s*|\s*```$/g, "").trim();

    return JSON.parse(cleaned) as Record<string, ClientDataValue>;
  } catch {
    return {};
  } finally {
    clearTimeout(timeout);
  }
}

// --- Main Pre-filler --------------------------------------------------------

export async function prefillForm(
  formSchema: FormField[],
  clientData: Record<string, ClientDataValue>,
): Promise<Record<string, ClientDataValue>> {
  const result: Record<string, ClientDataValue> = {};

  // Phase 1: Fast rule-based mapping
  const unmappedFields: FormField[] = [];
  for (const field of formSchema) {
    const mapped = mapFieldByRules(field.key, field.label, field.type, field.options, clientData);
    if (mapped !== undefined) {
      result[field.key] = mapped;
    } else {
      unmappedFields.push(field);
    }
  }

  if (unmappedFields.length === 0) return result;

  // Phase 2: AI fallback for remaining unmapped fields (with timeout)
  const aiResults = await aiPrefillRemaining(unmappedFields, clientData);
  for (const [key, val] of Object.entries(aiResults)) {
    if (val !== null && val !== undefined) {
      result[key] = val;
    }
  }

  return result;
}
