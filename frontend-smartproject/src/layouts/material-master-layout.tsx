import { Package, Ruler, Layers, Folder, FileText, ClipboardList } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface MaterialMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Material Master", href: "/material-master", Icon: Package },
  { label: "UOM", href: "/material-master/uom", Icon: Ruler },
  { label: "Material Type", href: "/material-master/material-type", Icon: Layers },
  { label: "Material Group", href: "/material-master/material-group", Icon: Folder },
  { label: "Material PRs", href: "/material-master/purchase-requisitions", Icon: ClipboardList },
  { label: "Material POs", href: "/material-master/purchase-orders", Icon: FileText },
];

export default function MaterialMasterLayout({ children }: MaterialMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-w-0">
        <GlobalToolsHeader hubTitle="Global materials hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
