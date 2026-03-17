#!/usr/bin/env node

import { mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'];
const METHOD_FUNCTION_REGEX = new RegExp(`\\bexport\\s+(?:async\\s+)?function\\s+(${HTTP_METHODS.join('|')})\\b`, 'g');
const METHOD_CONST_REGEX = new RegExp(`\\bexport\\s+const\\s+(${HTTP_METHODS.join('|')})\\b`, 'g');
const EXPORT_BLOCK_REGEX = /\bexport\s*\{([\s\S]*?)\}/g;
const EXPORT_ALIAS_REGEX = new RegExp(`\\bas\\s+(${HTTP_METHODS.join('|')})\\b`, 'g');

const mode = process.argv.includes('--check') ? 'check' : 'write';

const webRoot = process.cwd();
const apiDir = path.join(webRoot, 'src', 'app', 'api');
const repoRoot = path.resolve(webRoot, '..', '..');
const docsContractsDir = path.join(repoRoot, 'docs', 'contracts');
const jsonOutputPath = path.join(docsContractsDir, 'bff-endpoints.json');
const markdownOutputPath = path.join(docsContractsDir, 'bff-endpoints.md');

function walkRouteFiles(dir) {
  const entries = readdirSync(dir);
  const routeFiles = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry);
    const stats = statSync(fullPath);

    if (stats.isDirectory()) {
      routeFiles.push(...walkRouteFiles(fullPath));
      continue;
    }

    if (entry === 'route.ts') {
      routeFiles.push(fullPath);
    }
  }

  return routeFiles;
}

function toPublicPath(filePath) {
  const routeDir = path.dirname(filePath);
  const relativeRouteDir = path.relative(apiDir, routeDir);
  const routeSuffix = relativeRouteDir === '' ? '' : `/${relativeRouteDir.split(path.sep).join('/')}`;
  return `/api${routeSuffix}`;
}

function extractMethods(fileContents) {
  const methods = new Set();

  for (const match of fileContents.matchAll(METHOD_FUNCTION_REGEX)) {
    methods.add(match[1]);
  }

  for (const match of fileContents.matchAll(METHOD_CONST_REGEX)) {
    methods.add(match[1]);
  }

  for (const exportBlockMatch of fileContents.matchAll(EXPORT_BLOCK_REGEX)) {
    const exportBody = exportBlockMatch[1] ?? '';
    for (const aliasMatch of exportBody.matchAll(EXPORT_ALIAS_REGEX)) {
      methods.add(aliasMatch[1]);
    }
  }

  return HTTP_METHODS.filter((method) => methods.has(method));
}

function generateInventory() {
  if (!statSync(apiDir, { throwIfNoEntry: false })) {
    throw new Error(`Cannot find API directory from cwd: ${apiDir}`);
  }

  const routeFiles = walkRouteFiles(apiDir).sort((a, b) => a.localeCompare(b));
  const endpoints = routeFiles.map((filePath) => {
    const fileContents = readFileSync(filePath, 'utf8');
    return {
      path: toPublicPath(filePath),
      methods: extractMethods(fileContents),
      source: path.relative(repoRoot, filePath).split(path.sep).join('/'),
    };
  });

  endpoints.sort((a, b) => {
    if (a.path !== b.path) {
      return a.path.localeCompare(b.path);
    }

    const sourceOrder = a.source.localeCompare(b.source);
    if (sourceOrder !== 0) {
      return sourceOrder;
    }

    return a.methods.join(',').localeCompare(b.methods.join(','));
  });

  return {
    generatedBy: 'apps/web/scripts/endpoints-inventory.mjs',
    endpoints,
  };
}

function renderMarkdown(inventory) {
  const lines = [
    '# BFF Endpoints Inventory',
    '',
    'Generated from `apps/web/src/app/api/**/route.ts` via `npm --prefix apps/web run endpoints:inventory`.',
    '',
    '| Path | Methods | Source |',
    '| --- | --- | --- |',
  ];

  for (const endpoint of inventory.endpoints) {
    const methods = endpoint.methods.length > 0 ? endpoint.methods.join(', ') : '—';
    lines.push(`| \`${endpoint.path}\` | ${methods} | \`${endpoint.source}\` |`);
  }

  lines.push('');

  return `${lines.join('\n')}`;
}


function readVersionedFileOrFail(targetPath) {
  const file = statSync(targetPath, { throwIfNoEntry: false });
  if (!file) {
    console.error('Endpoint inventory changed — run endpoints:inventory and commit');
    console.error(`Missing versioned file: ${path.relative(repoRoot, targetPath)}`);
    process.exit(1);
  }

  return readFileSync(targetPath, 'utf8');
}

function run() {
  const inventory = generateInventory();
  const nextJson = `${JSON.stringify(inventory, null, 2)}\n`;
  const nextMarkdown = renderMarkdown(inventory);

  if (mode === 'check') {
    const currentJson = readVersionedFileOrFail(jsonOutputPath);
    const currentMarkdown = readVersionedFileOrFail(markdownOutputPath);

    if (currentJson !== nextJson || currentMarkdown !== nextMarkdown) {
      console.error('Endpoint inventory changed — run endpoints:inventory and commit');
      process.exit(1);
    }

    console.log('Endpoint inventory is up to date.');
    return;
  }

  mkdirSync(docsContractsDir, { recursive: true });
  writeFileSync(jsonOutputPath, nextJson);
  writeFileSync(markdownOutputPath, nextMarkdown);
  console.log(`Wrote inventory to ${path.relative(repoRoot, jsonOutputPath)} and ${path.relative(repoRoot, markdownOutputPath)}.`);
}

run();
