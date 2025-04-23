Okay, here is a comprehensive specification document compiling our discussion. It covers the architecture, database schema, feature details, API endpoints, error handling, and a testing approach, ready for a developer.

Project Specification: Enhanced Flashcard System

Version: 1.0
Date: 2024-08-28

Based on: Iterative discussion and refinement (40 questions answered).

1. Overview

This project enhances an existing Modified-Leitner flashcard system. The core goals are:

Browser Extension Card Creation: Allow users to create flashcards directly from web pages by highlighting text.

Hand Gesture Input: Enable users to rate flashcard difficulty during practice using webcam-detected hand gestures (Thumbs Up/Down, Flat Hand).

Persistent Storage: Migrate flashcard data, bucket assignments, and practice history to a persistent database (Supabase).

Progress Tracking: Implement an API endpoint to provide detailed learning progress statistics.

2. Architecture Decisions

Database as Source of Truth: The database (Supabase) will be the single, authoritative source for all flashcard data, user progress (current_day), and practice history. The backend application will not rely on potentially stale in-memory state (except for configuration or short-lived request data).

Direct Database Queries: The backend API endpoints will query the database directly as needed for each request, rather than implementing a complex caching layer initially.

Stateless Backend (as much as possible): By relying on the database, the backend aims to be relatively stateless regarding core flashcard data, simplifying scaling and robustness.

3. Database Schema (Supabase)

3.1. flashcards Table

Stores individual flashcard details and their current learning state.

Column Name	Data Type	Constraints	Description
id	UUID	PRIMARY KEY, DEFAULT gen_random_uuid()	Unique identifier for the flashcard.
front_text	TEXT	NOT NULL	Text content for the front of the card.
back_text	TEXT	NOT NULL	Text content for the back of the card.
hint_text	TEXT	NULL	Optional hint text for the card.
tags	TEXT[]	NULL (or DEFAULT {})	Optional array of text tags associated with card.
current_bucket	INTEGER	NOT NULL, DEFAULT 0	Current bucket number in Modified-Leitner system.
created_at	TIMESTAMPTZ	NOT NULL, DEFAULT now()	Timestamp when the card was created.
updated_at	TIMESTAMPTZ	NOT NULL, DEFAULT now()	Timestamp when the card was last updated.

(Note: Consider adding updated_at trigger)

3.2. system_state Table

Stores global application state, like the current practice day.

Column Name	Data Type	Constraints	Description
id	INTEGER	PRIMARY KEY (Value: 1)	Fixed identifier for the single state row.
current_day	INTEGER	NOT NULL, DEFAULT 0	Current day number for practice scheduling.

3.3. practice_history Table

Logs each practice attempt made by the user.

Column Name	Data Type	Constraints	Description
id	UUID	PRIMARY KEY, DEFAULT gen_random_uuid()	Unique identifier for this practice record.
flashcard_id	UUID	NOT NULL, REFERENCES flashcards(id)	Foreign key linking to the practiced flashcard.
practiced_at	TIMESTAMPTZ	NOT NULL, DEFAULT now()	Timestamp when the practice occurred.
difficulty	TEXT	NOT NULL	User's answer difficulty ('Easy', 'Hard', 'Wrong').
bucket_before	INTEGER	NOT NULL	Bucket number before this practice attempt.
bucket_after	INTEGER	NOT NULL	Bucket number after this practice attempt.

(Note: Difficulty is stored as text; backend needs to convert to/from internal numeric enum if used).

4. Feature Specifications

4.1. Browser Extension: Card Creation & Update

Trigger: User highlights text on a webpage. A green "Create Flashcard" button appears near the highlight, or the user uses a defined keyboard shortcut.

Pop-up Window:

Appears upon trigger.

Back field: Pre-filled with the highlighted text (user can edit).

Front field: Empty, required.

Hint field: Optional text input.

Tags field: Optional text input, placeholder "Enter tags, separated by commas". User types tags separated by commas.

Save button.

Cancel button (closes pop-up).

Area below buttons for success/error messages.

Create Flow (First Save):

User fills Front (and optionally Hint, Tags), clicks Save.

Frontend validation ensures Front is not empty.

Extension sends POST /api/flashcards request with body: { "cardFront": "...", "cardBack": "...", "hint": "...", "tagList": ["tag1", "tag2"] } (hint/tagList optional).

Backend validates, saves to flashcards table (defaulting current_bucket to 0), handles tags array.

Backend responds with 200 OK and the full newly created flashcard object, including its database-generated id. { "id": "...", "front": "...", ... }

Extension stores the received id associated with the pop-up's content.

Extension displays "Card created successfully" message below buttons. Pop-up remains open, fields retain their values.

Pop-up closes if the user clicks anywhere outside it.

Update Flow (Subsequent Saves):

User modifies fields in the same pop-up instance (which now has an associated id).

User clicks Save again.

Extension sends PUT /api/flashcards/{id} request (using the stored id). Request body contains the complete, current representation of the card from the pop-up fields: { "cardFront": "...", "cardBack": "...", "hint": "...", "tagList": [...] }.

Backend validates, finds card by id, updates fields in flashcards table.

Backend responds with 200 OK and the complete, updated flashcard object.

Extension displays "Card updated successfully" message. Pop-up remains open, fields retain updated values.

Error Handling (Extension):

On backend error response (4xx/5xx), display the error message from the response body in the pop-up's message area.

4.2. Hand Gesture Input (Practice View)

Setup:

When the frontend PracticeView loads, a camera preview window appears with an "Enable Camera" button.

User clicks "Enable Camera"; frontend initializes webcam via browser API and TensorFlow.js Hand Pose Detection model. Camera feed shows in preview.

Practice Flow:

User sees the front of a card.

User clicks "Show Answer".

Backend of card is displayed.

Difficulty buttons ("Easy", "Hard", "Wrong") appear.

Simultaneously, the application starts actively listening for hand gestures via webcam.

The 10-second inactivity timer starts.

Gesture Recognition & Confirmation:

Mapping: Thumbs Up = 'Easy', Thumbs Down = 'Wrong', Flat Hand = 'Hard'.

Detection: System continuously analyzes webcam feed.

Hold-to-Confirm: When a valid gesture is detected:

The 10-second inactivity timer resets.

A visual confirmation indicator (e.g., a filling circle with percentage) appears on screen.

User must hold the same gesture steadily.

If the user holds until the indicator completes (e.g., circle full, 100%):

The corresponding difficulty is automatically submitted via POST /api/update.

The next card/end-of-session state is shown.

Interruption/Change:

If the user changes to another valid gesture before confirmation completes: The indicator resets and starts filling for the new gesture. The 10-second timer resets again.

If the user moves hand out of view or makes an unrecognized gesture before confirmation completes: The indicator resets. The system waits for a valid gesture. The 10-second timer resets again.

Button Interaction: User can click the "Easy", "Hard", or "Wrong" buttons at any time after the back is shown. Clicking a button immediately submits the corresponding difficulty via POST /api/update and cancels any ongoing gesture detection/confirmation/timer for that card.

Inactivity Timeout:

A 10-second timer starts when the back of the card is shown and gesture detection is active.

The timer resets every time the hold-to-confirm process begins for any valid gesture.

If the timer reaches 0 (meaning no valid gesture hold was initiated for 10 seconds), a prompt "Make a gesture or use the buttons" appears. Detection continues.

The timer stops/is irrelevant once an answer is submitted (via gesture hold or button click).

5. API Endpoint Specifications

(Note: All endpoints should interact with the Supabase database as the source of truth. Assumes JSON request/response bodies unless noted.)

5.1. POST /api/flashcards

Purpose: Creates a new flashcard.

Request Body:

{
  "cardFront": "string (required)",
  "cardBack": "string (required)",
  "hint": "string (optional)",
  "tagList": ["string"] (optional, array of strings)
}


Success Response (200 OK): Returns the complete newly created flashcard object, including the DB-generated id.

{
  "id": "uuid",
  "front": "string",
  "back": "string",
  "hint": "string | null",
  "tags": ["string"],
  "current_bucket": 0,
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Error Responses:

400 Bad Request: Invalid input (e.g., missing cardFront/cardBack, invalid tags format). Body: {"error": "Validation Error", "message": "..."}

500 Internal Server Error: Database error during insert. Body: {"error": "Failed to create flashcard"}

5.2. PUT /api/flashcards/{id}

Purpose: Updates an existing flashcard.

URL Parameter: {id} - UUID of the flashcard to update.

Request Body: Complete representation of the flashcard with updated values.

{
  "cardFront": "string (required)",
  "cardBack": "string (required)",
  "hint": "string (optional)",
  "tagList": ["string"] (optional, array of strings)
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Success Response (200 OK): Returns the complete, updated flashcard object.

{
  "id": "uuid",
  "front": "string",
  // ... all fields including updated_at
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Error Responses:

400 Bad Request: Invalid input in body or invalid UUID format in path. Body: {"error": "Validation Error / Invalid ID Format", "message": "..."}

404 Not Found: No flashcard exists with the given id. Body: {"error": "Flashcard not found"}

500 Internal Server Error: Database error during update. Body: {"error": "Failed to update flashcard"}

5.3. GET /api/practice

Purpose: Gets flashcards scheduled for practice on the current day.

Request Body: None.

Success Response (200 OK):

{
  "cards": [
    {
      "id": "uuid",
      "front": "string",
      "back": "string",
      "hint": "string | null",
      "tags": ["string"]
      // Note: current_bucket not included unless frontend needs it
    }
    // ... more cards
  ],
  "day": number // The current practice day number
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Implementation:

Fetch current_day from system_state.

Query flashcards table: SELECT * FROM flashcards WHERE current_bucket = 0 OR (current_bucket > 0 AND $1 % CAST(POW(2, current_bucket) AS bigint) = 0) (using currentDay as $1).

Map results to response format.

Error Responses:

500 Internal Server Error: Failed to fetch current_day or practice cards from DB. Body: {"error": "Failed to retrieve practice session"}

5.4. POST /api/update

Purpose: Records a practice attempt and updates the card's bucket.

Request Body:

{
  "id": "uuid (required)", // ID of the practiced card
  "difficulty": "string (required: 'Easy', 'Hard', or 'Wrong')"
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Success Response (200 OK):

{
  "message": "Card updated successfully"
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Implementation:

Fetch current_bucket for the given id from flashcards. (Handle 404 if not found).

Calculate newBucket based on current_bucket and difficulty (Easy: +1, Hard: max(0, current - 1), Wrong: 0). (Handle 400 for invalid difficulty string).

UPDATE flashcards SET current_bucket = newBucket WHERE id = ....

INSERT INTO practice_history (flashcard_id, difficulty, bucket_before, bucket_after) VALUES (...).

Error Responses:

400 Bad Request: Invalid difficulty string or missing id. Body: {"error": "Invalid Input", "message": "..."}

404 Not Found: No flashcard exists with the given id. Body: {"error": "Flashcard not found"}

500 Internal Server Error: Database error during fetch, update, or insert. Body: {"error": "Failed to process practice update"}

5.5. POST /api/day/next

Purpose: Advances the practice day counter.

Request Body: None.

Success Response (200 OK):

{
  "message": "Day incremented successfully",
  "currentDay": number // The *new* current day number
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Implementation:

Fetch current_day from system_state (where id=1).

Calculate newDay = current_day + 1.

UPDATE system_state SET current_day = newDay WHERE id = 1.

Error Responses:

500 Internal Server Error: Database error during fetch or update. Body: {"error": "Failed to advance day"}

5.6. GET /api/hint/{id}

Purpose: Gets the hint for a specific flashcard.

URL Parameter: {id} - UUID of the flashcard.

Success Response (200 OK):

{
  "hint": string | null // null if the card has no hint
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Error Responses:

400 Bad Request: Invalid UUID format in path. Body: {"error": "Invalid ID format"}

404 Not Found: No flashcard exists with the given id. Body: {"error": "Flashcard not found"}

500 Internal Server Error: Database error during fetch. Body: {"error": "Failed to fetch hint"}

5.7. GET /api/progress

Purpose: Gets learning progress statistics.

Query Parameters:

startDate (Optional): ISO 8601 date string "YYYY-MM-DD".

endDate (Optional): ISO 8601 date string "YYYY-MM-DD" (defaults to current date if startDate provided but endDate is not).

Preconditions: Dates must be valid format, startDate <= endDate.

Success Response (200 OK):

{
  "totalCards": number,
  "cardsPerBucket": { "0": number, "1": number, /*...*/ },
  "recallAccuracy": {
    "startDate": "YYYY-MM-DD",
    "endDate": "YYYY-MM-DD",
    "correctCount": number, // Easy + Hard
    "wrongCount": number,   // Wrong
    "totalAttempts": number,
    "correctPercentage": number // (correct/total)*100
  } | null, // null if startDate not provided or no history in range
  "cardsDueToday": number // Calculated based on current_day and bucket logic
}
IGNORE_WHEN_COPYING_START
content_copy
download
Use code with caution.
Json
IGNORE_WHEN_COPYING_END

Error Responses:

400 Bad Request: Invalid query parameters (date format, date range). Body: {"error": "Invalid query parameters", "message": "..."}

500 Internal Server Error: Database error during calculations. Body: {"error": "Failed to compute progress"}

6. General Error Handling Strategy

Use standard HTTP status codes (200, 400, 404, 500).

Return JSON response bodies for errors, including an error code/type and a descriptive message.

Backend should perform validation even if the frontend also validates.

Fail fast on invalid input or unmet preconditions.

7. Frontend Considerations

API Service: Update api.ts to match the new/modified endpoint paths, request methods, request bodies, and response formats (especially using id).

Practice View:

Implement camera enabling and gesture detection UI.

Integrate TensorFlow.js Hand Pose Detection.

Implement gesture confirmation logic (hold-to-confirm circle).

Implement inactivity timer and prompt.

Pass card id to POST /api/update.

Call GET /api/hint/{id} when hint is requested.

Flashcard Display: Modify to work with gesture confirmation UI if needed. Ensure hint retrieval uses the new API.

Progress View: Create a new component (ProgressView.tsx) to:

Optionally allow user input for startDate and endDate.

Call GET /api/progress with optional date parameters.

Display the received statistics clearly (e.g., using charts or tables).

Browser Extension: Implement the pop-up UI and logic described in section 4.1, handling create/update flows and communication with the backend API.

8. Testing Plan

Unit Tests:

Backend: Test individual utility functions (e.g., calculateNewBucket), potentially mocking database interactions for API handler logic tests.

Frontend: Test component rendering, state changes, utility functions (e.g., date formatting), gesture detection logic (mocking TensorFlow.js if needed).

Extension: Test pop-up logic, form handling, message display (mocking browser APIs and backend calls).

Integration Tests:

Backend: Test API endpoints against a real (test) database instance. Verify data persistence, correct responses, and error handling for all endpoints.

Frontend: Test components interacting with mock API services to ensure correct data flow and UI updates based on API responses.

End-to-End (E2E) Tests:

Use tools like Cypress or Playwright.

Test key user flows:

Creating a card via the extension, then finding it in practice.

Updating a card via the extension.

Practicing a card using button clicks for Easy/Hard/Wrong.

Practicing a card using hand gestures for Easy/Hard/Wrong (may be harder to automate reliably).

Viewing progress statistics (with and without date ranges).

Advancing the day and seeing the correct cards appear for practice.

Getting a hint.

This specification should provide a solid foundation for development. Remember to address any ambiguities or make further refinements as implementation proceeds.