import { Activity, Ruler } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface ActivityMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Activity Master", href: "/activity-master", Icon: Activity },
  { label: "UOM", href: "/activity-master/uom", Icon: Ruler },
];

export default function ActivityMasterLayout({ children }: ActivityMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-w-0">
        <GlobalToolsHeader hubTitle="Global activity hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
