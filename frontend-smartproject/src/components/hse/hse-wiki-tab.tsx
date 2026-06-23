import { ProjectWikiRegister, type WikiRegisterConfig } from "@/components/project/project-wiki-register";

export function HseWikiTab({ config }: { config: WikiRegisterConfig }) {
  return (
    <div className="hse-tab-fade">
      <ProjectWikiRegister config={config} />
    </div>
  );
}
