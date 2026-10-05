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

const AVATAR_EDGE = 512;

/** Center-crops to a square and shrinks to 512px WebP, which keeps profile photos small and consistent. */
export async function prepareAvatar(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  const side = Math.min(bitmap.width, bitmap.height);
  const out = Math.min(AVATAR_EDGE, side);
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = out;
  canvas.getContext("2d")!.drawImage(bitmap, (bitmap.width - side) / 2, (bitmap.height - side) / 2, side, side, 0, 0, out, out);
  bitmap.close();
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", 0.88));
  if (!blob) throw new Error("Could not process image");
  return new File([blob], "avatar.webp", { type: "image/webp" });
}
