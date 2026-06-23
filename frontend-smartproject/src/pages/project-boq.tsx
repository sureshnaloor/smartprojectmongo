import { FileDocumentsPage } from "@/components/project-documents/file-documents-page";
import { BOQ_CONFIG } from "@/components/project-documents/constants";

export default function ProjectBoq() {
  return <FileDocumentsPage config={BOQ_CONFIG} />;
}
