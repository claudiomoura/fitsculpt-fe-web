#!/usr/bin/env node

import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const rootDir = process.cwd();
const targetDir = path.join(rootDir, 'src', 'design-system');
const sourceDir = path.join(rootDir, 'src');
const allowedExt = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);

const checks = [
  {
    name: 'hex color literal',
    regex: /#[0-9a-fA-F]{3,8}\b/g,
    message: 'Use semantic color tokens instead of raw hex values.',
  },
  {
    name: 'arbitrary spacing utility',
    regex: /\b(?:p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-\[(?!var\().+?\]/g,
    message: 'Use spacing scale utilities instead of arbitrary spacing values.',
  },
  {
    name: 'inline random spacing',
    regex: /\b(?:padding|paddingTop|paddingRight|paddingBottom|paddingLeft|margin|marginTop|marginRight|marginBottom|marginLeft)\s*:\s*["'`]?\d+(?:\.\d+)?(?:px|rem|em|%)?["'`]?/g,
    message: 'Use spacing scale/token values instead of random inline spacing.',
  },
];

const uiImportCheck = {
  name: 'legacy ui import',
  regex: /(?:from\s+['"]@\/components\/ui\/[^'"\n]+['"]|import\(\s*['"]@\/components\/ui\/[^'"\n]+['"]\s*\))/g,
  message: "Import from '@/design-system/components/*' instead of '@/components/ui/*'.",
};

function normalizePath(p) {
  return path.relative(rootDir, p).split(path.sep).join('/');
}

function isAllowedLegacyUiImport(filePath) {
  const normalized = normalizePath(filePath);
  return normalized.startsWith('src/components/ui/') || normalized.startsWith('src/design-system/components/');
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

if (!statSync(path.dirname(targetDir), { throwIfNoEntry: false })) {
  console.error('Cannot find src directory from current working directory. Run this script in apps/web.');
  process.exit(1);
}

if (!statSync(sourceDir, { throwIfNoEntry: false })) {
  console.error('Cannot find src directory from current working directory. Run this script in apps/web.');
  process.exit(1);
}

if (!statSync(targetDir, { throwIfNoEntry: false })) {
  console.log('No src/design-system directory found. Nothing to lint.');
  process.exit(0);
}

const files = walk(targetDir);
if (files.length === 0) {
  console.log('No design-system source files found (.ts/.tsx/.js/.jsx/.css).');
  process.exit(0);
}

const sourceFiles = walk(sourceDir);

const violations = [];

for (const file of files) {
  const content = readFileSync(file, 'utf8');

  for (const check of checks) {
    for (const match of content.matchAll(check.regex)) {
      const idx = match.index ?? 0;
      const loc = lineColFromIndex(content, idx);
      violations.push({
        file: path.relative(rootDir, file),
        line: loc.line,
        col: loc.col,
        matched: match[0],
        check: check.name,
        message: check.message,
      });
    }
  }
}

for (const file of sourceFiles) {
  if (isAllowedLegacyUiImport(file)) continue;
  const content = readFileSync(file, 'utf8');
  for (const match of content.matchAll(uiImportCheck.regex)) {
    const idx = match.index ?? 0;
    const loc = lineColFromIndex(content, idx);
    violations.push({
      file: normalizePath(file),
      line: loc.line,
      col: loc.col,
      matched: match[0],
      check: uiImportCheck.name,
      message: uiImportCheck.message,
    });
  }
}

if (violations.length > 0) {
  console.error(`Design system guardrails failed with ${violations.length} violation(s):`);
  for (const v of violations) {
    console.error(`- ${v.file}:${v.line}:${v.col} [${v.check}] ${v.message} (found: ${v.matched})`);
  }
  process.exit(1);
}

console.log(
  `Design system guardrails passed (${files.length} file(s) checked in src/design-system, ${sourceFiles.length} source file(s) checked for legacy ui imports).`
);
