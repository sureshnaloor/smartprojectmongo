import { Construction } from "lucide-react";

interface SectionPlaceholderProps {
  title: string;
}

export function SectionPlaceholder({ title }: SectionPlaceholderProps) {
  return (
    <section className="overflow-hidden rounded-lg border-2 border-amber-300 bg-white shadow-sm">
      <div className="border-b-2 border-amber-400 bg-amber-50 px-4 py-2">
        <h2 className="text-sm font-bold uppercase tracking-wide text-amber-900">{title}</h2>
      </div>
      <div className="flex flex-col items-center px-6 py-10 text-center">
        <Construction className="mb-3 h-12 w-12 text-amber-600" />
        <p className="text-lg font-semibold text-slate-900">{title} is under construction</p>
        <p className="mt-1 max-w-md text-sm text-slate-600">
          This section stays on the project page. The screen for {title.toLowerCase()} is not ready yet.
        </p>
      </div>
    </section>
  );
}
