import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, HardHat, Leaf, FolderOpen } from "lucide-react";
import { HseSubTabs } from "@/components/hse/hse-sub-tabs";
import { RiskRegisterTab } from "@/components/hse/risk-register-tab";
import { HseLessonTab } from "@/components/hse/hse-lesson-tab";
import { HseWikiTab } from "@/components/hse/hse-wiki-tab";
import type { HseTabId } from "@/components/hse/constants";
import { useMobile } from "@/hooks/use-mobile";
import type { WikiRecord } from "@/components/project/project-wiki-register";

export default function RiskRegister() {
  const { projectId } = useParams();
  const isMobile = useMobile();
  const [activeTab, setActiveTab] = useState<HseTabId>("risk");
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const check = () => setNarrow(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const { data: risks = [] } = useQuery<unknown[]>({
    queryKey: [`/api/projects/${projectId}/risk-register`],
  });

  const { data: safetyData = [] } = useQuery<WikiRecord[]>({
    queryKey: [`/api/projects/${projectId}/safety-incidents`],
  });

  const openSafety = safetyData.filter((r) => r.status === "Open" || r.status === "In Progress").length;

  return (
    <div className="flex flex-col min-h-full bg-[var(--bg-cream)]">
      <HseSubTabs
        active={activeTab}
        onChange={setActiveTab}
        badges={{ risks: risks.length, openSafety: openSafety || undefined }}
        safetyPulse={openSafety > 0}
        collapsed={narrow || isMobile}
      />

      {activeTab === "risk" && <RiskRegisterTab />}

      {activeTab === "lesson" && <HseLessonTab />}

      {activeTab === "safety" && (
        <HseWikiTab
          config={{
            title: "Safety Incidents",
            subtitle: "Log and track safety incidents on the project",
            apiPath: "safety-incidents",
            Icon: ShieldAlert,
            titleLabel: "Incident",
            showLocation: true,
            showSeverity: true,
          }}
        />
      )}

      {activeTab === "toolbox" && (
        <HseWikiTab
          config={{
            title: "Toolbox Talks",
            subtitle: "Record safety toolbox talk topics and attendance notes",
            apiPath: "safety-toolbox-talk",
            Icon: HardHat,
            titleLabel: "Topic",
            descriptionLabel: "Discussion / key points",
            showLocation: true,
          }}
        />
      )}

      {activeTab === "environmental" && (
        <HseWikiTab
          config={{
            title: "Environmental Incidents",
            subtitle: "Track environmental incidents and corrective actions",
            apiPath: "environmental-incidents",
            Icon: Leaf,
            titleLabel: "Incident",
            showLocation: true,
            showSeverity: true,
          }}
        />
      )}

      {activeTab === "others" && (
        <HseWikiTab
          config={{
            title: "Others",
            subtitle: "Additional HSE and project wiki records",
            apiPath: "wiki-others",
            Icon: FolderOpen,
            titleLabel: "Record",
          }}
        />
      )}
    </div>
  );
}
