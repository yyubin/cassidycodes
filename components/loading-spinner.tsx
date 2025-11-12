export function LoadingSpinner() {
  return (
    <div className="flex justify-center items-center py-8">
      <div className="relative w-10 h-10">
        <div className="absolute top-0 left-0 w-full h-full border-4 border-gray-200 dark:border-gray-800 rounded-full"></div>
        <div className="absolute top-0 left-0 w-full h-full border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    </div>
  );
}
