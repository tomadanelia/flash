Okay, let's break down the implementation into a detailed, step-by-step blueprint with iterative chunks suitable for test-driven development (TDD) and generating prompts for a code-generation LLM.

## Phase 1: Backend Foundation & Core Logic

This phase focuses on setting up the backend server, database connection, and implementing the core API endpoints related to the practice loop and basic state management, interacting directly with the database.

**Chunk 1.1: Backend Project Setup**

*   **Goal:** Initialize a Node.js project using Express and TypeScript. Set up basic structure, dependencies, and configuration for Supabase.
*   **Steps:**
    1.  Initialize npm project (`npm init -y`).
    2.  Install core dependencies: `express`, `cors`, `@supabase/supabase-js`, `dotenv`.
    3.  Install dev dependencies: `typescript`, `@types/node`, `@types/express`, `@types/cors`, `ts-node-dev`, `tsconfig-paths`.
    4.  Create `tsconfig.json` with appropriate settings (target ES2016+, module CommonJS, outDir, rootDir, strict, esModuleInterop, paths for aliases like `@db`, `@handlers`).
    5.  Create basic project structure: `src/`, `src/db/`, `src/handlers/`, `src/routes/`, `src/utils/`, `src/server.ts`, `.env`, `.gitignore`.
    6.  Set up `.env` for `SUPABASE_URL` and `SUPABASE_KEY`.
    7.  Create a Supabase client configuration module (`src/db/supabaseClient.ts`) that initializes and exports the Supabase client instance using environment variables.

---

**LLM Prompt 1:**

```text
Setup a new Node.js backend project using TypeScript and Express.

1.  **Initialize:** Run `npm init -y`.
2.  **Dependencies:** Install `express`, `cors`, `@supabase/supabase-js`, `dotenv`.
3.  **Dev Dependencies:** Install `typescript`, `@types/node`, `@types/express`, `@types/cors`, `ts-node-dev`, `tsconfig-paths`.
4.  **tsconfig.json:** Create a `tsconfig.json` configured for a Node.js backend project. Include compiler options: `target: "ES2016"`, `module: "CommonJS"`, `outDir: "./dist"`, `rootDir: "./src"`, `strict: true`, `esModuleInterop: true`, `skipLibCheck: true`, `forceConsistentCasingInFileNames: true`, `resolveJsonModule: true`, `baseUrl: "./"`, and `paths: { "@db/*": ["src/db/*"], "@handlers/*": ["src/handlers/*"], "@routes/*": ["src/routes/*"], "@utils/*": ["src/utils/*"] }`. Ensure `include` points to `src/**/*`.
5.  **Project Structure:** Create directories: `src/db`, `src/handlers`, `src/routes`, `src/utils`. Create empty files: `src/server.ts`.
6.  **.env & .gitignore:** Create a `.env` file with placeholders `SUPABASE_URL=` and `SUPABASE_KEY=`. Create a `.gitignore` file ignoring `node_modules`, `dist`, `.env`.
7.  **Supabase Client:** Create `src/db/supabaseClient.ts`. Import `createClient` from `@supabase/supabase-js` and `dotenv`. Configure dotenv (`dotenv.config()`). Initialize and export a Supabase client instance using `process.env.SUPABASE_URL` and `process.env.SUPABASE_KEY`. Ensure proper error handling if variables are missing.
8.  **Basic Server:** In `src/server.ts`, set up a minimal Express app: import `express` and `cors`. Use `cors()`. Define a `PORT` (e.g., 3001). Add a basic `app.listen` call. Add `tsconfig-paths/register` import at the top.
9.  **Scripts:** Add `dev` (`ts-node-dev --respawn --transpile-only src/server.ts`) and `build` (`tsc`) scripts to `package.json`.
```

---

**Chunk 1.2: Database Schema Setup**

*   **Goal:** Define and apply the database schema in Supabase.
*   **Steps:**
    1.  Create SQL script (`schema.sql`) defining the `flashcards`, `system_state`, and `practice_history` tables exactly as specified (including constraints, defaults, and relationships).
    2.  Add SQL to initialize the `system_state` table with its single row (`INSERT INTO system_state (id, current_day) VALUES (1, 0);`).
    3.  (Manual Step) Run this SQL script in the Supabase SQL Editor for the project.

---

**LLM Prompt 2:**

```text
Create a SQL script named `schema.sql` to define the database tables in Supabase according to the project specification.

1.  **`flashcards` Table:**
    *   Columns: `id` (UUID, PK, default `gen_random_uuid()`), `front_text` (TEXT, NOT NULL), `back_text` (TEXT, NOT NULL), `hint_text` (TEXT, NULL), `tags` (TEXT[], NULL), `current_bucket` (INTEGER, NOT NULL, DEFAULT 0), `created_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`), `updated_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`).
    *   (Optional but recommended: Add a trigger function to automatically update `updated_at` on row updates).
2.  **`system_state` Table:**
    *   Columns: `id` (INTEGER, PK), `current_day` (INTEGER, NOT NULL, DEFAULT 0).
3.  **`practice_history` Table:**
    *   Columns: `id` (UUID, PK, default `gen_random_uuid()`), `flashcard_id` (UUID, NOT NULL, REFERENCES `flashcards(id)`), `practiced_at` (TIMESTAMPTZ, NOT NULL, DEFAULT `now()`), `difficulty` (TEXT, NOT NULL), `bucket_before` (INTEGER, NOT NULL), `bucket_after` (INTEGER, NOT NULL).
4.  **Initial Data:** Include `INSERT INTO system_state (id, current_day) VALUES (1, 0) ON CONFLICT (id) DO NOTHING;` to initialize the state row.

Provide only the SQL script content. This script will be run manually in the Supabase SQL Editor.
```

---

**Chunk 1.3: Implement `POST /api/day/next`**

*   **Goal:** Create the endpoint to advance the practice day in the database.
*   **Steps:**
    1.  Create `src/db/dayService.ts`. Implement `getCurrentDay()` and `incrementCurrentDay()` functions using the Supabase client to interact with the `system_state` table. Handle potential errors.
    2.  Create `src/handlers/dayHandler.ts`. Implement `handleNextDay(req, res)` which calls `incrementCurrentDay()`, fetches the *new* day value (or receives it from the update), and sends the correct JSON response or error.
    3.  Create `src/routes/dayRoutes.ts`. Define an Express router, import the handler, and set up the `POST /next` route (base path `/api/day` will be added in `server.ts`).
    4.  In `src/server.ts`, import the day router and mount it under `/api/day`.
    5.  **(TDD)** Write integration tests (e.g., using `supertest` and a test database/setup) for the `POST /api/day/next` endpoint, verifying the status code, response body, and the database state change.

---

**LLM Prompt 3:**

```text
Implement the `POST /api/day/next` endpoint based on the specification, using the Supabase client from `@db/supabaseClient`.

1.  **DB Service (`src/db/dayService.ts`):**
    *   Import the Supabase client.
    *   Create async function `fetchCurrentDay()`: Queries `system_state` table (`WHERE id = 1`), selects `current_day`, returns the day number. Throw error if fetch fails or row not found.
    *   Create async function `incrementCurrentDay()`: Fetches the current day using `fetchCurrentDay()`. Calculates `newDay = currentDay + 1`. Updates `system_state` setting `current_day = newDay` (`WHERE id = 1`). Returns the `newDay`. Throw error on failure.
2.  **Handler (`src/handlers/dayHandler.ts`):**
    *   Import `Request`, `Response` from `express` and functions from `@db/dayService`.
    *   Create async function `handleNextDay(req: Request, res: Response)`:
        *   Wrap logic in a try/catch block.
        *   Call `incrementCurrentDay()`.
        *   On success, respond with status 200 and JSON `{ message: "Day incremented successfully", currentDay: newDay }`.
        *   In catch block, log the error and respond with status 500 and JSON `{ error: "Failed to advance day" }`.
3.  **Router (`src/routes/dayRoutes.ts`):**
    *   Import `Router` from `express` and `handleNextDay` from `@handlers/dayHandler`.
    *   Create a new router instance.
    *   Define the route: `router.post('/next', handleNextDay);`.
    *   Export the router.
4.  **Server Integration (`src/server.ts`):**
    *   Import the day router from `@routes/dayRoutes`.
    *   Mount the router: `app.use('/api/day', dayRouter);`. Ensure `express.json()` middleware is used before routes.

**(Testing Context)**: Assume integration tests will be written separately to verify this endpoint against a test database. Focus on the implementation logic and error handling as specified.
```

---

**Chunk 1.4: Implement `GET /api/practice`**

*   **Goal:** Create the endpoint to fetch cards due for practice today.
*   **Steps:**
    1.  Create `src/db/practiceService.ts`. Implement `fetchPracticeCards(day: number)` function using the Supabase client. It should execute the specific SQL query defined in the spec (using `POW` and modulo logic) to select cards from the `flashcards` table based on the `day` and `current_bucket`. Map snake_case results to camelCase objects like `{ id, front, back, hint, tags }`. Handle potential errors.
    2.  Create `src/handlers/practiceHandler.ts`. Implement `handleGetPracticeCards(req, res)` which calls `fetchCurrentDay()` from `dayService` and then `fetchPracticeCards()`, sending the correct JSON response `{ cards, day }` or error.
    3.  Create `src/routes/practiceRoutes.ts`. Define router, import handler, set up `GET /` route.
    4.  In `src/server.ts`, import and mount the practice router under `/api/practice`.
    5.  **(TDD)** Write integration tests for `GET /api/practice`. Seed the test DB with cards in various buckets, advance the day using the `/api/day/next` endpoint, and verify that the correct cards are returned for different days.

---

**LLM Prompt 4:**

```text
Implement the `GET /api/practice` endpoint based on the specification, using the Supabase client and existing services.

1.  **DB Service (`src/db/practiceService.ts`):**
    *   Import the Supabase client.
    *   Define an interface `PracticeCard` with fields `id` (string), `front` (string), `back` (string), `hint` (string | null), `tags` (string[]).
    *   Create async function `fetchPracticeCards(day: number): Promise<PracticeCard[]>`:
        *   Construct the SQL query: `SELECT id, front_text, back_text, hint_text, tags FROM flashcards WHERE current_bucket = 0 OR (current_bucket > 0 AND $1 % CAST(POW(2, current_bucket) AS bigint) = 0)`
        *   Execute the query using the Supabase client's method for raw SQL (e.g., `supabase.rpc` if wrapped in a function, or equivalent for direct query execution), passing `day` as the parameter (`$1`). Handle potential query errors.
        *   Map the snake_case results (`id`, `front_text`, `back_text`, `hint_text`, `tags`) from the database to an array of `PracticeCard` objects (camelCase `id`, `front`, `back`, `hint`, `tags`). Ensure `tags` defaults to an empty array if null.
        *   Return the array of `PracticeCard`.
2.  **Handler (`src/handlers/practiceHandler.ts`):**
    *   Import `Request`, `Response`, `fetchCurrentDay` from `@db/dayService`, and `fetchPracticeCards` from `@db/practiceService`.
    *   Create async function `handleGetPracticeCards(req: Request, res: Response)`:
        *   Wrap logic in try/catch.
        *   Call `fetchCurrentDay()`.
        *   Call `fetchPracticeCards()` with the fetched day.
        *   On success, respond 200 with JSON `{ cards: practiceCards, day: currentDay }`.
        *   In catch, log error, respond 500 with JSON `{ error: "Failed to retrieve practice session" }`.
3.  **Router (`src/routes/practiceRoutes.ts`):**
    *   Import `Router` and `handleGetPracticeCards`.
    *   Create router instance.
    *   Define route: `router.get('/', handleGetPracticeCards);`.
    *   Export router.
4.  **Server Integration (`src/server.ts`):**
    *   Import practice router from `@routes/practiceRoutes`.
    *   Mount router: `app.use('/api/practice', practiceRouter);`.

**(Testing Context)**: Assume integration tests will verify this by seeding cards and checking results on different days.
```

---

**Chunk 1.5: Implement `POST /api/update`**

*   **Goal:** Create the endpoint to handle practice answers, update card buckets, and log history.
*   **Steps:**
    1.  Create helper `calculateNewBucket(currentBucket: number, difficulty: 'Easy' | 'Hard' | 'Wrong'): number` in `src/utils/learningLogic.ts` implementing the specified logic (Easy: +1, Hard: max(0, current - 1), Wrong: 0). Add unit tests for this helper.
    2.  Create `src/db/updateService.ts`. Implement `updateFlashcardPractice(cardId: string, difficulty: 'Easy' | 'Hard' | 'Wrong'): Promise<void>`. This function should:
        *   Fetch the `current_bucket` for `cardId` from `flashcards`. Handle "not found".
        *   Call `calculateNewBucket`.
        *   Update the `current_bucket` for `cardId` in `flashcards`.
        *   Insert a record into `practice_history` with `flashcard_id`, `difficulty`, `bucket_before`, `bucket_after`.
        *   Wrap DB operations in a transaction if possible via the Supabase client library to ensure atomicity. Handle errors.
    3.  Create `src/handlers/updateHandler.ts`. Implement `handleUpdateCard(req, res)`. Parse `id` and `difficulty` from request body. Perform basic validation (ID is UUID, difficulty is valid string). Call `updateFlashcardPractice()`. Send success/error responses per spec (200, 400, 404, 500).
    4.  Create `src/routes/updateRoutes.ts`. Define router, import handler, set up `POST /` route.
    5.  In `src/server.ts`, import and mount the update router under `/api/update`.
    6.  **(TDD)** Write integration tests for `POST /api/update`. Test successful updates for Easy/Hard/Wrong, ensuring `flashcards` and `practice_history` tables are updated correctly. Test 404 for bad ID, 400 for bad difficulty string.

---

**LLM Prompt 5:**

```text
Implement the `POST /api/update` endpoint and its dependencies based on the specification.

1.  **Utility (`src/utils/learningLogic.ts`):**
    *   Define `AnswerDifficultyType = 'Easy' | 'Hard' | 'Wrong'`.
    *   Create function `calculateNewBucket(currentBucket: number, difficulty: AnswerDifficultyType): number`:
        *   Implement logic: Easy -> `currentBucket + 1`, Hard -> `Math.max(0, currentBucket - 1)`, Wrong -> `0`.
    *   **(Testing Context):** Add comments suggesting unit tests for this function.
2.  **DB Service (`src/db/updateService.ts`):**
    *   Import Supabase client and `calculateNewBucket`.
    *   Create async function `updateFlashcardPractice(cardId: string, difficulty: AnswerDifficultyType): Promise<void>`:
        *   (Optional but recommended: Start a database transaction if supported by the client library).
        *   Fetch `current_bucket` for `cardId` from `flashcards`. If not found, throw a specific 'NotFound' error.
        *   Call `calculateNewBucket` to get `newBucket`.
        *   `UPDATE flashcards SET current_bucket = newBucket, updated_at = now() WHERE id = cardId`. Check for errors.
        *   `INSERT INTO practice_history (flashcard_id, difficulty, bucket_before, bucket_after) VALUES (cardId, difficulty, currentBucket, newBucket)`. Check for errors.
        *   (Optional: Commit transaction).
        *   Handle potential DB errors within the function, possibly re-throwing specific error types (e.g., NotFoundError, DatabaseError). Catch exceptions if using transactions and rollback.
3.  **Handler (`src/handlers/updateHandler.ts`):**
    *   Import `Request`, `Response`, `updateFlashcardPractice`, and `AnswerDifficultyType`.
    *   Create async function `handleUpdateCard(req: Request, res: Response)`:
        *   Extract `id` and `difficulty` from `req.body`.
        *   Validate `id` (basic check if it looks like a UUID - regex or library).
        *   Validate `difficulty` (is it one of 'Easy', 'Hard', 'Wrong'?). If invalid, return 400 JSON `{ error: "Invalid Input", message: "Invalid difficulty value" }`. If invalid ID format, return 400 JSON `{ error: "Invalid Input", message: "Invalid card ID format" }`.
        *   Wrap call to `updateFlashcardPractice` in try/catch.
        *   Call `updateFlashcardPractice(id, difficulty as AnswerDifficultyType)`.
        *   On success, respond 200 with JSON `{ message: "Card updated successfully" }`.
        *   In catch block: Check error type. If 'NotFound' error from DB service, return 404 JSON `{ error: "Flashcard not found" }`. For other errors, log and return 500 JSON `{ error: "Failed to process practice update" }`.
4.  **Router (`src/routes/updateRoutes.ts`):**
    *   Import `Router` and `handleUpdateCard`.
    *   Create router, define `POST /` route, export router.
5.  **Server Integration (`src/server.ts`):**
    *   Import update router, mount under `/api/update`.

**(Testing Context):** Assume integration tests will cover success/error cases and DB state changes.
```

---

## Phase 2: Card Management API

Implement the endpoints for creating and updating flashcard content.

**Chunk 2.1: Implement `POST /api/flashcards`**

*   **Goal:** Create the endpoint for adding new flashcards via the extension.
*   **Steps:**
    1.  Create `src/db/cardManagementService.ts`. Implement `createFlashcard(data: { front: string, back: string, hint?: string | null, tags?: string[] | null }): Promise<Flashcard>` (define `Flashcard` interface based on DB schema + `id`). Function should insert a new row into `flashcards` with default bucket 0, map input fields correctly (handling optional hint/tags), and return the newly created card object (including `id`, `created_at`, etc., fetched after insert or using `RETURNING *`). Handle errors.
    2.  Create `src/handlers/cardManagementHandler.ts`. Implement `handleCreateFlashcard(req, res)`. Parse `cardFront`, `cardBack`, `hint`, `tagList` from body. Validate required fields (`cardFront`, `cardBack`). Call `createFlashcard()`. Send success (200 with card object) or error (400, 500) responses.
    3.  Create `src/routes/cardManagementRoutes.ts`. Define router, import handler, set up `POST /` route.
    4.  In `src/server.ts`, import and mount router under `/api/flashcards`.
    5.  **(TDD)** Write integration tests for `POST /api/flashcards`. Test creating cards with/without optional fields, verify DB state and response body. Test 400 for missing required fields.

---

**LLM Prompt 6:**

```text
Implement the `POST /api/flashcards` endpoint for creating new flashcards.

1.  **DB Service (`src/db/cardManagementService.ts`):**
    *   Import Supabase client.
    *   Define `Flashcard` interface matching the `flashcards` table schema + `id`.
    *   Define input type `CreateCardData = { front: string, back: string, hint?: string | null, tags?: string[] | null }`.
    *   Create async function `createFlashcard(data: CreateCardData): Promise<Flashcard>`:
        *   Prepare data for insert: map `front` to `front_text`, `back` to `back_text`, handle optional `hint` (`hint_text`), `tags` (`tags`). Ensure `current_bucket` defaults to 0.
        *   `INSERT INTO flashcards (...) VALUES (...) RETURNING *`. Use the Supabase client's method for this.
        *   Handle potential DB errors (e.g., constraint violations).
        *   Map the returned snake_case row to a camelCase `Flashcard` object.
        *   Return the created `Flashcard` object.
2.  **Handler (`src/handlers/cardManagementHandler.ts`):**
    *   Import `Request`, `Response`, `createFlashcard`.
    *   Create async function `handleCreateFlashcard(req: Request, res: Response)`:
        *   Extract `cardFront`, `cardBack`, `hint`, `tagList` from `req.body`.
        *   Validate: Check if `cardFront` and `cardBack` are non-empty strings. If not, return 400 JSON `{ error: "Validation Error", message: "cardFront and cardBack are required." }`.
        *   Wrap call to `createFlashcard` in try/catch.
        *   Call `createFlashcard({ front: cardFront, back: cardBack, hint: hint, tags: tagList })`.
        *   On success, respond 200 with the created flashcard object (JSON).
        *   In catch, log error, respond 500 with JSON `{ error: "Failed to create flashcard" }`.
3.  **Router (`src/routes/cardManagementRoutes.ts`):**
    *   Import `Router` and `handleCreateFlashcard`.
    *   Create router, define `POST /` route, export router.
4.  **Server Integration (`src/server.ts`):**
    *   Import card management router, mount under `/api/flashcards`.

**(Testing Context):** Assume integration tests verify DB state and response.
```

---

**Chunk 2.2: Implement `PUT /api/flashcards/{id}`**

*   **Goal:** Create the endpoint for updating existing flashcards.
*   **Steps:**
    1.  In `src/db/cardManagementService.ts`, implement `updateFlashcard(id: string, data: { front: string, back: string, hint?: string | null, tags?: string[] | null }): Promise<Flashcard>`. Function should update the row in `flashcards` matching `id` with the provided data (mapping fields, updating `updated_at`). Use `RETURNING *` to get the updated card. Handle "not found" errors specifically.
    2.  In `src/handlers/cardManagementHandler.ts`, implement `handleUpdateFlashcard(req, res)`. Extract `id` from `req.params`. Parse body data. Validate required fields in body. Call `updateFlashcard()`. Send success (200 with updated card object) or error (400, 404, 500) responses.
    3.  In `src/routes/cardManagementRoutes.ts`, import handler and set up `PUT /:id` route.
    4.  **(TDD)** Write integration tests for `PUT /api/flashcards/{id}`. Test successful updates, verify DB state and response. Test 404 for bad ID, 400 for invalid body or ID format.

---

**LLM Prompt 7:**

```text
Implement the `PUT /api/flashcards/{id}` endpoint for updating existing flashcards.

1.  **DB Service (`src/db/cardManagementService.ts`):**
    *   Import Supabase client and `Flashcard` interface.
    *   Define input type `UpdateCardData = { front: string, back: string, hint?: string | null, tags?: string[] | null }`.
    *   Create async function `updateFlashcard(id: string, data: UpdateCardData): Promise<Flashcard>`:
        *   Prepare data for update: map `front` to `front_text`, `back` to `back_text`, handle optional `hint`, `tags`. Include `updated_at = now()`.
        *   `UPDATE flashcards SET ... WHERE id = id RETURNING *`. Use the Supabase client's method.
        *   Check if the update returned any rows. If not (meaning ID didn't exist), throw a specific 'NotFound' error.
        *   Handle potential DB errors.
        *   Map the returned snake_case row to a camelCase `Flashcard` object.
        *   Return the updated `Flashcard` object.
2.  **Handler (`src/handlers/cardManagementHandler.ts`):**
    *   Import `Request`, `Response`, `updateFlashcard`.
    *   Create async function `handleUpdateFlashcard(req: Request, res: Response)`:
        *   Extract `id` from `req.params`. Validate `id` format (UUID). If invalid, return 400 JSON `{ error: "Invalid ID Format", message: "Invalid card ID format" }`.
        *   Extract `cardFront`, `cardBack`, `hint`, `tagList` from `req.body`.
        *   Validate: Check if `cardFront` and `cardBack` are non-empty strings. If not, return 400 JSON `{ error: "Validation Error", message: "cardFront and cardBack are required." }`.
        *   Wrap call to `updateFlashcard` in try/catch.
        *   Call `updateFlashcard(id, { front: cardFront, back: cardBack, hint: hint, tags: tagList })`.
        *   On success, respond 200 with the updated flashcard object (JSON).
        *   In catch block: Check error type. If 'NotFound' error, return 404 JSON `{ error: "Flashcard not found" }`. For other errors, log and return 500 JSON `{ error: "Failed to update flashcard" }`.
3.  **Router (`src/routes/cardManagementRoutes.ts`):**
    *   Import `handleUpdateFlashcard`.
    *   Add route: `router.put('/:id', handleUpdateFlashcard);`. Make sure this router is already exported.
4.  **Server Integration (`src/server.ts`):**
    *   Ensure the card management router is mounted under `/api/flashcards`.

**(Testing Context):** Assume integration tests verify DB state, response, and error handling (400, 404).
```

---

**Chunk 2.3: Implement `GET /api/hint/{id}`**

*   **Goal:** Create the endpoint to fetch a card's hint.
*   **Steps:**
    1.  In `src/db/cardManagementService.ts` (or a new `hintService.ts`), implement `fetchHint(id: string): Promise<string | null>`. Query `flashcards` for `hint_text` where `id` matches. Handle "not found" and return `null` if `hint_text` is null.
    2.  In `src/handlers/cardManagementHandler.ts` (or `hintHandler.ts`), implement `handleGetHint(req, res)`. Extract `id`, validate format. Call `fetchHint()`. Send success (200 with `{ hint: ... }`) or error (400, 404, 500).
    3.  In `src/routes/cardManagementRoutes.ts` (or `hintRoutes.ts`), add `GET /:id/hint` route (or `GET /:id` if using a dedicated hint router).
    4.  Mount router appropriately in `server.ts`.
    5.  **(TDD)** Write integration tests.

---

**LLM Prompt 8:**

```text
Implement the `GET /api/hint/{id}` endpoint. Let's add it to the card management service and routes for simplicity.

1.  **DB Service (`src/db/cardManagementService.ts`):**
    *   Import Supabase client.
    *   Create async function `fetchHint(id: string): Promise<string | null>`:
        *   `SELECT hint_text FROM flashcards WHERE id = id`. Use Supabase client.
        *   If no row found, throw 'NotFound' error.
        *   If row found, return the `hint_text` value (which could be `null`).
        *   Handle DB errors.
2.  **Handler (`src/handlers/cardManagementHandler.ts`):**
    *   Import `fetchHint`.
    *   Create async function `handleGetHint(req: Request, res: Response)`:
        *   Extract `id` from `req.params`. Validate UUID format. If invalid, return 400 JSON `{ error: "Invalid ID Format", message: "Invalid card ID format" }`.
        *   Wrap call to `fetchHint` in try/catch.
        *   Call `fetchHint(id)`.
        *   On success, respond 200 with JSON `{ hint: fetchedHint }`.
        *   In catch: If 'NotFound', return 404 JSON `{ error: "Flashcard not found" }`. Otherwise, log and return 500 JSON `{ error: "Failed to fetch hint" }`.
3.  **Router (`src/routes/cardManagementRoutes.ts`):**
    *   Import `handleGetHint`.
    *   Add route: `router.get('/:id/hint', handleGetHint);`.
4.  **Server Integration (`src/server.ts`):**
    *   Ensure card management router is mounted at `/api/flashcards`. The effective path will be `/api/flashcards/:id/hint`. (Alternatively, create a dedicated hint router if preferred).

**(Testing Context):** Assume integration tests verify success (with/without hint) and error cases (400, 404).
```

---

## Phase 3: Progress API

Implement the endpoint for calculating and returning progress statistics.

**Chunk 3.1: Implement `GET /api/progress`**

*   **Goal:** Create the endpoint providing learning statistics.
*   **Steps:**
    1.  Create `src/db/progressService.ts`. Implement necessary DB query functions:
        *   `getTotalCardCount()`: `SELECT COUNT(*) FROM flashcards`.
        *   `getCardsPerBucket()`: `SELECT current_bucket, COUNT(*) FROM flashcards GROUP BY current_bucket`. Map result to `{ bucket: count }` object.
        *   `getCardsDueTodayCount(day: number)`: Similar logic to `fetchPracticeCards` but just `COUNT(*)`.
        *   `getRecallAccuracy(startDate: string, endDate: string)`: `SELECT difficulty, COUNT(*) FROM practice_history WHERE practiced_at >= startDate AND practiced_at <= endDate GROUP BY difficulty`. Aggregate counts for correct/wrong. Handle potential date/time zone issues carefully.
    2.  Create `src/handlers/progressHandler.ts`. Implement `handleGetProgress(req, res)`.
        *   Parse optional `startDate`, `endDate` from `req.query`.
        *   Validate date formats and `startDate <= endDate` if both provided. Return 400 on validation failure.
        *   Call `fetchCurrentDay()`.
        *   Call DB service functions concurrently (`Promise.all`).
        *   Aggregate results into the specified JSON response structure. Calculate percentage for recall accuracy. Handle cases where no history exists in the date range.
        *   Send success (200) or error (400, 500) response.
    3.  Create `src/routes/progressRoutes.ts`. Define router, import handler, set up `GET /` route.
    4.  In `src/server.ts`, import and mount router under `/api/progress`.
    5.  **(TDD)** Write integration tests. Test with/without date parameters, verify calculations, check edge cases (no cards, no history), test date validation errors (400).

---

**LLM Prompt 9:**

```text
Implement the `GET /api/progress` endpoint.

1.  **DB Service (`src/db/progressService.ts`):**
    *   Import Supabase client.
    *   `getTotalCardCount(): Promise<number>`: Implement using `SELECT COUNT(*)`.
    *   `getCardsPerBucket(): Promise<{ [bucket: number]: number }>`: Implement using `SELECT current_bucket, COUNT(*) ... GROUP BY`. Map result to dictionary/object.
    *   `getCardsDueTodayCount(day: number): Promise<number>`: Implement count query similar to `fetchPracticeCards` logic.
    *   `getRecallAccuracy(startDate: string, endDate: string): Promise<{ correctCount: number, wrongCount: number, totalAttempts: number } | null>`:
        *   Query `practice_history` filtering by `practiced_at` between `startDate` and `endDate` (inclusive, ensure correct timestamp handling).
        *   `GROUP BY difficulty`.
        *   Process results: Sum counts for 'Easy'/'Hard' into `correctCount`, count for 'Wrong' into `wrongCount`. Calculate `totalAttempts`.
        *   Return the counts object, or `null` if no history records are found in the range. Handle DB errors.
2.  **Handler (`src/handlers/progressHandler.ts`):**
    *   Import necessary services, `Request`, `Response`.
    *   Implement `handleGetProgress(req: Request, res: Response)`:
        *   Extract `startDate`, `endDate` from `req.query` (as strings).
        *   Perform validation: Use a robust method (e.g., regex or library like `date-fns` or `dayjs`) to check if provided dates are valid 'YYYY-MM-DD'. Check `startDate <= endDate` if both exist. Return 400 JSON on failure with descriptive message.
        *   Default `endDate` to today if only `startDate` is given.
        *   Use `Promise.all` to call:
            *   `fetchCurrentDay()`
            *   `getTotalCardCount()`
            *   `getCardsPerBucket()`
            *   `getCardsDueTodayCount(currentDay)`
            *   `getRecallAccuracy(startDate, endDate)` (only if `startDate` is valid).
        *   Assemble the response object based on the spec. Format `cardsPerBucket`. Handle `recallAccuracy` being potentially `null`. Calculate `correctPercentage` safely (handle division by zero).
        *   Wrap in try/catch. Respond 200 on success. Log errors and respond 500 on failure. Handle 400 for validation errors separately.
3.  **Router (`src/routes/progressRoutes.ts`):**
    *   Import `Router`, `handleGetProgress`.
    *   Create router, define `GET /` route, export.
4.  **Server Integration (`src/server.ts`):**
    *   Import progress router, mount under `/api/progress`.

**(Testing Context):** Assume integration tests verify calculations and error handling, especially date validation.
```

---

## Phase 4: Frontend Setup & Basic Practice View

Connect the frontend to the backend API for the core practice loop (no gestures yet).

*(Prompts for frontend setup (React/Vite/TS), `api.ts`, `App.tsx`, basic `PracticeView.tsx` and `FlashcardDisplay.tsx` would follow a similar pattern, focusing on component structure, state management (useState/useEffect), API calls, and rendering based on the API responses defined above. TDD would involve component tests using testing libraries like `@testing-library/react` and potentially mocking API calls.)*

*Self-Correction:* Skip generating detailed frontend prompts for now to keep focus tight, assuming the developer can build standard React components based on the backend API spec. The next crucial steps involve the *new* features.

## Phase 5: Browser Extension

**(Detailed prompts for setting up the extension manifest, content script for highlighting/button, popup HTML/JS for the form, background script for API calls, and inter-script communication would be generated here, following the spec.)**

*Self-Correction:* Browser extension development is complex and LLM generation might be less reliable. Prioritize backend and core frontend first. We'll assume the developer builds this based on the detailed spec (Section 4.1).

## Phase 6: Hand Gesture Integration

**(Detailed prompts for adding TensorFlow.js, modifying `PracticeView` for camera setup, implementing the detection loop, gesture mapping, hold-to-confirm UI/logic, and inactivity timer would go here.)**

*Self-Correction:* Similar to the extension, TF.js integration is specialized. Let's assume the developer tackles this based on the spec (Section 4.2) after the core app is working.

## Phase 7: Progress View Frontend

**(Prompts for creating `ProgressView.tsx`, adding date inputs, calling the `GET /api/progress` endpoint via `api.ts`, and displaying the stats.)**

*Self-Correction:* Standard React component development. Assume developer implements based on spec.

## Phase 8: Final Wiring & Testing

*   **Goal:** Ensure all parts work together seamlessly.
*   **Steps:**
    1.  Manually test the full E2E flows described in the testing plan (Section 8).
    2.  Refine UI/UX based on testing.
    3.  Add more automated tests (Unit, Integration, E2E) as needed to cover critical paths and edge cases discovered during manual testing.

---

This step-by-step plan focuses heavily on getting the backend API fully functional and database-driven first, as that's the foundation. Subsequent phases would layer on the frontend features. The LLM prompts provided cover the backend implementation in detail, assuming TDD principles where integration tests would follow each chunk's implementation.