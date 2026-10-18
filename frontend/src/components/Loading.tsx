export const Loading = ({ label = "Loading" }: { label?: string }) => (
  <div className="flex min-h-48 items-center justify-center gap-3 text-sm text-slate-500" role="status">
    <span className="spinner" />
    {label}…
  </div>
);
