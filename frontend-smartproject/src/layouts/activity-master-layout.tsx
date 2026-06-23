import { Activity, Ruler } from "lucide-react";
import { GlobalMastersHubLayout } from "@/layouts/global-masters-hub-layout";
import { SecondaryMasterTabs } from "@/components/global-masters/secondary-master-tabs";

interface ActivityMasterLayoutProps {
  children: React.ReactNode;
}

const secondaryTabs = [
  { label: "Activities", href: "/activity-master", Icon: Activity },
  { label: "UOM", href: "/activity-master/uom", Icon: Ruler },
];

export default function ActivityMasterLayout({ children }: ActivityMasterLayoutProps) {
  return (
    <GlobalMastersHubLayout secondaryTabs={<SecondaryMasterTabs tabs={secondaryTabs} />}>
      {children}
    </GlobalMastersHubLayout>
  );
}
