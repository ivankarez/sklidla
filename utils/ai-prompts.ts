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

export const buildMealScanPrompt = (): string => {
  return `You are a precise nutrition AI for a food logging app.
Analyze the provided meal photo and return a structured list of detected foods for fast logging.

Rules:
- Return 1 item for a simple single-food meal (for example: a bowl of spaghetti -> one "spaghetti" item).
- Return multiple items for mixed meals when visually separable (for example: apples, bread, almonds).
- Group duplicate foods into one item with a larger estimated_amount when that is the clearest representation (for example: 2 apples -> one apple item with estimated_amount 2).
- Ignore plates, utensils, napkins, tables, packaging, and obvious background clutter.
- Normalize all macros to per 100g.
- estimated_amount should match estimated_amount_unit.
- Use "grams" as estimated_amount_unit when there is no practical discrete serving unit.
- estimated_weight_g should represent the total weight of that detected item as shown in the image.
- serving_sizes should contain 0-3 practical units when inferable (for example: apple, slice, handful, cup, portion).
- If the meal is too unclear to parse confidently, return an empty items array.
- Never return joke names, placeholders, or duplicate near-identical items for the same visible food.`;
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
- For serving sizes, provide 1-3 practical units when inferable (for example: slice, cup, piece); otherwise return an empty array.`;
};
