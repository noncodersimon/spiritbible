-- Create reader_patch table for small, reversible replacements per verse
CREATE TABLE IF NOT EXISTS reader_patch (
  id INTEGER PRIMARY KEY,
  book TEXT NOT NULL,
  chapter INTEGER NOT NULL,
  verse INTEGER NOT NULL,
  start INTEGER NOT NULL,     -- 0-based char index (inclusive)
  end INTEGER NOT NULL,       -- 0-based char index (exclusive)
  replacement TEXT NOT NULL,
  reason TEXT,                -- 'UK spelling' | 'idiom' | 'punctuation' | ...
  status TEXT DEFAULT 'draft',-- 'draft' | 'approved' | 'rejected'
  provenance TEXT,            -- 'script' | 'human' | 'agent'
  created_at TEXT DEFAULT (datetime('now'))
);

-- Extend note with simple provenance fields (safe to run even if columns exist)
ALTER TABLE note ADD COLUMN kind TEXT;         -- 'translation'|'lexical'|'doctrinal'|'intertext'|'cultural'
ALTER TABLE note ADD COLUMN sources TEXT;      -- JSON string with citations
ALTER TABLE note ADD COLUMN provenance TEXT;   -- 'human'|'agent';
