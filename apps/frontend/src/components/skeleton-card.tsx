export const SkeletonCard = () => (
  <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse">
    <div className="h-44 bg-gray-200" />
    <div className="p-4 space-y-3">
      <div className="h-4 bg-gray-200 rounded w-3/4" />
      <div className="h-3 bg-gray-200 rounded w-full" />
      <div className="h-3 bg-gray-200 rounded w-2/3" />
      <div className="flex items-center gap-1 mt-2">
        {[1,2,3,4,5].map(i => <div key={i} className="w-3.5 h-3.5 bg-gray-200 rounded-full" />)}
      </div>
      <div className="flex items-center justify-between mt-4">
        <div className="h-6 bg-gray-200 rounded w-20" />
        <div className="h-8 bg-gray-200 rounded-xl w-24" />
      </div>
    </div>
  </div>
);
