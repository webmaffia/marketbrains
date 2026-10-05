const MAX_EDGE = 1600;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/gif"];
export const MAX_UPLOAD_MB = 5;

export const IMAGE_ACCEPT = ACCEPTED.join(",");

/** Returns an error message if the file can't be used, otherwise null. */
export function validateImage(file: File): string | null {
  if (!ACCEPTED.includes(file.type)) return "Use a JPG, PNG, WebP or GIF image";
  if (file.size > 25 * 1024 * 1024) return "That image is too large";
  return null;
}

/**
 * Downscales big photos (phone cameras are 4000px+) and re-encodes them as WebP so uploads
 * stay small. GIFs are left alone to keep animation. Falls back to the original if anything fails.
 */
export async function prepareImage(file: File): Promise<File> {
  if (file.type === "image/gif") return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.85));
    if (blob && blob.size < file.size) return new File([blob], "image.webp", { type: "image/webp" });
  } catch {}
  return file;
}
