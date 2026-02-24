#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const WEB_API_ROOT = path.join(ROOT, 'apps/web/src/app/api');
const BACKEND_ROOT = path.join(ROOT, 'apps/api/src');
const OUTPUT_JSON = path.join(ROOT, 'tools/contract-audit/output/report.json');
const OUTPUT_MD = path.join(ROOT, 'tools/contract-audit/output/report.md');

async function walk(dir, predicate, acc = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full, predicate, acc);
    } else if (predicate(full)) {
      acc.push(full);
    }
  }
  return acc;
}

function toPosix(p) {
  return p.split(path.sep).join('/');
}

function routePathFromFile(filePath) {
  const rel = toPosix(path.relative(WEB_API_ROOT, filePath));
  const withoutRoute = rel.replace(/\/route\.(ts|js)$/, '');
  const normalized = withoutRoute
    .replace(/\[\.\.\.(.+?)\]/g, ':$1*')
    .replace(/\[(.+?)\]/g, ':$1');
  return `/api/${normalized}`;
}

function backendPatternToApi(pathname) {
  return `/api${pathname.replace(/:([A-Za-z0-9_]+)/g, ':$1')}`;
}

function normalizeDynamic(pathname) {
  return pathname
    .replace(/\[(?:\.\.\.)?(.+?)\]/g, ':param')
    .replace(/:([A-Za-z0-9_]+)\*/g, ':param')
    .replace(/:[A-Za-z0-9_]+/g, ':param');
}

function normalizeMethod(m) {
  return m.toUpperCase();
}


function normalizeTemplatePath(raw) {
  return raw
    .replace(/\$\{[^}]+\}/g, ':param')
    .replace(/\/+/g, '/');
}

function parseBffRoutes(content, filePath) {
  const methods = new Set();
  const methodRegex = /export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|OPTIONS|HEAD)\s*\(/g;
  for (const match of content.matchAll(methodRegex)) {
    methods.add(normalizeMethod(match[1]));
  }
  if (methods.size === 0) return [];

  const backendTargets = new Set();
  const fetchRegex = /fetch\(\s*`\$\{getBackendUrl\(\)\}([^`]+)`/g;
  for (const match of content.matchAll(fetchRegex)) {
    backendTargets.add(`/api${normalizeTemplatePath(match[1])}`);
  }

  const proxyRegex = /proxyToBackend\(\s*`([^`]+)`/g;
  for (const match of content.matchAll(proxyRegex)) {
    backendTargets.add(`/api${normalizeTemplatePath(match[1])}`);
  }

  const proxyLiteralRegex = /proxyToBackend\(\s*['"]([^'"]+)['"]/g;
  for (const match of content.matchAll(proxyLiteralRegex)) {
    backendTargets.add(`/api${normalizeTemplatePath(match[1])}`);
  }

  const routePath = routePathFromFile(filePath);
  const target = backendTargets.size === 1 ? [...backendTargets][0] : null;

  return [...methods]
    .filter((method) => method !== 'OPTIONS' && method !== 'HEAD')
    .map((method) => ({
    sourceFile: toPosix(path.relative(ROOT, filePath)),
    method,
    bffPath: routePath,
    backendTarget: target,
  }));
}

function parseBackendRoutes(content, filePath) {
  const routes = [];
  const routeRegex = /\b(?:app|fastify|server)\.(get|post|put|patch|delete|options|head)\s*\(\s*(["'`])([^"'`]+)\2/g;
  for (const match of content.matchAll(routeRegex)) {
    const method = normalizeMethod(match[1]);
    const rawPath = match[3];
    if (!rawPath.startsWith('/')) continue;
    routes.push({
      sourceFile: toPosix(path.relative(ROOT, filePath)),
      method,
      backendPath: backendPatternToApi(rawPath),
    });
  }
  return routes;
}

function makeIndex(routes, pathKey) {
  const index = new Set();
  for (const route of routes) {
    index.add(`${route.method} ${normalizeDynamic(route[pathKey])}`);
  }
  return index;
}

function hasKeywords(route) {
  return /\/tokens|\/plan/.test(route.bffPath);
}

function isAdminUserIdRoute(route) {
  return route.bffPath.startsWith('/api/admin/users/:id/');
}

function reportToMarkdown(report) {
  const lines = [];
  lines.push('# Contract Audit Report');
  lines.push('');
  lines.push(`Generated at: ${report.generatedAt}`);
  lines.push('');
  lines.push(`- BFF routes audited: ${report.summary.totalBffRoutes}`);
  lines.push(`- Backend routes discovered: ${report.summary.totalBackendRoutes}`);
  lines.push(`- Matched: ${report.summary.matched}`);
  lines.push(`- Missing backend contract: ${report.summary.missing}`);
  lines.push('');
  lines.push('## Missing routes');
  lines.push('');
  if (report.missing.length === 0) {
    lines.push('No missing routes.');
  } else {
    lines.push('| Method | BFF path | Backend target | Source |');
    lines.push('|---|---|---|---|');
    for (const route of report.missing) {
      lines.push(`| ${route.method} | ${route.bffPath} | ${route.backendTarget ?? '(dynamic/unresolved)'} | ${route.sourceFile} |`);
    }
  }
  lines.push('');
  lines.push('## Focus: admin users + tokens*/plan');
  lines.push('');
  lines.push('| Status | Method | BFF path | Backend target |');
  lines.push('|---|---|---|---|');
  for (const route of report.focusRoutes) {
    lines.push(`| ${route.status} | ${route.method} | ${route.bffPath} | ${route.backendTarget ?? '(dynamic/unresolved)'} |`);
  }
  return lines.join('\n');
}

async function main() {
  const bffFiles = await walk(WEB_API_ROOT, (p) => /\/route\.(ts|js)$/.test(p));
  const backendFiles = await walk(BACKEND_ROOT, (p) => p.endsWith('.ts'));

  const bffRoutes = [];
  for (const file of bffFiles) {
    const content = await fs.readFile(file, 'utf8');
    bffRoutes.push(...parseBffRoutes(content, file));
  }

  const backendRoutes = [];
  for (const file of backendFiles) {
    const content = await fs.readFile(file, 'utf8');
    backendRoutes.push(...parseBackendRoutes(content, file));
  }

  const backendIndex = makeIndex(backendRoutes, 'backendPath');

  const matched = [];
  const missing = [];

  for (const route of bffRoutes) {
    const keyByTarget = route.backendTarget ? `${route.method} ${normalizeDynamic(route.backendTarget)}` : null;
    const keyByPath = `${route.method} ${normalizeDynamic(route.bffPath)}`;
    const isMatch = (keyByTarget && backendIndex.has(keyByTarget)) || backendIndex.has(keyByPath);
    if (isMatch) {
      matched.push(route);
    } else {
      missing.push(route);
    }
  }

  const focusRoutes = bffRoutes
    .filter((route) => isAdminUserIdRoute(route) || hasKeywords(route))
    .map((route) => ({
      ...route,
      status: missing.includes(route) ? 'missing' : 'matched',
    }))
    .sort((a, b) => a.bffPath.localeCompare(b.bffPath) || a.method.localeCompare(b.method));

  const report = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalBffRoutes: bffRoutes.length,
      totalBackendRoutes: backendRoutes.length,
      matched: matched.length,
      missing: missing.length,
    },
    missing: missing.sort((a, b) => a.bffPath.localeCompare(b.bffPath) || a.method.localeCompare(b.method)),
    focusRoutes,
  };

  await fs.mkdir(path.dirname(OUTPUT_JSON), { recursive: true });
  await fs.writeFile(OUTPUT_JSON, JSON.stringify(report, null, 2));
  await fs.writeFile(OUTPUT_MD, reportToMarkdown(report));

  console.log(`Contract audit completed. matched=${report.summary.matched} missing=${report.summary.missing}`);
  console.log(`JSON: ${toPosix(path.relative(ROOT, OUTPUT_JSON))}`);
  console.log(`MD: ${toPosix(path.relative(ROOT, OUTPUT_MD))}`);
}

main().catch((error) => {
  console.error('Contract audit failed:', error);
  process.exitCode = 1;
});
