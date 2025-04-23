
```markdown
# Project TODO List: Flashcard System (New Backend Build)

**Preamble:** This checklist outlines building the backend from scratch using the specification and integrating it with the existing frontend (which will be refactored).

## Phase 1: Backend Foundation & Core Logic (Database Driven - FROM SCRATCH)

### Chunk 1.1: Backend Project Setup
- [ ] **Create new backend directory** (e.g., `backend-v2` or replace existing after backup).
- [ ] Navigate into the new directory.
- [ ] Initialize npm project (`npm init -y`).
- [ ] Install core dependencies: `express`, `cors`, `@supabase/supabase-js`, `dotenv`.
- [ ] Install dev dependencies: `typescript`, `@types/node`, `@types/express`, `@types/cors`, `ts-node-dev`, `tsconfig-paths`.
- [ ] Create `tsconfig.json` with correct settings and path aliases (`@db`, `@handlers`, `@routes`, `@utils`).
- [ ] Create project structure: `src/db`, `src/handlers`, `src/routes`, `src/utils`, `src/server.ts`.
- [ ] Create `.env` file with `SUPABASE_URL` and `SUPABASE_KEY` placeholders.
- [ ] Create `.gitignore` (ignore `node_modules`, `dist`, `.env`).
- [ ] Implement Supabase client initialization in `src/db/supabaseClient.ts`.
- [ ] Set up basic Express server in `src/server.ts` (incl. `cors`, `port`, `listen`, `express.json()`, `tsconfig-paths/register`).
- [ ] Add `dev` and `build` scripts to `package.json`.

### Chunk 1.2: Database Schema Setup
- [ ] Create `schema.sql` script:
    - [ ] Define `flashcards` table schema.
    - [ ] Define `system_state` table schema.
    - [ ] Define `practice_history` table schema.
    - [ ] Add initial data insert for `system_state`.
- [ ] (Manual Step) Run `schema.sql` in the Supabase SQL Editor.

### Chunk 1.3: Implement `POST /api/day/next`
- [ ] Implement `fetchCurrentDay()` in `src/db/dayService.ts`.
- [ ] Implement `incrementCurrentDay()` in `src/db/dayService.ts`.
- [ ] Implement `handleNextDay(req, res)` in `src/handlers/dayHandler.ts`.
- [ ] Define `/next` route in `src/routes/dayRoutes.ts`.
- [ ] Mount `dayRouter` under `/api/day` in `src/server.ts`.
- [ ] (TDD) Write integration tests for `POST /api/day/next`.

### Chunk 1.4: Implement `GET /api/practice`
- [ ] Define `PracticeCard` interface in `src/db/practiceService.ts`.
- [ ] Implement `fetchPracticeCards(day: number)` in `src/db/practiceService.ts`.
- [ ] Implement `handleGetPracticeCards(req, res)` in `src/handlers/practiceHandler.ts`.
- [ ] Define `/` route in `src/routes/practiceRoutes.ts`.
- [ ] Mount `practiceRouter` under `/api/practice` in `src/server.ts`.
- [ ] (TDD) Write integration tests for `GET /api/practice`.

### Chunk 1.5: Implement `POST /api/update`
- [ ] Implement `calculateNewBucket()` helper in `src/utils/learningLogic.ts`.
- [ ] Add unit tests for `calculateNewBucket()`.
- [ ] Implement `updateFlashcardPractice(cardId, difficulty)` in `src/db/updateService.ts` (handle DB ops, transaction, 'NotFound').
- [ ] Implement `handleUpdateCard(req, res)` in `src/handlers/updateHandler.ts` (parse body for `id`, validate, call service, handle responses).
- [ ] Define `/` route in `src/routes/updateRoutes.ts`.
- [ ] Mount `updateRouter` under `/api/update` in `src/server.ts`.
- [ ] (TDD) Write integration tests for `POST /api/update`.

## Phase 2: Card Management API (New Backend)

### Chunk 2.1: Implement `POST /api/flashcards`
- [ ] Define `Flashcard` interface and `CreateCardData` type in `src/db/cardManagementService.ts`.
- [ ] Implement `createFlashcard(data)` in `src/db/cardManagementService.ts`.
- [ ] Implement `handleCreateFlashcard(req, res)` in `src/handlers/cardManagementHandler.ts`.
- [ ] Define `/` route in `src/routes/cardManagementRoutes.ts`.
- [ ] Mount `cardManagementRouter` under `/api/flashcards` in `src/server.ts`.
- [ ] (TDD) Write integration tests for `POST /api/flashcards`.

### Chunk 2.2: Implement `PUT /api/flashcards/{id}`
- [ ] Define `UpdateCardData` type in `src/db/cardManagementService.ts`.
- [ ] Implement `updateFlashcard(id, data)` in `src/db/cardManagementService.ts`.
- [ ] Implement `handleUpdateFlashcard(req, res)` in `src/handlers/cardManagementHandler.ts`.
- [ ] Define `/:id` route in `src/routes/cardManagementRoutes.ts`.
- [ ] (TDD) Write integration tests for `PUT /api/flashcards/{id}`.

### Chunk 2.3: Implement `GET /api/hint/{id}` (New Path Structure)
- [ ] Implement `fetchHint(id)` in `src/db/cardManagementService.ts`.
- [ ] Implement `handleGetHint(req, res)` in `src/handlers/cardManagementHandler.ts`.
- [ ] Define `/:id/hint` route in `src/routes/cardManagementRoutes.ts`.
- [ ] (TDD) Write integration tests for `GET /api/flashcards/:id/hint`.

## Phase 3: Progress API (New Backend)

### Chunk 3.1: Implement `GET /api/progress`
- [ ] Implement DB query functions in `src/db/progressService.ts`: `getTotalCardCount`, `getCardsPerBucket`, `getCardsDueTodayCount(day)`, `getRecallAccuracy(start, end)`.
- [ ] Implement `handleGetProgress(req, res)` in `src/handlers/progressHandler.ts` (validate dates, call DB services, assemble response).
- [ ] Define `/` route in `src/routes/progressRoutes.ts`.
- [ ] Mount `progressRouter` under `/api/progress` in `src/server.ts`.
- [ ] (TDD) Write integration tests for `GET /api/progress`.

---
**(Once the new backend is built and tested, proceed with refactoring the existing frontend)**
---

## Phase 4: Frontend Refactoring & Basic Practice View Updates

### Chunk 4.1: Update Frontend API Service
- [ ] **Modify `frontend/src/services/api.ts`:**
    - [ ] Point `API_BASE_URL` to the new backend server port if needed.
    - [ ] Update `fetchPracticeCards` to handle the response format (cards have `id`).
    - [ ] Update `submitAnswer` to accept `id` and `difficulty` string ('Easy'/'Hard'/'Wrong') and call `POST /api/update` with the correct body.
    - [ ] Update `fetchHint` to accept `id` and call `GET /api/flashcards/{id}/hint`.
    - [ ] Update `advanceDay` to call `POST /api/day/next`.
    - [ ] **Add** `createCard` function (call `POST /api/flashcards`).
    - [ ] **Add** `updateCard` function (call `PUT /api/flashcards/{id}`).
    - [ ] **Add/Modify** `fetchProgress` function (call `GET /api/progress`, handle query params and new response format).

### Chunk 4.2: Update Frontend Components
- [ ] **Modify `frontend/src/types/index.ts`:**
    - [ ] Ensure `Flashcard` type includes `id: string`.
    - [ ] Update/Remove `UpdateRequest` type.
    - [ ] Update `ProgressStats` type.
    - [ ] Define types for new API request/response bodies if needed.
- [ ] **Modify `frontend/src/components/FlashcardDisplay.tsx`:**
    - [ ] Update props if `Flashcard` type changed (`id`).
    - [ ] Modify `handleGetHint` to pass `id` to `api.fetchHint(id)`.
- [ ] **Modify `frontend/src/components/PracticeView.tsx`:**
    - [ ] Update state if `Flashcard` type changed.
    - [ ] Modify `handleAnswer` to pass `currentCard.id` and difficulty string to `api.submitAnswer(id, difficulty)`.
    - [ ] Modify `loadPracticeCards` to handle card IDs.
    - [ ] Test basic practice loop functionality after frontend refactoring.

## Phase 5: Browser Extension (New Feature)
- [ ] Set up basic Chrome Extension structure (`manifest.json`, icons)
- [ ] Create `manifest.json`
- [ ] Implement content script (`content.js`)
- [ ] Implement popup (`popup.html`, `popup.css`, `popup.js`) calling background script
- [ ] Implement background service worker (`background.js`) calling the backend API (`POST/PUT /api/flashcards`)
- [ ] Set up message passing
- [ ] Test extension manually

## Phase 6: Hand Gesture Integration (New Feature)
- [ ] Install TensorFlow.js dependencies in frontend
- [ ] Update `PracticeView.tsx` UI (camera button, preview, indicator)
- [ ] Implement camera setup logic in `PracticeView.tsx`
- [ ] Implement hand pose detection loop in `PracticeView.tsx`
- [ ] Implement gesture mapping logic
- [ ] Implement hold-to-confirm logic
- [ ] Implement inactivity timer logic
- [ ] Integrate gesture submission with `api.submitAnswer`
- [ ] Test gestures manually

## Phase 7: Progress View Frontend (New Feature)
- [ ] Create `ProgressView.tsx` component
- [ ] Add UI elements for stats display and optional date inputs
- [ ] Implement state and `useEffect` to call `api.fetchProgress`
- [ ] Render statistics from API response
- [ ] Handle loading/error states
- [ ] Integrate `ProgressView` into `App.tsx` (potentially with routing)
- [ ] Write component tests for `ProgressView`

## Phase 8: Final Wiring & Testing
- [ ] Perform comprehensive E2E testing manually for all key user flows
- [ ] Refine UI/UX
- [ ] Review code
- [ ] Add/improve automated tests
- [ ] Final code cleanup and documentation review
```

This revised `TODO.md` now accurately reflects the "start backend from scratch" approach while still guiding the necessary modifications to your existing frontend later.