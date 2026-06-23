export function HseLessonTab() {
  return (
    <div className="hse-tab-fade flex min-h-[400px] flex-col items-center justify-center px-6 py-12 text-center">
      <h2 className="hse-display-md text-[var(--text-primary)] mb-2">Lessons Learned</h2>
      <p className="kanban-body-sm text-[var(--text-secondary)] max-w-lg mb-6">
        Track process, technical, and safety lessons with categories, source links, and recommended actions.
        Full lesson register is available at the dedicated lesson learnt route.
      </p>
      <p className="kanban-caption text-[var(--text-muted)]">
        Use the sidebar Lesson Learnt link for the complete register, or switch tabs here once integrated.
      </p>
    </div>
  );
}
