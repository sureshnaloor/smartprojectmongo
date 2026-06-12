import { Building2, Globe, MapPin } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface VendorMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Vendors", href: "/vendor-master", Icon: Building2 },
  { label: "Country", href: "/vendor-master/country", Icon: Globe },
  { label: "City", href: "/vendor-master/city", Icon: MapPin },
];

export default function VendorMasterLayout({ children }: VendorMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-w-0">
        <GlobalToolsHeader hubTitle="Global vendors hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
