import { FileDocumentsPage } from "@/components/project-documents/file-documents-page";
import { ITP_CONFIG } from "@/components/project-documents/constants";

export default function ProjectItpAndReports() {
  return <FileDocumentsPage config={ITP_CONFIG} />;
}
