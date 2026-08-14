import React, { useId } from "react";
import { User } from "lucide-react";
import { toApiUrl } from "../config/api";

export default function FacePhotoStep({
  actionPhotoUrl,
  facePhotoFile,
  facePhotoUrl,
  facePhotoUploading,
  facePhotoError,
  dragActive,
  onDragActiveChange,
  onFileSelect,
  onRemove,
  onSkip,
  onContinue,
  onBack,
  continueLabel = "Continue",
}) {
  const inputId = useId();
  const actionPreview = actionPhotoUrl ? toApiUrl(actionPhotoUrl) : "";
  const facePreview = facePhotoFile
    ? URL.createObjectURL(facePhotoFile)
    : facePhotoUrl
      ? toApiUrl(facePhotoUrl)
      : "";

  return (
    <div className="grid gap-5">
      <div>
        <h3 className="text-lg font-semibold text-white">Want a more accurate card? (Optional)</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-400">
          Upload a clear front-facing photo of the player. This helps the AI accurately capture their
          likeness — especially useful for action shots where the face isn&apos;t visible.
        </p>
      </div>

      <div className="flex items-center justify-center gap-3 sm:gap-4">
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-success/40 bg-zinc-900/80 sm:h-28 sm:w-28">
            {actionPreview ? (
              <img src={actionPreview} alt="Action photo" className="h-full w-full object-cover" />
            ) : (
              <span className="text-xs text-slate-500">Action</span>
            )}
          </div>
          <p className="text-center text-xs font-medium text-success">Action Photo ✓</p>
        </div>
        <span className="text-lg text-brand-gold/70" aria-hidden>
          →
        </span>
        <div className="flex flex-1 flex-col items-center gap-2">
          <div className="relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-xl border border-dashed border-white/25 bg-zinc-900/50 sm:h-28 sm:w-28">
            {facePreview ? (
              <img src={facePreview} alt="Face photo preview" className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-slate-500" strokeWidth={1.5} />
            )}
          </div>
          <p className="text-center text-xs font-medium text-slate-400">Face Photo (optional)</p>
        </div>
      </div>

      <input
        id={inputId}
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={(e) => {
          onFileSelect(e.target.files?.[0] || null);
          e.target.value = "";
        }}
      />

      {facePhotoError ? <p className="text-sm text-rose-300">{facePhotoError}</p> : null}

      {!facePhotoUrl && !facePhotoFile ? (
        <label
          htmlFor={inputId}
          onDragOver={(e) => {
            e.preventDefault();
            onDragActiveChange(true);
          }}
          onDragLeave={() => onDragActiveChange(false)}
          onDrop={(e) => {
            e.preventDefault();
            onDragActiveChange(false);
            onFileSelect(e.dataTransfer.files?.[0] || null);
          }}
          className={`flex min-h-[160px] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-4 text-center transition ${
            dragActive
              ? "border-[var(--color-border-gold)] bg-gold-subtle"
              : "border-white/20 bg-cardBg2 hover:border-[var(--color-border-gold)]"
          }`}
        >
          <User className="mb-2 h-8 w-8 text-brand-gold/80" strokeWidth={1.5} />
          <p className="text-sm font-medium text-slate-200">Upload a front-facing photo</p>
          <p className="mt-1 text-xs text-slate-400">Clear, well-lit, facing the camera</p>
        </label>
      ) : (
        <>
          <div className="relative flex min-h-[240px] items-center justify-center rounded-xl border border-white/15 bg-zinc-900/70 p-4 sm:min-h-[280px]">
            {facePhotoUploading ? (
              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-xl bg-black/50">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--color-gold-primary)]" />
                <p className="mt-3 text-sm text-slate-200">Uploading face photo...</p>
              </div>
            ) : null}
            {facePreview ? (
              <img
                src={facePreview}
                alt="Face photo preview"
                className="max-h-[min(360px,50vh)] w-full object-contain"
              />
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            <label
              htmlFor={inputId}
              className={`inline-flex min-h-[44px] items-center justify-center rounded-xl border border-white/25 bg-transparent px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/40 hover:bg-white/5 ${facePhotoUploading ? "pointer-events-none opacity-50" : "cursor-pointer"}`}
            >
              Replace
            </label>
            <button
              type="button"
              onClick={onRemove}
              disabled={facePhotoUploading}
              className="inline-flex min-h-[44px] items-center justify-center rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-2.5 text-sm font-medium text-rose-100 disabled:opacity-50"
            >
              Remove
            </button>
          </div>
        </>
      )}

      <ul className="space-y-1 text-xs text-slate-400">
        <li>✓ Looking directly at the camera</li>
        <li>✓ Good lighting on the face</li>
        <li>✓ Just the player, no one else</li>
        <li>✗ Avoid sunglasses or hats that cover the face</li>
      </ul>

      <button
        type="button"
        onClick={onSkip}
        disabled={facePhotoUploading}
        className="mx-auto text-sm font-medium text-slate-400 underline decoration-slate-600 underline-offset-2 transition hover:text-slate-200 disabled:opacity-50"
      >
        Skip — use action photo only
      </button>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-[46px] items-center justify-center rounded-xl border border-white/20 bg-cardBg2 px-4 py-2.5 text-sm font-medium text-slate-100"
        >
          Back
        </button>
        <button
          type="button"
          disabled={facePhotoUploading}
          onClick={onContinue}
          className="inline-flex min-h-[46px] w-full items-center justify-center rounded-xl btn-primary px-4 py-2.5 text-sm font-medium text-slate-950 sm:w-auto disabled:cursor-not-allowed disabled:bg-slate-600 disabled:text-slate-400"
        >
          {continueLabel}
        </button>
      </div>
    </div>
  );
}
