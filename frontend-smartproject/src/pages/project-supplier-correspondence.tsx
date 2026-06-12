import { Truck } from "lucide-react";
import { ProjectMailCorrespondence } from "@/components/project/project-mail-correspondence";

export default function ProjectSupplierCorrespondence() {
  return (
    <ProjectMailCorrespondence
      config={{
        title: "Supplier Correspondence",
        subtitle: "Track Outlook and Gmail mail trails with suppliers (same subject threads)",
        apiPath: "supplier-correspondence",
        emptyTitle: "No supplier mail trails yet",
        emptyHint:
          "Add an email subject and paste Outlook or Gmail conversation links for each message in the thread.",
        Icon: Truck,
        iconClassName: "bg-orange-100 text-orange-600",
      }}
    />
  );
}
