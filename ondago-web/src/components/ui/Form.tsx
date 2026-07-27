import React from "react";
import s from "./Form.module.css";

interface BaseFieldProps {
  label?: React.ReactNode;
  /** Renders the required marker and sets the underlying `required` attribute. */
  required?: boolean;
  /** Helper text below the control. Hidden while an error is showing. */
  hint?: React.ReactNode;
  /** Validation message — also flips the control into its invalid style. */
  error?: React.ReactNode;
}

let uid = 0;
function useFieldId(explicit?: string) {
  // Stable across renders; only used to wire label/aria to the control.
  const [id] = React.useState(() => explicit ?? `f${++uid}`);
  return id;
}

function Wrapper({
  id,
  label,
  required,
  hint,
  error,
  children,
}: BaseFieldProps & { id: string; children: React.ReactNode }) {
  return (
    <div className={s.group}>
      {label && (
        <label className={s.label} htmlFor={id}>
          {label}
          {required && (
            <span className={s.req} aria-hidden="true">
              *
            </span>
          )}
        </label>
      )}
      {children}
      {error ? (
        <span className={s.error} id={`${id}-err`} role="alert">
          {error}
        </span>
      ) : (
        hint && <span className={s.hint}>{hint}</span>
      )}
    </div>
  );
}

export type FieldProps = BaseFieldProps &
  Omit<React.InputHTMLAttributes<HTMLInputElement>, "className">;

/** Labelled text input. Replaces the `input` style redefined on 8 pages. */
export function Field({ label, required, hint, error, id, ...rest }: FieldProps) {
  const fid = useFieldId(id);
  return (
    <Wrapper id={fid} label={label} required={required} hint={hint} error={error}>
      <input
        {...rest}
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : undefined}
        className={[s.control, error ? s.invalid : ""].filter(Boolean).join(" ")}
      />
    </Wrapper>
  );
}

export type TextareaProps = BaseFieldProps &
  Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "className">;

export function Textarea({ label, required, hint, error, id, ...rest }: TextareaProps) {
  const fid = useFieldId(id);
  return (
    <Wrapper id={fid} label={label} required={required} hint={hint} error={error}>
      <textarea
        {...rest}
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : undefined}
        className={[s.control, s.textarea, error ? s.invalid : ""].filter(Boolean).join(" ")}
      />
    </Wrapper>
  );
}

export type SelectProps = BaseFieldProps &
  Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "className"> & {
    options?: { value: string; label: string }[];
  };

export function Select({ label, required, hint, error, id, options, children, ...rest }: SelectProps) {
  const fid = useFieldId(id);
  return (
    <Wrapper id={fid} label={label} required={required} hint={hint} error={error}>
      <select
        {...rest}
        id={fid}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={error ? `${fid}-err` : undefined}
        className={[s.control, s.select, error ? s.invalid : ""].filter(Boolean).join(" ")}
      >
        {options
          ? options.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))
          : children}
      </select>
    </Wrapper>
  );
}

/** Responsive row of fields — stacks automatically on narrow viewports. */
export function FormRow({ children }: { children: React.ReactNode }) {
  return <div className={s.row}>{children}</div>;
}
