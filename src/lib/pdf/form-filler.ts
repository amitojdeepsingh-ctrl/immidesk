// ============================================================================
// IMM Form PDF Filler — Fills IRCC PDF forms using pdf-lib
// ============================================================================
// Takes a PDF template (base64 or buffer) and field mappings, returns filled PDF
// ============================================================================

import { PDFDocument, PDFForm, PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup } from "pdf-lib";

export interface FormFieldMapping {
  key: string;
  value: string | number | boolean | null | undefined;
}

export interface FillResult {
  pdfBytes: Uint8Array;
  filledFields: string[];
  unfilledFields: string[];
  warnings: string[];
}

/**
 * Fill a PDF form with field values using pdf-lib.
 * 
 * @param pdfTemplate - Base64 encoded PDF template or Uint8Array
 * @param fieldMappings - Array of field key/value pairs
 * @returns FillResult with filled PDF bytes and metadata
 */
export async function fillPdfForm(
  pdfTemplate: string | Uint8Array,
  fieldMappings: FormFieldMapping[]
): Promise<FillResult> {
  const pdfBytes = typeof pdfTemplate === "string"
    ? Uint8Array.from(atob(pdfTemplate), c => c.charCodeAt(0))
    : pdfTemplate;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  const filledFields: string[] = [];
  const unfilledFields: string[] = [];
  const warnings: string[] = [];

  // Create a map for quick lookup
  const fieldMap = new Map(fieldMappings.map(f => [f.key, f.value]));

  for (const field of fields) {
    const fieldName = field.getName();
    const mapping = fieldMap.get(fieldName);

    if (mapping === undefined || mapping === null) {
      unfilledFields.push(fieldName);
      continue;
    }

    try {
      if (field instanceof PDFTextField) {
        const value = String(mapping);
        field.setText(value);
        filledFields.push(fieldName);
      } else if (field instanceof PDFCheckBox) {
        const value = Boolean(mapping);
        if (value) field.check(); else field.uncheck();
        filledFields.push(fieldName);
      } else if (field instanceof PDFDropdown) {
        const value = String(mapping);
        try {
          field.select(value);
          filledFields.push(fieldName);
        } catch {
          warnings.push(`Dropdown "${fieldName}": option "${value}" not found`);
          unfilledFields.push(fieldName);
        }
      } else if (field instanceof PDFRadioGroup) {
        const value = String(mapping);
        try {
          field.select(value);
          filledFields.push(fieldName);
        } catch {
          warnings.push(`Radio group "${fieldName}": option "${value}" not found`);
          unfilledFields.push(fieldName);
        }
      } else {
        warnings.push(`Field "${fieldName}": unsupported field type`);
        unfilledFields.push(fieldName);
      }
    } catch (err) {
      warnings.push(`Field "${fieldName}": ${err instanceof Error ? err.message : "fill failed"}`);
      unfilledFields.push(fieldName);
    }
  }

  // Flatten form to make it non-editable (optional - keep editable for review)
  // form.flatten();

  const outputBytes = await pdfDoc.save();

  return {
    pdfBytes: outputBytes,
    filledFields,
    unfilledFields,
    warnings,
  };
}

/**
 * Get all form field names from a PDF template
 */
export async function getPdfFormFields(
  pdfTemplate: string | Uint8Array
): Promise<Array<{ name: string; type: string; options?: string[] }>> {
  const pdfBytes = typeof pdfTemplate === "string"
    ? Uint8Array.from(atob(pdfTemplate), c => c.charCodeAt(0))
    : pdfTemplate;

  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  return fields.map(field => {
    const base = { name: field.getName(), type: field.constructor.name };
    if (field instanceof PDFDropdown) {
      return { ...base, options: field.getOptions() };
    }
    if (field instanceof PDFRadioGroup) {
      return { ...base, options: field.getOptions() };
    }
    return base;
  });
}

/**
 * Generate a field schema from a PDF template for AI mapping
 */
export async function generateFieldSchemaFromPdf(
  pdfTemplate: string | Uint8Array
): Promise<Array<{ key: string; label: string; type: "text" | "select" | "date" | "boolean"; options?: string[]; required: boolean }>> {
  const fields = await getPdfFormFields(pdfTemplate);
  
  return fields.map(f => {
    let type: "text" | "select" | "date" | "boolean" = "text";
    if (f.type.includes("CheckBox")) type = "boolean";
    else if (f.type.includes("Dropdown")) type = "select";
    else if (f.type.includes("RadioGroup")) type = "select";
    
    // Heuristic: detect date fields by name
    if (f.name.toLowerCase().includes("date") || f.name.toLowerCase().includes("dob")) {
      type = "date";
    }

    return {
      key: f.name,
      label: f.name.replace(/([A-Z])/g, " $1").replace(/^./, c => c.toUpperCase()),
      type,
      options: f.options,
      required: false, // PDF doesn't store required flag reliably
    };
  });
}