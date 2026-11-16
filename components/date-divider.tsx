type DateDividerProps = {
  date: string;
};

export function DateDivider({ date }: DateDividerProps) {
  const weekday = new Date(`${date.slice(0, 10)}T00:00:00`).toLocaleDateString('en-US', {
    weekday: 'short',
  });

  return (
    <div className="flex items-center gap-3 my-6 font-mono text-xs text-muted">
      <span className="tabular-nums">
        {date.slice(0, 10)} <span className="text-muted/70">{weekday.toLowerCase()}</span>
      </span>
      <div className="flex-1 h-px bg-line" />
    </div>
  );
}
