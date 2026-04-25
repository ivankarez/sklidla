export const buildUnifiedPrompt = (nameHint?: string, brandHint?: string): string => {
  const cleanedName = nameHint?.trim();
  const cleanedBrand = brandHint?.trim();

  const hintLines: string[] = [];
  if (cleanedName) hintLines.push(`- User-provided name hint: "${cleanedName}"`);
  if (cleanedBrand) hintLines.push(`- User-provided brand hint: "${cleanedBrand}"`);

  const hintBlock = hintLines.length > 0
    ? `Context hints from user (high priority unless clearly contradicted by image):\n${hintLines.join('\n')}\n`
    : 'No user hints provided for name or brand. If they are missing from the image, make your best guess.\n';

  return `You are a precise nutrition AI for a tracking app.
Analyze the provided image and decide whether it is:
- a nutrition label,
- a food or meal photo,
- mixed or unclear,
- or unreadable.

${hintBlock}
Fill the structured response fields using these rules:
- Always normalize macros to per 100g.
- For labels, prioritize OCR-accurate extraction.
- If only per-serving values are visible, convert them to per 100g.
- For food photos, estimate realistic nutrition values.
- Use an empty string for brand when it is not visible or not strongly implied.
- Use 0 for estimated_weight_g and serving_size_g when unknown.
- Include 0-3 practical serving sizes when possible.
- If the image is too dark, blank, or blurry to read, set detection_type to "unknown", set name to an empty string, set all macros to 0, and return no serving sizes.
- Never invent joke or placeholder names like "The Void" or "Black image".`;
};

export const buildFoodNameAutofillPrompt = (inputJson: string): string => {
  return `You are a precise nutrition AI for a food logging app.
Given a partial food object, fill only the missing nutrition and serving fields.

Input object:
${inputJson}

Rules:
- Keep all non-null input values unchanged.
- Fill only null fields when a realistic estimate is possible.
- Keep all macros normalized to per 100g.
- Use realistic nutrition ranges.
- If uncertain, keep the field null.
- For serving sizes, provide 1-3 practical units when inferable (for example: slice, cup, piece); otherwise return null.`;
};
