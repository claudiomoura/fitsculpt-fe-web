import assert from "node:assert/strict";

import { classifyAiGenerateError } from "../ai/errorClassification.js";

const invalidAiOutput = classifyAiGenerateError({ code: "AI_PARSE_ERROR" });
assert.equal(invalidAiOutput.statusCode, 422);
assert.equal(invalidAiOutput.error, "UNPROCESSABLE_ENTITY");
assert.equal(invalidAiOutput.errorKind, "validation_error");

const prismaConflict = classifyAiGenerateError({ code: "P2002", meta: { target: ["userId", "startDate", "daysCount"] } });
assert.equal(prismaConflict.statusCode, 409);
assert.equal(prismaConflict.error, "CONFLICT");
assert.deepEqual(prismaConflict.target, ["userId", "startDate", "daysCount"]);

const prismaValidation = classifyAiGenerateError({ code: "P2003", meta: { target: ["exerciseId"] } });
assert.equal(prismaValidation.statusCode, 422);
assert.equal(prismaValidation.error, "UNPROCESSABLE_ENTITY");
assert.equal(prismaValidation.errorKind, "validation_error");

const prismaNotFound = classifyAiGenerateError({ code: "P2025" });
assert.equal(prismaNotFound.statusCode, 404);
assert.equal(prismaNotFound.error, "NOT_FOUND");

console.log("error classification tests passed");
