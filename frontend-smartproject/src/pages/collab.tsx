import { useRoute } from "wouter";
import CollabPageOld from "@/pages/collab-old";
import { ProjectCollabHub } from "@/components/collab-hub/project-collab-hub";

export default function CollabPage() {
  const [, projectParams] = useRoute<{ projectId: string }>("/projects/:projectId/collab");

  if (projectParams?.projectId) {
    return <ProjectCollabHub />;
  }

  return <CollabPageOld />;
}
