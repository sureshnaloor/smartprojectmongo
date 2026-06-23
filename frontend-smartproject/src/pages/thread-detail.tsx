import { useRoute } from "wouter";
import ThreadDetailOld from "@/pages/thread-detail-old";
import { ProjectCollabHub } from "@/components/collab-hub/project-collab-hub";

export default function ThreadDetail() {
  const [, projectParams] = useRoute<{ projectId: string; threadId: string }>(
    "/projects/:projectId/collab/thread/:threadId"
  );

  if (projectParams?.projectId) {
    const threadId = parseInt(projectParams.threadId, 10);
    return <ProjectCollabHub initialThreadId={Number.isNaN(threadId) ? undefined : threadId} />;
  }

  return <ThreadDetailOld />;
}
