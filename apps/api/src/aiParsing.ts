export class AiParseError extends Error {
  code = "AI_PARSE_ERROR";
  raw: string;

  constructor(message: string, raw: string) {
    super(message);
    this.raw = raw;
  }
}

function stripCodeFences(text: string) {
  return text.replace(/```(?:json)?/gi, "").replace(/```/g, "");
}

function findBalancedJson(text: string, start: number) {
  const stack: string[] = [];
  let inString = false;
  let escape = false;

  for (let i = start; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escape) {
        escape = false;
        continue;
      }
      if (char === "\\") {
        escape = true;
        continue;
      }
      if (char === "\"") {
        inString = false;
      }
      continue;
    }

    if (char === "\"") {
      inString = true;
      continue;
    }

    if (char === "{" || char === "[") {
      stack.push(char);
      continue;
    }

    if (char === "}" || char === "]") {
      if (stack.length === 0) return null;
      const last = stack[stack.length - 1];
      if ((char === "}" && last !== "{") || (char === "]" && last !== "[")) {
        return null;
      }
      stack.pop();
      if (stack.length === 0) {
        return text.slice(start, i + 1);
      }
    }
  }

  return null;
}

export function parseJsonFromText(text: string) {
  const cleaned = stripCodeFences(text).trim();
  if (!cleaned) {
    throw new AiParseError("Empty response", text);
  }

  for (let i = 0; i < cleaned.length; i += 1) {
    const char = cleaned[i];
    if (char !== "{" && char !== "[") continue;
    const candidate = findBalancedJson(cleaned, i);
    if (!candidate) continue;
    try {
      return JSON.parse(candidate) as unknown;
    } catch {
      continue;
    }
  }

  throw new AiParseError("No valid JSON found", text);
}
