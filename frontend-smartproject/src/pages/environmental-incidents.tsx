import { Leaf } from "lucide-react";
import { ProjectWikiRegister } from "@/components/project/project-wiki-register";

export default function EnvironmentalIncidents() {
  return (
    <ProjectWikiRegister
      config={{
        title: "Environmental Incidents Record",
        subtitle: "Log environmental incidents and follow-up actions",
        apiPath: "environmental-incidents",
        Icon: Leaf,
        titleLabel: "Incident",
        showLocation: true,
        showSeverity: true,
      }}
    />
  );
}
