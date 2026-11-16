import { AlertCircleIcon, CheckIcon, XIcon } from "./Icons";

export type ToastTone = "success" | "error";

export interface ToastData {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

export interface ToastProps {
  toast: ToastData | null;
  onDismiss: () => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  if (!toast) return null;

  const isError = toast.tone === "error";

  return (
    <div className="ui-toast-viewport no-print" aria-live={isError ? "assertive" : "polite"}>
      <div
        key={toast.id}
        role={isError ? "alert" : "status"}
        className={`ui-toast ui-toast--${toast.tone}`}
      >
        <span className="ui-toast-icon" aria-hidden="true">
          {isError ? <AlertCircleIcon size={17} /> : <CheckIcon size={17} />}
        </span>
        <div className="ui-toast-body">
          <p className="ui-toast-title">{toast.title}</p>
          {toast.description && <p className="ui-toast-desc">{toast.description}</p>}
        </div>
        <button
          type="button"
          className="ui-toast-close"
          onClick={onDismiss}
          aria-label="Dismiss notification"
        >
          <XIcon size={14} />
        </button>
      </div>
    </div>
  );
}
