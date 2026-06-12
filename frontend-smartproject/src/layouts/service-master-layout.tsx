import { Wrench, Ruler, Layers, Folder, FileText, ClipboardList } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface ServiceMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Service Master", href: "/service-master", Icon: Wrench },
  { label: "UOM", href: "/service-master/uom", Icon: Ruler },
  { label: "Service Type", href: "/service-master/service-type", Icon: Layers },
  { label: "Service Group", href: "/service-master/service-group", Icon: Folder },
  { label: "Service PRs", href: "/service-master/purchase-requisitions", Icon: ClipboardList },
  { label: "Service POs", href: "/service-master/purchase-orders", Icon: FileText },
];

export default function ServiceMasterLayout({ children }: ServiceMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-w-0">
        <GlobalToolsHeader hubTitle="Global services hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
