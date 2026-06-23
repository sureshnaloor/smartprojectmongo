import { FileDocumentsPage } from "@/components/project-documents/file-documents-page";
import { SCOPE_CONFIG } from "@/components/project-documents/constants";

export default function ProjectScope() {
  return <FileDocumentsPage config={SCOPE_CONFIG} />;
}
