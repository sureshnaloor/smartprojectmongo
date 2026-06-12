import { HardHat } from "lucide-react";
import { ProjectWikiRegister } from "@/components/project/project-wiki-register";

export default function SafetyToolboxTalk() {
  return (
    <ProjectWikiRegister
      config={{
        title: "Daily Safety Toolbox Talk",
        subtitle: "Record daily safety toolbox talk topics and attendance notes",
        apiPath: "safety-toolbox-talk",
        Icon: HardHat,
        titleLabel: "Topic",
        descriptionLabel: "Discussion / key points",
        showLocation: true,
      }}
    />
  );
}
