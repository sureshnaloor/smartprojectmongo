import { LayoutList, FileText, Folder } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface ResourceMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Tab 1", href: "/resource-master", Icon: LayoutList },
  { label: "Tab 2", href: "/resource-master/tab2", Icon: FileText },
  { label: "Tab 3", href: "/resource-master/tab3", Icon: Folder },
];

export default function ResourceMasterLayout({ children }: ResourceMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-w-0">
        <GlobalToolsHeader hubTitle="Global resources hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
