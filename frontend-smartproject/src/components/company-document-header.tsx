import { formatCompanyAddress, type CompanyProfile } from "@/lib/company-profile";

interface CompanyDocumentHeaderProps {
  profile: CompanyProfile | undefined;
  documentTitle: string;
  documentSubtitle?: string;
  rightContent?: React.ReactNode;
  className?: string;
}

/** Reusable letterhead for PO print and future company PDF documents. */
export function CompanyDocumentHeader({
  profile,
  documentTitle,
  documentSubtitle,
  rightContent,
  className = "",
}: CompanyDocumentHeaderProps) {
  const name = profile?.companyName?.trim() || "Company";
  const addressLines = formatCompanyAddress(profile?.companyAddress);
  const logoUrl = profile?.companyLogoUrl;

  return (
    <div className={`flex justify-between items-start border-b-2 border-zinc-900 pb-4 mb-6 gap-6 ${className}`}>
      <div className="flex items-start gap-4 min-w-0">
        {logoUrl ? (
          <img
            src={logoUrl}
            alt={`${name} logo`}
            className="h-14 w-14 sm:h-16 sm:w-16 object-contain shrink-0 rounded border border-zinc-200 bg-white p-1"
          />
        ) : (
          <div className="h-14 w-14 sm:h-16 sm:w-16 shrink-0 rounded border border-dashed border-zinc-300 bg-zinc-50 flex items-center justify-center text-[10px] text-zinc-400 uppercase tracking-wide text-center px-1">
            Logo
          </div>
        )}
        <div className="min-w-0">
          <p className="font-bold text-base sm:text-lg text-zinc-900 leading-tight">{name}</p>
          {addressLines.length > 0 ? (
            <div className="mt-1 text-xs sm:text-sm text-zinc-600 leading-relaxed">
              {addressLines.map((line, i) => (
                <p key={i}>{line}</p>
              ))}
            </div>
          ) : null}
        </div>
      </div>
      <div className="text-right shrink-0">
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-900">{documentTitle}</h1>
        {documentSubtitle ? (
          <p className="text-sm text-zinc-600 mt-1">{documentSubtitle}</p>
        ) : null}
        {rightContent ? <div className="mt-2 text-sm">{rightContent}</div> : null}
      </div>
    </div>
  );
}
