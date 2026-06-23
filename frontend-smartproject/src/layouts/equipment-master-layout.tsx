import { Cog, Truck, Factory, Settings, FileText, ClipboardList } from "lucide-react";
import { GlobalMastersHubLayout } from "@/layouts/global-masters-hub-layout";
import { SecondaryMasterTabs } from "@/components/global-masters/secondary-master-tabs";

interface EquipmentMasterLayoutProps {
  children: React.ReactNode;
}

const secondaryTabs = [
  { label: "Equipment", href: "/equipment-master", Icon: Cog },
  { label: "Rental Equipment", href: "/equipment-master/rental", Icon: Truck },
  { label: "Rental Equipment PRs", href: "/equipment-master/rental-pr", Icon: ClipboardList },
  { label: "Rental Equipment POs", href: "/equipment-master/rental-po", Icon: FileText },
  { label: "Manufacturer / OEM", href: "/equipment-master/manufacturers", Icon: Factory },
  { label: "Equipment Type", href: "/equipment-master/equipment-types", Icon: Settings },
];

export default function EquipmentMasterLayout({ children }: EquipmentMasterLayoutProps) {
  return (
    <GlobalMastersHubLayout secondaryTabs={<SecondaryMasterTabs tabs={secondaryTabs} />}>
      {children}
    </GlobalMastersHubLayout>
  );
}
