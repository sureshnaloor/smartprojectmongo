import { Cog, Truck, Factory, Settings, FileText, ClipboardList } from "lucide-react";
import MasterLayout from "@/layouts/master-layout";
import { GlobalToolsHeader } from "@/components/global-tools-header";

interface EquipmentMasterLayoutProps {
  children: React.ReactNode;
}

const tabs = [
  { label: "Equipment Master", href: "/equipment-master", Icon: Cog },
  { label: "Rental Equipment", href: "/equipment-master/rental", Icon: Truck },
  { label: "Rental Equipment PRs", href: "/equipment-master/rental-pr", Icon: ClipboardList },
  { label: "Rental Equipment POs", href: "/equipment-master/rental-po", Icon: FileText },
  { label: "Manufacturer / OEM", href: "/equipment-master/manufacturers", Icon: Factory },
  { label: "Equipment Type", href: "/equipment-master/equipment-types", Icon: Settings },
];

export default function EquipmentMasterLayout({ children }: EquipmentMasterLayoutProps) {
  return (
    <MasterLayout>
      <div className="flex flex-col h-full min-h-0 min-w-0 text-zinc-900 w-full">
        <GlobalToolsHeader hubTitle="Global equipment hub" tabs={tabs} />
        <div className="flex-1 overflow-auto min-h-0 min-w-0">{children}</div>
      </div>
    </MasterLayout>
  );
}
