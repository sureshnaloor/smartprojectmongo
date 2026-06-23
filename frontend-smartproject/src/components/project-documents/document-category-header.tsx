interface DocumentCategoryHeaderProps {
  title: string;
  subtitle: string;
  projectName?: string;
}

export function DocumentCategoryHeader({ title, subtitle, projectName }: DocumentCategoryHeaderProps) {
  return (
    <div
      className="mb-6 flex flex-col gap-4 rounded-[var(--radius-md)] border bg-[var(--bg-white)] p-6 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: "var(--border-subtle)" }}
    >
      <div>
        <h2 className="hse-display-md" style={{ color: "var(--copper-500)" }}>
          {title}
        </h2>
        <p className="kanban-body-md text-[var(--text-secondary)] mt-1">{subtitle}</p>
      </div>
      {projectName && (
        <div
          className="inline-flex items-center gap-2 rounded-full border px-4 py-2 shrink-0"
          style={{ backgroundColor: "var(--bg-warm-gray)", borderColor: "var(--border-subtle)" }}
        >
          <span className="kanban-caption uppercase tracking-wide text-[var(--text-muted)]">Project</span>
          <span className="kanban-body-sm font-medium text-[var(--text-primary)]">{projectName}</span>
        </div>
      )}
    </div>
  );
}
