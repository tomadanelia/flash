--flashcard table
create table if not exists flashcards(
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    front_text TEXT NOT NULL,
    back_text	TEXT NOT NULL,
    hint_text	TEXT	NULL,
    tags TEXT[] NULL DEFAULT '{}',
    current_bucket	INTEGER	NOT NULL DEFAULT 0,
    created_at	TIMESTAMPTZ	NOT NULL, DEFAULT now(),
    updated_at	TIMESTAMPTZ	NOT NULL, DEFAULT now()
)
--function for trigger to update updated_at column everytime something is updated on table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = now();
   RETURN NEW;
END;
$$ language 'plpgsql';
--trigger that uses that update_updated_at_column() function before every update
CREATE TRIGGER update_flashcards_updated_at
BEFORE UPDATE ON flashcards
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE flashcards IS 'Stores individual flashcard details and their current learning state.';
