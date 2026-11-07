export interface LinkableProject {
  id: number;
  projectVersion?: string | null;
  mappedEstimationProjectId?: number | null;
  mappedPlanningProjectId?: number | null;
}

const VERSION_ORDER = ["estimation", "planning", "execution"];

/** Group projects that point at each other through estimation or planning links. */
export function groupLinkedProjects<T extends LinkableProject>(projects: T[]): T[][] {
  const ids = new Set(projects.map((project) => project.id));
  const parent = new Map<number, number>();

  const find = (id: number): number => {
    const current = parent.get(id) ?? id;
    if (current === id) return id;
    const root = find(current);
    parent.set(id, root);
    return root;
  };

  const union = (left: number, right: number) => {
    if (!ids.has(left) || !ids.has(right) || left === right) return;
    const leftRoot = find(left);
    const rightRoot = find(right);
    if (leftRoot !== rightRoot) parent.set(leftRoot, rightRoot);
  };

  for (const project of projects) parent.set(project.id, project.id);
  for (const project of projects) {
    if (project.mappedEstimationProjectId) union(project.id, project.mappedEstimationProjectId);
    if (project.mappedPlanningProjectId) union(project.id, project.mappedPlanningProjectId);
  }

  const groups = new Map<number, T[]>();
  for (const project of projects) {
    const root = find(project.id);
    const group = groups.get(root) ?? [];
    group.push(project);
    groups.set(root, group);
  }

  return [...groups.values()].map((group) =>
    [...group].sort((left, right) => {
      const leftOrder = VERSION_ORDER.indexOf(left.projectVersion || "execution");
      const rightOrder = VERSION_ORDER.indexOf(right.projectVersion || "execution");
      return (leftOrder === -1 ? 99 : leftOrder) - (rightOrder === -1 ? 99 : rightOrder);
    })
  );
}
