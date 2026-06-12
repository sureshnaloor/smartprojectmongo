-- Kanban: priority, optional WBS + project activity linkage
ALTER TABLE kanban_cards
  ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'normal';

ALTER TABLE kanban_cards
  ADD COLUMN IF NOT EXISTS wbs_item_id INTEGER REFERENCES wbs_items(id) ON DELETE SET NULL;

ALTER TABLE kanban_cards
  ADD COLUMN IF NOT EXISTS project_activity_id INTEGER REFERENCES project_activities(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_kanban_cards_wbs_lookup ON kanban_cards(project_id, wbs_item_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_activity_lookup ON kanban_cards(project_id, project_activity_id);
