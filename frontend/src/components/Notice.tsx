import { AlertCircle, CheckCircle2, X } from "lucide-react";

export const Notice = ({
  message,
  onDismiss,
  success = false,
}: {
  message: string;
  onDismiss?: () => void;
  success?: boolean;
}) => (
  <div className={`notice ${success ? "notice-success" : "notice-error"}`} role={success ? "status" : "alert"}>
    {success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
    <span>{message}</span>
    {onDismiss && <button className="ml-auto rounded p-1 hover:bg-black/5" onClick={onDismiss} aria-label="Dismiss"><X size={16} /></button>}
  </div>
);
