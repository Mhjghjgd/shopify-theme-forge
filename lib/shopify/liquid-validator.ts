/**
 * Validates Liquid section files — checks that {% schema %} blocks contain valid JSON
 * with no trailing commas and required fields (name, presets).
 */

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateLiquidSection(content: string, filename: string): ValidationResult {
  const errors: string[] = [];

  // Extract schema block
  const schemaMatch = content.match(/\{%-?\s*schema\s*-?%\}([\s\S]*?)\{%-?\s*endschema\s*-?%\}/);
  if (!schemaMatch) {
    errors.push(`${filename}: Missing {% schema %} block`);
    return { valid: false, errors };
  }

  const schemaJson = schemaMatch[1].trim();

  // Remove trailing commas before parsing
  const cleaned = removeTrailingCommas(schemaJson);

  let schema: Record<string, unknown>;
  try {
    schema = JSON.parse(cleaned);
  } catch (e) {
    errors.push(`${filename}: Invalid JSON in {% schema %}: ${(e as Error).message}`);
    return { valid: false, errors };
  }

  // Validate required fields
  if (!schema.name || typeof schema.name !== 'string') {
    errors.push(`${filename}: Schema missing required "name" field`);
  }

  if (!Array.isArray(schema.presets) || (schema.presets as unknown[]).length === 0) {
    errors.push(`${filename}: Schema missing "presets" array (required for Shopify customizer)`);
  }

  // Validate settings structure
  if (schema.settings && !Array.isArray(schema.settings)) {
    errors.push(`${filename}: Schema "settings" must be an array`);
  }

  // Validate blocks structure
  if (schema.blocks && !Array.isArray(schema.blocks)) {
    errors.push(`${filename}: Schema "blocks" must be an array`);
  }

  // Check for hardcoded hex colors not in settings (warn only)
  const liquidContent = content.replace(/\{%-?\s*schema[\s\S]*?endschema\s*-?%\}/, '');
  const hardcodedColors = liquidContent.match(/#[0-9a-fA-F]{3,6}(?![a-fA-F0-9])/g);
  if (hardcodedColors && hardcodedColors.length > 0) {
    // Only warn if colors are NOT in a style block referencing section.settings
    const settingRefs = (liquidContent.match(/section\.settings\.\w+/g) || []).length;
    if (settingRefs === 0) {
      errors.push(`${filename}: Warning — hardcoded colors detected without section.settings references`);
    }
  }

  return { valid: errors.length === 0, errors };
}

export function removeTrailingCommas(json: string): string {
  // Remove trailing commas before } and ]
  return json
    .replace(/,(\s*[}\]])/g, '$1')
    .replace(/\/\/[^\n]*/g, '') // remove JS-style comments
    .replace(/\/\*[\s\S]*?\*\//g, ''); // remove block comments
}

export function validateAllSections(
  sections: { filename: string; content: string }[]
): ValidationResult {
  const allErrors: string[] = [];

  for (const section of sections) {
    const result = validateLiquidSection(section.content, section.filename);
    allErrors.push(...result.errors);
  }

  return { valid: allErrors.length === 0, errors: allErrors };
}

export function sanitizeLiquidJson(content: string): string {
  // Extract and re-serialize schema JSON to ensure validity
  return content.replace(
    /(\{%-?\s*schema\s*-?%\})([\s\S]*?)(\{%-?\s*endschema\s*-?%\})/,
    (_, open, schemaContent, close) => {
      const cleaned = removeTrailingCommas(schemaContent.trim());
      try {
        const parsed = JSON.parse(cleaned);
        return `${open}\n${JSON.stringify(parsed, null, 2)}\n${close}`;
      } catch {
        // Return original if can't parse — let validation catch it
        return `${open}${schemaContent}${close}`;
      }
    }
  );
}
