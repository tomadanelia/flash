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

CREATE OR REPLACE FUNCTION get_practice_cards(practice_day bigint)
RETURNS TABLE(id uuid, front_text text, back_text text, hint_text text, tags text[])
LANGUAGE plpgsql
set search_path=public
AS $$
BEGIN
  -- The core query logic from the specification
  RETURN QUERY
  SELECT
    f.id,
    f.front_text,
    f.back_text,
    f.hint_text,
    f.tags
  FROM
    public.flashcards f -- Explicitly reference the public schema
  WHERE
    f.current_bucket = 0
    OR (
      f.current_bucket > 0
      AND practice_day % CAST(POW(2, f.current_bucket) AS bigint) = 0
    );
END;
$$;

COMMENT ON FUNCTION get_practice_cards(bigint) IS 'Retrieves flashcards due for practice on a specific day based on their current bucket and the Modified-Leitner algorithm.';



CREATE OR REPLACE FUNCTION get_cards_per_bucket()
RETURNS TABLE(bucket_number int, card_count bigint)
LANGUAGE sql
AS $$
    SELECT
        f.current_bucket::int as bucket_number,
        COUNT(f.id)::bigint as card_count
    FROM
        public.flashcards f
    GROUP BY
        f.current_bucket
    ORDER BY
        bucket_number;
$$;

COMMENT ON FUNCTION get_cards_per_bucket() IS 'Returns the count of flashcards grouped by their current bucket number.';


    CREATE OR REPLACE FUNCTION count_cards_due_today(practice_day bigint)
    RETURNS bigint
    LANGUAGE sql
    AS $$
        SELECT COUNT(f.id)::bigint
        FROM public.flashcards f
        WHERE f.current_bucket = 0
          OR (
               f.current_bucket > 0
               AND practice_day % CAST(POW(2, f.current_bucket) AS bigint) = 0
             );
    $$;

    COMMENT ON FUNCTION count_cards_due_today(bigint) IS 'Counts flashcards due for practice on a specific day based on the Modified-Leitner algorithm.';
    

    
CREATE OR REPLACE FUNCTION get_recall_accuracy_stats(
    start_date text, -- Expected 'YYYY-MM-DD'
    end_date text   -- Expected 'YYYY-MM-DD'
)
RETURNS TABLE(difficulty text, attempt_count bigint)
LANGUAGE sql
SET search_path = public
AS $$
    SELECT
        ph.difficulty,
        COUNT(ph.id)::bigint as attempt_count
    FROM
        public.practice_history ph
    WHERE
        -- Convert input dates to timestamps and ensure range is inclusive
        -- Start date is inclusive from the beginning of the day
        -- End date is inclusive until the very end of the day
        ph.practiced_at >= start_date::timestamptz
        AND ph.practiced_at < (end_date::date + interval '1 day')::timestamptz
    GROUP BY
        ph.difficulty;
$$;

COMMENT ON FUNCTION get_recall_accuracy_stats(text, text) IS 'Returns counts of practice attempts grouped by difficulty within a specified date range (inclusive).';

