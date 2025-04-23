-- Flashcards Table
-- Stores individual flashcard details and their current learning state.
CREATE TABLE IF NOT EXISTS flashcards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    front_text TEXT NOT NULL,
    back_text TEXT NOT NULL,
    hint_text TEXT NULL,
    tags TEXT[] NULL DEFAULT '{}',
    current_bucket INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for flashcards table updates
CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON flashcards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE flashcards IS 'Stores individual flashcard details and their current learning state.';

--------------------------------------------------

-- System State Table
-- Stores global application state, like the current practice day.
CREATE TABLE IF NOT EXISTS system_state (
    id INTEGER PRIMARY KEY,
    current_day INTEGER NOT NULL DEFAULT 0
);

-- Initialize the single row for system state
INSERT INTO system_state (id, current_day) VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE system_state IS 'Stores global application state, like the current practice day. Expects only one row with id=1.';

--------------------------------------------------

-- Practice History Table
-- Logs each practice attempt made by the user.
CREATE TABLE IF NOT EXISTS practice_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    flashcard_id UUID NOT NULL REFERENCES flashcards(id) ON DELETE CASCADE, -- Added FK & Cascade delete
    practiced_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    difficulty TEXT NOT NULL, -- 'Easy', 'Hard', 'Wrong'
    bucket_before INTEGER NOT NULL,
    bucket_after INTEGER NOT NULL
);

COMMENT ON TABLE practice_history IS 'Logs each practice attempt, linking back to the specific flashcard.';

-- Optional: Index on flashcard_id for faster lookups if needed later
-- CREATE INDEX IF NOT EXISTS idx_practice_history_flashcard_id ON practice_history(flashcard_id);
