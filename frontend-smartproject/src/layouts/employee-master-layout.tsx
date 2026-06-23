import { Users, UserCog, Globe, Briefcase, Building, Award, Wrench, FileText } from "lucide-react";
import { GlobalMastersHubLayout } from "@/layouts/global-masters-hub-layout";
import { SecondaryMasterTabs } from "@/components/global-masters/secondary-master-tabs";

interface EmployeeMasterLayoutProps {
  children: React.ReactNode;
}

const secondaryTabs = [
  { label: "Employees", href: "/employee-master", Icon: Users },
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
    <GlobalMastersHubLayout secondaryTabs={<SecondaryMasterTabs tabs={secondaryTabs} />}>
      {children}
    </GlobalMastersHubLayout>
  );
}
