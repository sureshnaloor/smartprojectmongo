import { Wrench, Ruler, Layers, Folder, FileText, ClipboardList } from "lucide-react";
import { GlobalMastersHubLayout } from "@/layouts/global-masters-hub-layout";
import { SecondaryMasterTabs } from "@/components/global-masters/secondary-master-tabs";

interface ServiceMasterLayoutProps {
  children: React.ReactNode;
}

const secondaryTabs = [
  { label: "Services", href: "/service-master", Icon: Wrench },
  { label: "UOM", href: "/service-master/uom", Icon: Ruler },
  { label: "Service Type", href: "/service-master/service-type", Icon: Layers },
  { label: "Service Group", href: "/service-master/service-group", Icon: Folder },
  { label: "Service PRs", href: "/service-master/purchase-requisitions", Icon: ClipboardList },
  { label: "Service POs", href: "/service-master/purchase-orders", Icon: FileText },
];

export default function ServiceMasterLayout({ children }: ServiceMasterLayoutProps) {
  return (
    <GlobalMastersHubLayout secondaryTabs={<SecondaryMasterTabs tabs={secondaryTabs} />}>
      {children}
    </GlobalMastersHubLayout>
  );
}
