-- Add currency column to activities table
ALTER TABLE activities
ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD';
 
-- Create an index on the currency column for faster lookups
CREATE INDEX idx_activities_currency ON activities(currency); 