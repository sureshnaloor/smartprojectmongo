import { FileDocumentsPage } from "@/components/project-documents/file-documents-page";
import { DRAWINGS_CONFIG } from "@/components/project-documents/constants";

export default function ProjectDrawings() {
  return <FileDocumentsPage config={DRAWINGS_CONFIG} />;
}
