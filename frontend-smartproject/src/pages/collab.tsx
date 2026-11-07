import { useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import CollabPageOld from "@/pages/collab-old";
import { ProjectCollabHub } from "@/components/collab-hub/project-collab-hub";

export default function CollabPage() {
  const [, setLocation] = useLocation();
  const [, projectParams] = useRoute<{ projectId: string }>("/projects/:projectId/collab");
  const [, threadParams] = useRoute<{ projectId: string }>("/projects/:projectId/collab/thread/:threadId");
  const projectId = projectParams?.projectId || threadParams?.projectId;

  useEffect(() => {
    if (projectId) return;
    const stored = sessionStorage.getItem("sp-active-project");
    if (stored) setLocation(`/projects/${stored}/collab`);
  }, [projectId, setLocation]);

  if (projectId) {
    return <ProjectCollabHub />;
  }

  return <CollabPageOld />;
}
