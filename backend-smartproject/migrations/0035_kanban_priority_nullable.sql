-- Allow kanban priority to be unset (null) when cleared in UI
ALTER TABLE kanban_cards ALTER COLUMN priority DROP NOT NULL;
