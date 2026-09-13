export default function Loading() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <div className="w-8 h-8 border-2 border-[#E5E7EB] border-t-[#1E40AF] rounded-full animate-spin" />
        <p className="text-sm text-[#64748B]">Loading...</p>
      </div>
    </div>
  );
}
