import { Package, Ruler, Layers, Folder, FileText, ClipboardList } from "lucide-react";
import { GlobalMastersHubLayout } from "@/layouts/global-masters-hub-layout";
import { SecondaryMasterTabs } from "@/components/global-masters/secondary-master-tabs";

interface MaterialMasterLayoutProps {
  children: React.ReactNode;
}

const secondaryTabs = [
  { label: "Materials", href: "/material-master", Icon: Package },
  { label: "UOM", href: "/material-master/uom", Icon: Ruler },
  { label: "Material Type", href: "/material-master/material-type", Icon: Layers },
  { label: "Material Group", href: "/material-master/material-group", Icon: Folder },
  { label: "Material PRs", href: "/material-master/purchase-requisitions", Icon: ClipboardList },
  { label: "Material POs", href: "/material-master/purchase-orders", Icon: FileText },
];

export default function MaterialMasterLayout({ children }: MaterialMasterLayoutProps) {
  return (
    <GlobalMastersHubLayout secondaryTabs={<SecondaryMasterTabs tabs={secondaryTabs} />}>
      {children}
    </GlobalMastersHubLayout>
  );
}
