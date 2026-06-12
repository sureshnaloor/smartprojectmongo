import { Users, UserCog, Globe, Briefcase, Building, Award, Wrench, FileText } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface EmployeeMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Employee Master", href: "/employee-master", Icon: Users },
  { label: "Rental Manpower", href: "/employee-master/rental", Icon: UserCog },
  { label: "Rental Manpower POs", href: "/employee-master/rental-po", Icon: FileText },
  { label: "Nationality", href: "/employee-master/nationality", Icon: Globe },
  { label: "Title", href: "/employee-master/title", Icon: Briefcase },
  { label: "Position", href: "/employee-master/position", Icon: Building },
  { label: "Grade", href: "/employee-master/grade", Icon: Award },
  { label: "Trade", href: "/employee-master/trade", Icon: Wrench },
];

export default function EmployeeMasterLayout({ children }: EmployeeMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-w-0 text-zinc-900">
        <GlobalToolsHeader hubTitle="Global people hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
