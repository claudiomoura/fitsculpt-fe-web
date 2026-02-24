# Recipe DB builder

Script para convertir un dataset tabular de recetas en una estructura estática de archivos equivalente al patrón de `exercise-db`.

## Salida

Por defecto crea:

- `apps/web/public/recipe-db/recipes/<Recipe_Id>/recipe.json`
- `apps/web/public/recipe-db/recipes/<Recipe_Id>/0.jpg`, `1.jpg`, ... (si existen imágenes locales)

## Uso

```bash
node tools/recipe-db/build-recipe-db.mjs \
  --input <dataset.csv|dataset.json> \
  [--images <directorio_imagenes>] \
  [--out apps/web/public/recipe-db/recipes] \
  [--zip recipe-db.zip]
```

## Reglas aplicadas

- IDs reproducibles tipo slug con `_`, sin acentos ni caracteres especiales.
- Si hay colisión de ID, agrega sufijo `_<externalId>`.
- Convierte tiempos como `1h 30m` o `10m` a minutos.
- Si no hay imágenes locales para una receta: `images: []`.
- Instrucciones genéricas seguras cuando no hay pasos en el dataset.
