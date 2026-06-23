import { Building2, Globe, MapPin } from "lucide-react";
import { GlobalMastersHubLayout } from "@/layouts/global-masters-hub-layout";
import { SecondaryMasterTabs } from "@/components/global-masters/secondary-master-tabs";

interface VendorMasterLayoutProps {
  children: React.ReactNode;
}

const secondaryTabs = [
  { label: "Vendors", href: "/vendor-master", Icon: Building2 },
  { label: "Country", href: "/vendor-master/country", Icon: Globe },
  { label: "City", href: "/vendor-master/city", Icon: MapPin },
];

export default function VendorMasterLayout({ children }: VendorMasterLayoutProps) {
  return (
    <GlobalMastersHubLayout secondaryTabs={<SecondaryMasterTabs tabs={secondaryTabs} />}>
      {children}
    </GlobalMastersHubLayout>
  );
}
