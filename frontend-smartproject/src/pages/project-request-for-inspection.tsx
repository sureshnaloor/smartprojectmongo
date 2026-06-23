import { FileDocumentsPage } from "@/components/project-documents/file-documents-page";
import { RFI_CONFIG } from "@/components/project-documents/constants";

export default function ProjectRequestForInspection() {
  return <FileDocumentsPage config={RFI_CONFIG} />;
}
