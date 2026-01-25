import { AiParseError, parseJsonFromText, parseLargestJsonFromText } from "../aiParsing.js";

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual: unknown, expected: unknown, message: string) {
  const actualStr = JSON.stringify(actual);
  const expectedStr = JSON.stringify(expected);
  if (actualStr !== expectedStr) {
    throw new Error(`${message}. Expected ${expectedStr}, got ${actualStr}`);
  }
}

const pure = '{"name":"Plan","days":[{"label":"Dia 1","duration":45}]}';
const pureResult = parseJsonFromText(pure);
assertEqual(pureResult, { name: "Plan", days: [{ label: "Dia 1", duration: 45 }] }, "Pure JSON should parse");

const fenced = "```json\n{\"ok\":true,\"items\":[1,2,3]}\n```";
const fencedResult = parseJsonFromText(fenced);
assertEqual(fencedResult, { ok: true, items: [1, 2, 3] }, "Fenced JSON should parse");

const withText = "Aquí tienes el plan:\n{\"value\":42,\"list\":[\"a\",\"b\"]}\nGracias.";
const withTextResult = parseJsonFromText(withText);
assertEqual(withTextResult, { value: 42, list: ["a", "b"] }, "JSON with extra text should parse");

const nested = '{"meal":{"title":"A"},"plan":{"title":"Plan","days":[1,2,3],"dailyCalories":2000}}';
const largestResult = parseLargestJsonFromText(nested);
assertEqual(
  largestResult,
  { meal: { title: "A" }, plan: { title: "Plan", days: [1, 2, 3], dailyCalories: 2000 } },
  "Largest JSON should parse full object"
);

const mixed = 'texto {"meal":{"title":"A"}} otro {"title":"Plan","days":[1,2,3],"dailyCalories":2000}';
const mixedResult = parseLargestJsonFromText(mixed);
assertEqual(
  mixedResult,
  { title: "Plan", days: [1, 2, 3], dailyCalories: 2000 },
  "Largest JSON block should parse"
);

let invalidThrown = false;
try {
  parseJsonFromText("no hay json válido");
} catch (error) {
  invalidThrown = error instanceof AiParseError;
}
assert(invalidThrown, "Invalid JSON should throw AiParseError");

console.log("aiParsing tests passed");
