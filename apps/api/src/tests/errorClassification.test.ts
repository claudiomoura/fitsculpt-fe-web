import assert from "node:assert/strict";

import { classifyAiGenerateError } from "../ai/errorClassification.js";

const invalidAiOutput = classifyAiGenerateError({ code: "AI_PARSE_ERROR" });
assert.equal(invalidAiOutput.statusCode, 422);
assert.equal(invalidAiOutput.error, "INVALID_AI_OUTPUT");
assert.equal(invalidAiOutput.errorKind, "validation_error");

const prismaConflict = classifyAiGenerateError({ code: "P2002", meta: { target: ["userId", "startDate", "daysCount"] } });
assert.equal(prismaConflict.statusCode, 409);
assert.equal(prismaConflict.error, "CONFLICT");
assert.deepEqual(prismaConflict.target, ["userId", "startDate", "daysCount"]);

const prismaValidation = classifyAiGenerateError({ code: "P2003", meta: { target: ["exerciseId"] } });
assert.equal(prismaValidation.statusCode, 422);
assert.equal(prismaValidation.error, "PERSISTENCE_VALIDATION_FAILED");
assert.equal(prismaValidation.errorKind, "validation_error");

console.log("error classification tests passed");
