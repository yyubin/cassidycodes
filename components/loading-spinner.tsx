export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center gap-2 py-8 font-mono text-xs text-muted" role="status">
      <span className="w-3 h-3 border-2 border-line border-t-accent rounded-full animate-spin" aria-hidden="true" />
      loading…
    </div>
  );
}
