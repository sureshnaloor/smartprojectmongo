import { Building2, Calendar, Globe } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface GlobalMastersLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Company", href: "/global-masters/company", Icon: Building2 },
  { label: "Regional & currency", href: "/global-masters/defaults", Icon: Globe },
  { label: "Work calendar", href: "/global-masters/calendar", Icon: Calendar },
];

export default function GlobalMastersLayout({ children }: GlobalMastersLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-w-0">
        <GlobalToolsHeader hubTitle="Global masters hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
