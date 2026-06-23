import { Hammer, Factory, Layers, Box, FileText, ClipboardList } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface ToolMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Tool Master", href: "/tool-master", Icon: Hammer },
  { label: "Manufacturer", href: "/tool-master/manufacturers", Icon: Factory },
  { label: "Models", href: "/tool-master/models", Icon: Box },
  { label: "Tool Type", href: "/tool-master/tool-types", Icon: Layers },
  { label: "Tool PRs", href: "/tool-master/purchase-requisitions", Icon: ClipboardList },
  { label: "Tool POs", href: "/tool-master/purchase-orders", Icon: FileText },
];

export default function ToolMasterLayout({ children }: ToolMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-h-0 min-w-0 w-full text-[var(--text-primary)]">
        <GlobalToolsHeader hubTitle="Global tools hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-h-0 min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
