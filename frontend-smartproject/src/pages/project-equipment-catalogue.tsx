import { FileDocumentsPage } from "@/components/project-documents/file-documents-page";
import { EQUIPMENT_CONFIG } from "@/components/project-documents/constants";

export default function ProjectEquipmentCatalogue() {
  return <FileDocumentsPage config={EQUIPMENT_CONFIG} />;
}
