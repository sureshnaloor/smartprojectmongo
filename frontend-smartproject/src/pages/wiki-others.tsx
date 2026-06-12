import { FolderOpen } from "lucide-react";
import { ProjectWikiRegister } from "@/components/project/project-wiki-register";

export default function WikiOthers() {
  return (
    <ProjectWikiRegister
      config={{
        title: "Others",
        subtitle: "Miscellaneous project wiki notes and records",
        apiPath: "wiki-others",
        Icon: FolderOpen,
        titleLabel: "Subject",
      }}
    />
  );
}
