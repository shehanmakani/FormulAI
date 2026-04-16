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

  for (let index = 0; index < source.length; index += 1) {
    const char = source[index];
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

function extractArrayObjects(text, key) {
  const keyIndex = text.indexOf(`"${key}"`);
  if (keyIndex === -1) return [];

  const arrayStart = text.indexOf("[", keyIndex);
  if (arrayStart === -1) return [];

  const arrayBody = text.slice(arrayStart + 1);
  return extractCompletedObjects(arrayBody)
    .map((item) => safeJsonParse(item))
    .filter(Boolean);
}

export function extractPartialFormulation(text) {
  return {
    formulation_name: extractStringField(text, "formulation_name"),
    ingredients: extractArrayObjects(text, "ingredients"),
    trade_offs: extractArrayObjects(text, "trade_offs"),
    regulatory_flags: extractArrayObjects(text, "regulatory_flags"),
    disclaimer: extractStringField(text, "disclaimer"),
  };
}
