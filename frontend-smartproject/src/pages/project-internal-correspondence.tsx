import { Users } from "lucide-react";
import { ProjectMailCorrespondence } from "@/components/project/project-mail-correspondence";

export default function ProjectInternalCorrespondence() {
  return (
    <ProjectMailCorrespondence
      config={{
        title: "Internal Project Correspondence",
        subtitle: "Track internal team Outlook and Gmail mail trails on the same subject",
        apiPath: "internal-correspondence",
        emptyTitle: "No internal mail trails yet",
        emptyHint:
          "Add an email subject and paste Outlook or Gmail links for internal project team correspondence.",
        Icon: Users,
        iconClassName: "bg-emerald-100 text-emerald-600",
      }}
    />
  );
}
