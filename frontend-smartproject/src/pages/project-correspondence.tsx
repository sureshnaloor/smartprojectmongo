import { Mail } from "lucide-react";
import { ProjectMailCorrespondence } from "@/components/project/project-mail-correspondence";

export default function ProjectCorrespondence() {
  return (
    <ProjectMailCorrespondence
      config={{
        title: "Client Correspondence",
        subtitle: "Track Outlook and Gmail mail trails with the client (same subject threads)",
        apiPath: "correspondence",
        emptyTitle: "No client mail trails yet",
        emptyHint:
          "Add an email subject and paste Outlook or Gmail conversation links for each message in the thread.",
        Icon: Mail,
        iconClassName: "bg-blue-100 text-blue-600",
      }}
    />
  );
}
