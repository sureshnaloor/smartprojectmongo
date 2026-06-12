import { useParams } from "wouter";

export default function ProjectCollabPage3() {
  const { projectId } = useParams();
  return (
    <div className="flex items-center justify-center h-full">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Coming Soon</h2>
        <p className="text-gray-600">This page is under construction for project {projectId}.</p>
      </div>
    </div>
  );
}

