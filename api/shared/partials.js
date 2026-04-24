function safeJsonParse(value) {
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function extractStringField(text, key) {
  const match = text.match(new RegExp(`"${key}"\\s*:\\s*"([^"]*)`));
  return match ? match[1] : "";
}

function extractCompletedObjects(source) {
  const results = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaping = false;

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "{") {
      if (depth === 0) start = index;
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0 && start !== -1) {
        results.push(source.slice(start, index + 1));
        start = -1;
      }
    }
  }

  return results;
}

function extractBalancedArray(text, key) {
  const keyIndex = text.indexOf(`"${key}"`);
  if (keyIndex === -1) return null;

  const arrayStart = text.indexOf("[", keyIndex);
  if (arrayStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = arrayStart; index < text.length; index += 1) {
    const char = text[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === "\"") {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === "[") depth += 1;
    if (char === "]") {
      depth -= 1;
      if (depth === 0) {
        return text.slice(arrayStart + 1, index);
      }
    }
  }

  return null;
}

function extractArrayObjects(text, key) {
  const arrayBody = extractBalancedArray(text, key);
  if (arrayBody === null) return undefined;

  return extractCompletedObjects(arrayBody)
    .map((item) => safeJsonParse(item))
    .filter(Boolean);
}

export function extractPartialFormulation(text) {
  const partial = {};
  const formulationName = extractStringField(text, "formulation_name");
  const ingredients = extractArrayObjects(text, "ingredients");
  const tradeOffs = extractArrayObjects(text, "trade_offs");
  const regulatoryFlags = extractArrayObjects(text, "regulatory_flags");
  const disclaimer = extractStringField(text, "disclaimer");

  if (formulationName) partial.formulation_name = formulationName;
  if (ingredients !== undefined) partial.ingredients = ingredients;
  if (tradeOffs !== undefined) partial.trade_offs = tradeOffs;
  if (regulatoryFlags !== undefined) partial.regulatory_flags = regulatoryFlags;
  if (disclaimer) partial.disclaimer = disclaimer;

  return partial;
}
