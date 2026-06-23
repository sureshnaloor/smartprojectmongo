import { MessageSquare } from "lucide-react";
import { DocumentLayout } from "@/components/project-documents/document-layout";
import { ProjectMailCorrespondence } from "@/components/project/project-mail-correspondence";

export default function ProjectInternalCorrespondence() {
  return (
    <DocumentLayout activeTabKey="internal">
      <div className="px-6 pb-8 lg:px-8 pt-6">
        <ProjectMailCorrespondence
          config={{
            title: "Internal Project Correspondence",
            subtitle: "Track internal team Outlook and Gmail mail trails on the same subject",
            apiPath: "internal-correspondence",
            emptyTitle: "No internal mail trails yet",
            emptyHint:
              "Add an email subject and paste Outlook or Gmail links for internal project team correspondence.",
            Icon: MessageSquare,
            iconClassName: "bg-emerald-100 text-emerald-600",
          }}
        />
      </div>
    </DocumentLayout>
  );
}
