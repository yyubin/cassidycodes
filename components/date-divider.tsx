type DateDividerProps = {
  date: string;
};

export function DateDivider({ date }: DateDividerProps) {
  const formattedDate = new Date(date).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  });

  return (
    <div className="flex items-center gap-4 my-6">
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
      <div className="text-sm font-medium text-gray-500 dark:text-gray-500 px-3">
        {formattedDate}
      </div>
      <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800"></div>
    </div>
  );
}
