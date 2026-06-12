import { LayoutList, FileText, Folder } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface TaskMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Tab 1", href: "/task-master", Icon: LayoutList },
  { label: "Tab 2", href: "/task-master/tab2", Icon: FileText },
  { label: "Tab 3", href: "/task-master/tab3", Icon: Folder },
];

export default function TaskMasterLayout({ children }: TaskMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-w-0">
        <GlobalToolsHeader hubTitle="Global task hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
