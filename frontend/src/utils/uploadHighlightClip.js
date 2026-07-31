import { API_BASE_URL, authHeaders } from "../config/api";
import { formatApiError } from "./authFetch";

export function cleanupFailedHighlightCard({ token, cardId }) {
  return fetch(`${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/highlight-cleanup`, {
    method: "DELETE",
    headers: { ...authHeaders(token) },
  }).then(async (res) => {
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(formatApiError(data?.detail, "Could not remove failed highlight card."));
    }
    return data;
  });
}

export function uploadHighlightClip({ token, cardId, file, trimStart, trimEnd, onProgress }) {
  return new Promise((resolve, reject) => {
    if (!token || !cardId || !file) {
      reject(new Error("Missing upload data."));
      return;
    }

    const form = new FormData();
    form.append("file", file, file.name || "highlight.mp4");
    form.append("trim_start_seconds", String(trimStart ?? 0));
    form.append("trim_end_seconds", String(trimEnd ?? 0));

    const xhr = new XMLHttpRequest();
    xhr.open("POST", `${API_BASE_URL}/cards/${encodeURIComponent(cardId)}/highlight`);

    const headers = authHeaders(token);
    Object.entries(headers).forEach(([key, value]) => {
      xhr.setRequestHeader(key, value);
    });

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable || typeof onProgress !== "function") return;
      onProgress(Math.min(1, event.loaded / event.total));
    };

    xhr.onload = () => {
      let data = {};
      try {
        data = JSON.parse(xhr.responseText || "{}");
      } catch {
        data = {};
      }
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(data);
        return;
      }
      reject(
        new Error(
          formatApiError(
            data?.detail,
            "Something went wrong saving your highlight. Please try again."
          )
        )
      );
    };

    xhr.onerror = () => reject(new Error("Network error while uploading highlight video."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(form);
  });
}
