-- Kanban board: project-scoped cards in columns wish, ready, doing, done.
-- archived_at set when card is archived from Done (removed from board).
CREATE TABLE IF NOT EXISTS kanban_cards (
  id SERIAL PRIMARY KEY,
  project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  "column" TEXT NOT NULL DEFAULT 'wish',
  position INTEGER NOT NULL DEFAULT 0,
  archived_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_kanban_cards_project_id ON kanban_cards(project_id);
CREATE INDEX IF NOT EXISTS idx_kanban_cards_project_archived ON kanban_cards(project_id, archived_at);
