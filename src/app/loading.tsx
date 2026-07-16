export default function Loading() {
  return (
    <div className="flex h-[calc(95vh-106px)] items-center justify-center overflow-auto">
      <div
        className="h-20 w-20 animate-spin rounded-full border-4 border-solid border-current border-e-transparent text-gray-500 motion-reduce:animate-[spin_1.5s_linear_infinite]"
        role="status"
      >
        <span className="absolute -m-px h-px w-px overflow-hidden whitespace-nowrap border-0 p-0 [clip:rect(0,0,0,0)]">
          Loading
        </span>
      </div>
      <span className="ml-6 text-2xl font-bold text-gray-500">Loading...</span>
    </div>
  );
}
