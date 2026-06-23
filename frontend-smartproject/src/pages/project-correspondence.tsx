import { Mail } from "lucide-react";
import { DocumentLayout } from "@/components/project-documents/document-layout";
import { ProjectMailCorrespondence } from "@/components/project/project-mail-correspondence";

export default function ProjectCorrespondence() {
  return (
    <DocumentLayout activeTabKey="client">
      <div className="px-6 pb-8 lg:px-8 pt-6">
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
      </div>
    </DocumentLayout>
  );
}
