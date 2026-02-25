#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const GENERIC_INSTRUCTIONS = [
  'Preparar ingredientes.',
  'Cocinar siguiendo la receta enlazada.',
  'Servir.',
];

function parseArgs(argv) {
  const args = { out: 'apps/web/public/recipe-db/recipes' };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === '--input') args.input = argv[++i];
    else if (token === '--images') args.images = argv[++i];
    else if (token === '--out') args.out = argv[++i];
    else if (token === '--zip') args.zip = argv[++i];
    else if (token === '--help') args.help = true;
  }
  return args;
}

function showHelp() {
  console.log(`Uso:
  node tools/recipe-db/build-recipe-db.mjs --input <dataset.csv|dataset.json> [--images <imagesDir>] [--out <outputDir>] [--zip <zipPath>]

Entrada esperada:
  - CSV o JSON array con columnas/campos:
    Id, Categoria, Nombre, Valoracion, Dificultad, Num_comensales, Tiempo, Tipo, Link_receta, Fecha_modificacion, Ingredientes

Salida:
  - <out>/<Recipe_Id>/recipe.json
  - <out>/<Recipe_Id>/0.jpg ... (si existen en --images)
`);
}

function normalizeText(value) {
  return String(value ?? '').trim();
}

function removeAccents(value) {
  return value.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function toRecipeId(name, externalId, usedIds) {
  const cleaned = removeAccents(normalizeText(name))
    .replace(/[^a-zA-Z0-9\s_-]/g, ' ')
    .trim();

  const base = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .map((token) => token.charAt(0).toUpperCase() + token.slice(1).toLowerCase())
    .join('_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const fallback = `Recipe_${externalId ?? 'unknown'}`;
  let id = base || fallback;
  if (usedIds.has(id)) {
    id = `${id}_${externalId ?? Date.now()}`;
  }
  usedIds.add(id);
  return id;
}

function parseTimeToMinutes(value) {
  const text = normalizeText(value).toLowerCase();
  if (!text) return { minutes: null, parseable: true };

  const hMatch = text.match(/(\d+)\s*h/);
  const mMatch = text.match(/(\d+)\s*m/);

  if (hMatch || mMatch) {
    const hours = hMatch ? Number(hMatch[1]) : 0;
    const minutes = mMatch ? Number(mMatch[1]) : 0;
    return { minutes: (hours * 60) + minutes, parseable: true };
  }

  const plainNumber = text.match(/^\d+$/);
  if (plainNumber) return { minutes: Number(plainNumber[0]), parseable: true };

  return { minutes: null, parseable: false };
}

function parseServings(value) {
  const text = normalizeText(value);
  if (!text) return null;
  const match = text.match(/\d+/);
  return match ? Number(match[0]) : null;
}

function parseIngredients(value) {
  const text = normalizeText(value);
  if (!text) return [];
  return text.split(',').map((item) => item.trim()).filter(Boolean);
}

function readDataset(inputPath) {
  const content = fs.readFileSync(inputPath, 'utf8');
  if (inputPath.endsWith('.json')) {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) throw new Error('El JSON de entrada debe ser un array');
    return parsed;
  }

  const lines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];

  const separator = lines[0].includes('\t') ? '\t' : ',';
  const headers = splitCsvLine(lines[0], separator);
  return lines.slice(1).map((line) => {
    const cols = splitCsvLine(line, separator);
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] ?? '';
    });
    return row;
  });
}

function splitCsvLine(line, separator) {
  const out = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (ch === separator && !inQuotes) {
      out.push(current.trim());
      current = '';
      continue;
    }

    current += ch;
  }
  out.push(current.trim());
  return out;
}

function copyImagesForRecipe(imagesRoot, recipeId, recipeDir) {
  if (!imagesRoot || !fs.existsSync(imagesRoot)) return [];

  const recipeImageDir = path.join(imagesRoot, recipeId);
  const indexPattern = /^\d+\.(jpg|jpeg)$/i;

  let sourceFiles = [];
  if (fs.existsSync(recipeImageDir) && fs.statSync(recipeImageDir).isDirectory()) {
    sourceFiles = fs.readdirSync(recipeImageDir)
      .filter((name) => indexPattern.test(name))
      .sort((a, b) => Number(a.split('.')[0]) - Number(b.split('.')[0]))
      .map((name) => path.join(recipeImageDir, name));
  } else {
    sourceFiles = fs.readdirSync(imagesRoot)
      .filter((name) => name.startsWith(`${recipeId}_`) && indexPattern.test(name.replace(`${recipeId}_`, '')))
      .sort((a, b) => {
        const an = Number(a.split('_').at(-1).split('.')[0]);
        const bn = Number(b.split('_').at(-1).split('.')[0]);
        return an - bn;
      })
      .map((name) => path.join(imagesRoot, name));
  }

  const imagePaths = [];
  sourceFiles.forEach((sourceFile, idx) => {
    const targetName = `${idx}.jpg`;
    const targetFile = path.join(recipeDir, targetName);
    fs.copyFileSync(sourceFile, targetFile);
    imagePaths.push(`${recipeId}/${targetName}`);
  });

  return imagePaths;
}

function maybeZip(zipPath, folderPath) {
  if (!zipPath) return;
  const result = spawnSync('zip', ['-r', zipPath, path.basename(folderPath)], {
    cwd: path.dirname(folderPath),
    stdio: 'inherit',
  });
  if (result.status !== 0) throw new Error('No se pudo crear ZIP con el comando zip');
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help || !args.input) {
    showHelp();
    process.exit(args.help ? 0 : 1);
  }

  const rows = readDataset(args.input);
  const outDir = path.resolve(args.out);
  fs.mkdirSync(outDir, { recursive: true });

  const usedIds = new Set();
  let withImages = 0;
  let withoutImages = 0;
  let unparseableTime = 0;

  for (const row of rows) {
    const externalIdRaw = normalizeText(row.Id);
    const externalId = externalIdRaw && /^\d+$/.test(externalIdRaw) ? Number(externalIdRaw) : null;
    const recipeId = toRecipeId(row.Nombre, externalId, usedIds);

    const recipeDir = path.join(outDir, recipeId);
    fs.mkdirSync(recipeDir, { recursive: true });

    const parsedTime = parseTimeToMinutes(row.Tiempo);
    if (!parsedTime.parseable) unparseableTime += 1;

    const images = copyImagesForRecipe(args.images ? path.resolve(args.images) : null, recipeId, recipeDir);
    if (images.length > 0) withImages += 1;
    else withoutImages += 1;

    const json = {
      name: normalizeText(row.Nombre),
      level: normalizeText(row.Dificultad) || null,
      category: normalizeText(row.Categoria) || null,
      type: normalizeText(row.Tipo) || null,
      timeMinutes: parsedTime.minutes,
      servings: parseServings(row.Num_comensales),
      sourceUrl: normalizeText(row.Link_receta) || null,
      ingredients: parseIngredients(row.Ingredientes),
      instructions: GENERIC_INSTRUCTIONS,
      images,
      id: recipeId,
      externalId,
    };

    fs.writeFileSync(path.join(recipeDir, 'recipe.json'), `${JSON.stringify(json, null, 2)}\n`, 'utf8');
  }

  if (args.zip) {
    await maybeZip(path.resolve(args.zip), outDir);
  }

  console.log(JSON.stringify({
    totalRecipes: rows.length,
    withImages,
    withoutImages,
    unparseableTime,
    outputDir: outDir,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
