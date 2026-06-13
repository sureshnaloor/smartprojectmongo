import { useQuery } from "@tanstack/react-query";

export interface CompanyProfile {
  companyName: string | null;
  companyAddress: string | null;
  companyLogoUrl: string | null;
}

async function fetchCompanyProfile(): Promise<CompanyProfile> {
  const res = await fetch("/api/global-defaults");
  if (!res.ok) throw new Error("Failed to load company profile");
  const data = await res.json();
  return {
    companyName: data.companyName ?? null,
    companyAddress: data.companyAddress ?? null,
    companyLogoUrl: data.companyLogoUrl ?? null,
  };
}

/** Global masters company profile — use on PO print and other company PDF layouts. */
export function useCompanyProfile(enabled = true) {
  return useQuery({
    queryKey: ["/api/global-defaults", "company-profile"],
    queryFn: fetchCompanyProfile,
    enabled,
    staleTime: 5 * 60 * 1000,
  });
}

export function formatCompanyAddress(address: string | null | undefined): string[] {
  if (!address?.trim()) return [];
  return address.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}
