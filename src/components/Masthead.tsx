export default function Masthead({
  title,
  subtitle,
  compact,
}: {
  title: string;
  subtitle?: string;
  compact?: boolean;
}) {
  return (
    <header className={`text-center ${compact ? "pt-3 pb-1" : "pt-10 pb-4"}`}>
      <h1
        className={`glitch select-none ${compact ? "text-3xl md:text-4xl" : "text-5xl md:text-6xl"}`}
        aria-label={title}
      >
        {title}
      </h1>
      {subtitle && (
        <div className="mt-5 text-[11px] tracking-[0.34em] font-semibold uppercase">{subtitle}</div>
      )}
    </header>
  );
}
