import { HardHat } from "lucide-react";
import { ProjectMailCorrespondence } from "@/components/project/project-mail-correspondence";

export default function ProjectSubcontractCorrespondence() {
  return (
    <ProjectMailCorrespondence
      config={{
        title: "Subcontract Correspondence",
        subtitle: "Track Outlook and Gmail mail trails with subcontractors (same subject threads)",
        apiPath: "subcontract-correspondence",
        emptyTitle: "No subcontract mail trails yet",
        emptyHint:
          "Add an email subject and paste Outlook or Gmail conversation links for each message in the thread.",
        Icon: HardHat,
        iconClassName: "bg-purple-100 text-purple-600",
      }}
    />
  );
}
