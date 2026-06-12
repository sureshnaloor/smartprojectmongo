-- Budget allocation version: null = not completed, 0 = version 0 allocated, 1+ = amendments
ALTER TABLE projects ADD COLUMN IF NOT EXISTS allocation_version INTEGER;
