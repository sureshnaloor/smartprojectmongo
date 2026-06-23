import { useEffect } from "react";
import { useParams, useLocation } from "wouter";

/** Redirect legacy /resources URL to the unified Materials & Resources hub. */
export default function ProjectResources() {
  const { projectId } = useParams();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (projectId) {
      setLocation(`/projects/${projectId}/materials-services/resources`);
    }
  }, [projectId, setLocation]);

  return null;
}
