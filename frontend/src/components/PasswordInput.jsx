import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

const DEFAULT_INPUT_CLASS =
  "min-h-[46px] w-full rounded-xl border border-white/15 bg-cardBg2 px-3 py-2.5 pr-11 text-slate-100";

/**
 * Password field with show/hide toggle (eye icon).
 * Pass className to override the default auth-form input styles.
 */
export default function PasswordInput({
  value,
  onChange,
  className,
  autoComplete = "current-password",
  id,
  name,
  required,
  minLength,
  placeholder,
  disabled,
  "aria-label": ariaLabel,
}) {
  const [visible, setVisible] = useState(false);
  const inputClass = className
    ? `${className}${className.includes("pr-") ? "" : " pr-11"}`.trim()
    : DEFAULT_INPUT_CLASS;

  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        required={required}
        minLength={minLength}
        placeholder={placeholder}
        disabled={disabled}
        value={value}
        onChange={onChange}
        aria-label={ariaLabel}
        className={inputClass}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
        aria-label={visible ? "Hide password" : "Show password"}
        tabIndex={0}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
