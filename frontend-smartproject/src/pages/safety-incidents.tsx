import { ShieldAlert } from "lucide-react";
import { ProjectWikiRegister } from "@/components/project/project-wiki-register";

export default function SafetyIncidents() {
  return (
    <ProjectWikiRegister
      config={{
        title: "Safety Incidents Record",
        subtitle: "Log and track safety incidents on the project",
        apiPath: "safety-incidents",
        Icon: ShieldAlert,
        titleLabel: "Incident",
        showLocation: true,
        showSeverity: true,
      }}
    />
  );
}
