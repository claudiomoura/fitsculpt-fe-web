#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const sourceDir = path.join(rootDir, 'src');
const allowedExt = new Set(['.ts', '.tsx', '.js', '.jsx']);

const check = {
  name: 'legacy ui import',
  regex: /(?:from\s+['"]@\/components\/ui\/[^'"\n]+['"]|import\(\s*['"]@\/components\/ui\/[^'"\n]+['"]\s*\))/g,
  message: "Import from '@/design-system/components/*' instead of '@/components/ui/*'.",
};

function normalizePath(p) {
  return path.relative(rootDir, p).split(path.sep).join('/');
}

function isAllowedLegacyUiImport(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.startsWith('src/design-system/components/');
}

function walk(dir) {
  const entries = readdirSync(dir);
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stat = statSync(fullPath);
    if (stat.isDirectory()) {
      files.push(...walk(fullPath));
      continue;
    }
    if (allowedExt.has(path.extname(fullPath))) {
      files.push(fullPath);
    }
  }
  return files;
}

function lineColFromIndex(text, index) {
  const sliced = text.slice(0, index);
  const lines = sliced.split('\n');
  const line = lines.length;
  const col = lines[lines.length - 1].length + 1;
  return { line, col };
}

if (!statSync(sourceDir, { throwIfNoEntry: false })) {
  console.error('Cannot find src directory from current working directory. Run this script in apps/web.');
  process.exit(1);
}

const files = walk(sourceDir);
const violations = [];

for (const file of files) {
  if (isAllowedLegacyUiImport(file)) continue;
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(check.regex)) {
    const idx = match.index ?? 0;
    const loc = lineColFromIndex(content, idx);
    violations.push({
      file: normalizePath(file),
      line: loc.line,
      col: loc.col,
      matched: match[0],
      check: check.name,
      message: check.message,
    });
  }
}

if (violations.length > 0) {
  console.error(`Design system import guardrails failed with ${violations.length} violation(s):`);
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line}:${v.col} [${v.check}] ${v.message} (found: ${v.matched})`);
  }
  process.exit(1);
}

console.log(`Design system import guardrails passed (${files.length} source file(s) checked).`);
