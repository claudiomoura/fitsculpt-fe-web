const MAX_SOURCE_FILE_BYTES = 10 * 1024 * 1024;
const MAX_AVATAR_DIMENSION = 512;
const MAX_AVATAR_PAYLOAD_BYTES = 220 * 1024;
const AVATAR_ENCODINGS: Array<{ type: "image/webp" | "image/jpeg"; quality: number }> = [
  { type: "image/webp", quality: 0.82 },
  { type: "image/webp", quality: 0.72 },
  { type: "image/jpeg", quality: 0.8 },
  { type: "image/jpeg", quality: 0.7 },
];

export function fitWithinSquare(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= 0 || height <= 0) {
    return { width: maxDimension, height: maxDimension };
  }

  if (width <= maxDimension && height <= maxDimension) {
    return { width: Math.round(width), height: Math.round(height) };
  }

  const ratio = Math.min(maxDimension / width, maxDimension / height);
  return {
    width: Math.max(1, Math.round(width * ratio)),
    height: Math.max(1, Math.round(height * ratio)),
  };
}

export function estimateDataUrlBytes(dataUrl: string): number {
  const commaIndex = dataUrl.indexOf(",");
  if (commaIndex < 0) {
    return dataUrl.length;
  }

  const base64 = dataUrl.slice(commaIndex + 1);
  return Math.ceil((base64.length * 3) / 4);
}

export function pickAvatarCandidate(candidates: string[], maxBytes = MAX_AVATAR_PAYLOAD_BYTES): string | null {
  if (candidates.length === 0) {
    return null;
  }

  let smallest = candidates[0];
  let smallestSize = estimateDataUrlBytes(smallest);
  for (const candidate of candidates) {
    const candidateSize = estimateDataUrlBytes(candidate);
    if (candidateSize <= maxBytes) {
      return candidate;
    }
    if (candidateSize < smallestSize) {
      smallest = candidate;
      smallestSize = candidateSize;
    }
  }

  return smallestSize <= maxBytes ? smallest : null;
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const nextUrl = String(reader.result || "");
      if (!nextUrl) {
        reject(new Error("avatar-empty"));
        return;
      }
      resolve(nextUrl);
    };
    reader.onerror = () => reject(new Error("avatar-read-failed"));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("avatar-invalid-image"));
    image.src = dataUrl;
  });
}

export async function compressAvatarToDataUrl(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("avatar-invalid-type");
  }

  if (file.size > MAX_SOURCE_FILE_BYTES) {
    throw new Error("avatar-file-too-large");
  }

  const sourceDataUrl = await readFileAsDataUrl(file);
  const sourceImage = await loadImage(sourceDataUrl);
  const targetSize = fitWithinSquare(sourceImage.naturalWidth || sourceImage.width, sourceImage.naturalHeight || sourceImage.height, MAX_AVATAR_DIMENSION);

  const canvas = document.createElement("canvas");
  canvas.width = targetSize.width;
  canvas.height = targetSize.height;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("avatar-canvas-unavailable");
  }

  context.drawImage(sourceImage, 0, 0, targetSize.width, targetSize.height);
  const encodedCandidates = AVATAR_ENCODINGS.map((encoding) => canvas.toDataURL(encoding.type, encoding.quality));
  const bestCandidate = pickAvatarCandidate(encodedCandidates, MAX_AVATAR_PAYLOAD_BYTES);
  if (!bestCandidate) {
    throw new Error("avatar-payload-too-large");
  }

  return bestCandidate;
}
