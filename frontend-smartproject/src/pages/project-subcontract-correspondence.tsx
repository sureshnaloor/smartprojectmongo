import { Users } from "lucide-react";
import { DocumentLayout } from "@/components/project-documents/document-layout";
import { ProjectMailCorrespondence } from "@/components/project/project-mail-correspondence";

export default function ProjectSubcontractCorrespondence() {
  return (
    <DocumentLayout activeTabKey="subcontract">
      <div className="px-6 pb-8 lg:px-8 pt-6">
        <ProjectMailCorrespondence
          config={{
            title: "Subcontract Correspondence",
            subtitle: "Track Outlook and Gmail mail trails with subcontractors (same subject threads)",
            apiPath: "subcontract-correspondence",
            emptyTitle: "No subcontract mail trails yet",
            emptyHint:
              "Add an email subject and paste Outlook or Gmail conversation links for each message in the thread.",
            Icon: Users,
            iconClassName: "bg-purple-100 text-purple-600",
          }}
        />
      </div>
    </DocumentLayout>
  );
}
