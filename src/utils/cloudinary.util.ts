import { v2 as cloudinary } from "cloudinary";

import { getEnvConfig } from "../config/env.js";

const SPEAKER_FOLDER = "onference-events/speakers";
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

let configured = false;

function ensureCloudinary(): boolean {
  const env = getEnvConfig();
  if (!env.cloudinaryCloudName || !env.cloudinaryApiKey || !env.cloudinaryApiSecret) {
    return false;
  }

  if (!configured) {
    cloudinary.config({
      cloud_name: env.cloudinaryCloudName,
      api_key: env.cloudinaryApiKey,
      api_secret: env.cloudinaryApiSecret,
      secure: true
    });
    configured = true;
  }

  return true;
}

function sanitizeFileStem(fileName: string): string {
  const stem = fileName.replace(/\.[^.]+$/, "");
  const safe = stem.replace(/[^a-zA-Z0-9-_]+/g, "-").replace(/^-+|-+$/g, "");
  return safe.slice(0, 48) || "speaker";
}

export function isAllowedSpeakerImage(mimeType: string | undefined): boolean {
  return mimeType === "image/jpeg" || mimeType === "image/png" || mimeType === "image/webp" || mimeType === "image/gif";
}

export function getMaxSpeakerImageBytes(): number {
  return MAX_IMAGE_BYTES;
}

export async function uploadSpeakerPhoto(
  buffer: Buffer,
  fileName: string
): Promise<{ publicId: string; url: string }> {
  if (!ensureCloudinary()) {
    throw new Error("CLOUDINARY_NOT_CONFIGURED");
  }

  if (buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("IMAGE_TOO_LARGE");
  }

  const publicId = `${Date.now()}-${sanitizeFileStem(fileName)}`;

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: SPEAKER_FOLDER,
        public_id: publicId,
        resource_type: "image",
        overwrite: false
      },
      (error, result) => {
        if (error || !result?.secure_url) {
          reject(error ?? new Error("CLOUDINARY_UPLOAD_FAILED"));
          return;
        }

        resolve({
          publicId: result.public_id,
          url: result.secure_url
        });
      }
    );

    stream.end(buffer);
  });
}

export function resetCloudinaryForTests(): void {
  configured = false;
}
