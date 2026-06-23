import { FileDocumentsPage } from "@/components/project-documents/file-documents-page";
import { OTHER_DOCS_CONFIG } from "@/components/project-documents/constants";

export default function ProjectOtherDocuments() {
  return <FileDocumentsPage config={OTHER_DOCS_CONFIG} />;
}
