export default function Loading({ label = "MOUNTING LEDGER" }: { label?: string }) {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="text-[13px] uppercase tracking-[0.14em]">
        &gt; {label}
        <span className="animate-pulse">█</span>
      </div>
    </div>
  );
}
