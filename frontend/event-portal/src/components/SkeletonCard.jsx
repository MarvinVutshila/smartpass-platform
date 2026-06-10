export default function SkeletonCard() {
  return (
    <div className="card overflow-hidden animate-pulse">
      <div className="skeleton h-44 w-full" />
      <div className="p-5 space-y-3">
        <div className="skeleton h-4 w-3/4 rounded-full" />
        <div className="skeleton h-3 w-1/2 rounded-full" />
        <div className="skeleton h-3 w-2/3 rounded-full" />
        <div className="skeleton h-9 w-full rounded-xl mt-4" />
      </div>
    </div>
  );
}
