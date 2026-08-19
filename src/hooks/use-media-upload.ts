"use client";

import { useCallback, useState } from "react";

import { apiClient } from "@/lib/api-client";
import { ALLOWED_MIME_TYPES, MAX_UPLOAD_BYTES, type MediaFolder } from "@/lib/validations/media";

export type UploadedMedia = {
  _id: string;
  url: string;
  key: string;
  filename: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
};

type PresignResponse = {
  id: string;
  key: string;
  url: string;
  uploadUrl: string;
};

/** Reads intrinsic dimensions client-side so the library can show them. */
function measure(file: File): Promise<{ width: number | null; height: number | null }> {
  return new Promise((resolve) => {
    if (!file.type.startsWith("image/") || file.type === "image/svg+xml") {
      resolve({ width: null, height: null });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = new window.Image();
    image.onload = () => {
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
      URL.revokeObjectURL(objectUrl);
    };
    image.onerror = () => {
      resolve({ width: null, height: null });
      URL.revokeObjectURL(objectUrl);
    };
    image.src = objectUrl;
  });
}

/** PUTs the file straight to R2, reporting progress. */
function putToR2(uploadUrl: string, file: File, onProgress: (percent: number) => void) {
  return new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("PUT", uploadUrl);
    request.setRequestHeader("Content-Type", file.type);

    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error(`Storage rejected the upload (HTTP ${request.status})`));
    request.onerror = () =>
      reject(
        new Error(
          "Could not reach the storage bucket. Check that R2 CORS allows PUT from this site.",
        ),
      );

    request.send(file);
  });
}

/** Server-proxied fallback, used when the bucket has no CORS policy. */
async function uploadViaServer(file: File, folder: MediaFolder): Promise<UploadedMedia> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", folder);

  const response = await fetch("/api/admin/media/upload", { method: "POST", body: form });
  const body = (await response.json()) as
    | { success: true; data: UploadedMedia }
    | { success: false; error: string };

  if (!response.ok || !body.success) {
    throw new Error(body.success ? "Upload failed" : body.error);
  }
  return body.data;
}

/**
 * Three-step direct upload: ask the server to authorise it, send the bytes
 * straight to R2, then confirm so the record becomes visible in the library.
 *
 * If the browser cannot reach the bucket (no CORS policy), it retries through
 * the server so uploads still work — just with a 4 MB ceiling.
 */
export function useMediaUpload(folder: MediaFolder = "general") {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const validate = useCallback((file: File) => {
    if (!(ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      return `${file.name}: unsupported file type (${file.type || "unknown"})`;
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      return `${file.name}: larger than ${Math.round(MAX_UPLOAD_BYTES / 1024 / 1024)} MB`;
    }
    return null;
  }, []);

  const upload = useCallback(
    async (file: File): Promise<UploadedMedia | null> => {
      const invalid = validate(file);
      if (invalid) {
        setError(invalid);
        return null;
      }

      setUploading(true);
      setProgress(0);
      setError(null);

      try {
        const presigned = await apiClient.post<PresignResponse>("/api/admin/media/presign", {
          filename: file.name,
          mimeType: file.type,
          size: file.size,
          folder,
        });

        try {
          await putToR2(presigned.uploadUrl, file, setProgress);
        } catch (directError) {
          console.warn("[media] direct upload failed, retrying via server", directError);
          const media = await uploadViaServer(file, folder);
          setProgress(100);
          return media;
        }

        const { width, height } = await measure(file);
        const media = await apiClient.post<UploadedMedia>("/api/admin/media/confirm", {
          id: presigned.id,
          width,
          height,
        });

        setProgress(100);
        return media;
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Upload failed");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [folder, validate],
  );

  /** Uploads sequentially so progress stays meaningful and R2 is not hammered. */
  const uploadMany = useCallback(
    async (files: File[]) => {
      const uploaded: UploadedMedia[] = [];
      for (const file of files) {
        const media = await upload(file);
        if (media) uploaded.push(media);
      }
      return uploaded;
    },
    [upload],
  );

  return { upload, uploadMany, uploading, progress, error, setError };
}
