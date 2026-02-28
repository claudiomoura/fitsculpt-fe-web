import { z } from "zod";

export type SafeValidationIssue = {
  path: string;
  message: string;
};

function getSafeIssueMessage(issue: z.ZodIssue): string {
  switch (issue.code) {
    case z.ZodIssueCode.invalid_type:
      return issue.received === "undefined" ? "Required" : "Invalid type";
    case z.ZodIssueCode.invalid_enum_value:
      return "Invalid option";
    case z.ZodIssueCode.too_small:
      return "Value is too small";
    case z.ZodIssueCode.too_big:
      return "Value is too large";
    case z.ZodIssueCode.invalid_string:
      return "Invalid string";
    case z.ZodIssueCode.invalid_date:
      return "Invalid date";
    case z.ZodIssueCode.unrecognized_keys:
      return "Unrecognized key";
    default:
      return "Invalid value";
  }
}

export function getSafeValidationIssues(
  error: z.ZodError,
): SafeValidationIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: getSafeIssueMessage(issue),
  }));
}
