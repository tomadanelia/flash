# TODO - TDD: Integration Tests for POST /api/day/next

This checklist focuses on setting up and writing integration tests for the day increment endpoint using Jest and Supertest, interacting with a test database.

## Phase T1: Test Environment Setup

### Chunk T1.1: Install Testing Dependencies
- [ ] Install Jest (Test Runner): `npm install -D jest @types/jest`
- [ ] Install ts-jest (for TypeScript support): `npm install -D ts-jest`
- [ ] Install Supertest (HTTP testing library): `npm install -D supertest @types/supertest`

### Chunk T1.2: Configure Jest
- [ ] Create Jest configuration file: Run `npx ts-jest config:init` *or* manually create `jest.config.js` in the backend root.
- [ ] **Review/Modify `jest.config.js`:**
    - [ ] Ensure `preset: 'ts-jest'` is present.
    *   [ ] Ensure `testEnvironment: 'node'` is set.
    *   [ ] Configure `testMatch` (or use Jest defaults) to find test files (e.g., `"**/tests/**/*.test.ts"` or `"**/?(*.)+(spec|test).ts"`).
    *   [ ] *(Optional but recommended)* Add setup/teardown file configuration if needed for global test DB setup (see later steps).

### Chunk T1.3: Set up Test Database
- [ ] **Option A: Use a Separate Supabase Project (Recommended for isolation)**
    - [ ] Create a *second*, separate Supabase project specifically for testing (e.g., "flashcard-app-test"). It can be on the free tier.
    - [ ] Get the URL and `anon` Key for this **test** project.
    - [ ] Create a `.env.test` file in your backend root.
    - [ ] Add `SUPABASE_URL=YOUR_TEST_PROJECT_URL` and `SUPABASE_KEY=YOUR_TEST_PROJECT_ANON_KEY` to `.env.test`.
    - [ ] **Manually run your `schema.sql` script** in the SQL Editor of this **test** project to create the tables.
- **Choose Option A for simplicity initially.** Ensure `schema.sql` is applied to the test project.

### Chunk T1.4: Configure Test Script in `package.json`
- [ ] **Add/Update the `"test"` script:**
    - [ ] Modify it to load the test environment variables before running Jest. Use a tool like `dotenv-cli` or platform-specific commands.
        ```json
        // Example using dotenv-cli (install: npm install -D dotenv-cli)
        "scripts": {
          "dev": "...",
          "build": "...",
          "test": "dotenv -e .env.test -- jest --runInBand"
        },
        // Example using cross-env (install: npm install -D cross-env) - Simpler for cross-platform
        "scripts": {
           "dev": "...",
           "build": "...",
           "test": "cross-env SUPABASE_URL=YOUR_TEST_URL SUPABASE_KEY=YOUR_TEST_KEY jest --runInBand" // Less ideal, leaks secrets
         },
         // Example using separate setup file (Best, see below)
         "scripts": {
           "dev": "...",
           "build": "...",
           "test": "jest --runInBand" // If Jest config handles env loading
         },

        ```
    *   `--runInBand`: Often useful for integration tests that modify shared state (like a DB) to run them sequentially, not in parallel.
- [ ] **(Recommended Alternative for Env Vars):** Configure Jest (`jest.config.js`) to use a setup file (`globalSetup` or `setupFilesAfterEnv`) that loads `.env.test` using `dotenv`. This avoids complex script commands.
    ```javascript
    // Example jest.config.js addition (if using setupFilesAfterEnv)
    module.exports = {
      // ... other jest config ...
      setupFilesAfterEnv: ['./tests/setupEnv.ts'], // Path to your setup file
    };
    // Example tests/setupEnv.ts
    import dotenv from 'dotenv';
    import path from 'path';
    dotenv.config({ path: path.resolve(__dirname, '../.env.test') });
    ```

## Phase T2: Write the Integration Test

### Chunk T2.1: Create Test File Structure
- [ ] Create a `tests` directory in your backend root (if not already done).
- [ ] Create an `integration` subdirectory inside `tests`.
- [ ] Create the test file: `tests/integration/day.test.ts`.

### Chunk T2.2: Write Test Setup/Teardown Logic
- [ ] Inside `tests/integration/day.test.ts`:
    - [ ] Import `supertest` (`request`).
    - [ ] Import your Express `app` from `src/server.ts`.
    *   [ ] Import the `supabase` client (it should now be configured via `.env.test` loaded by Jest setup).
    *   [ ] Use Jest's `beforeEach` or `beforeAll` hooks:
        *   Connect to the test database (if needed, often handled by client import).
        *   **Crucially:** Reset the state of the `system_state` table to ensure `current_day` is `0` before *each* test runs (e.g., `await supabase.from('system_state').update({ current_day: 0 }).eq('id', 1);`).
    *   [ ] *(Optional)* Use Jest's `afterAll` hook to close DB connections if necessary.

### Chunk T2.3: Write the Success Case Test
- [ ] Define a test block: `test('POST /api/day/next should increment day and return 200', async () => { ... });`
- [ ] **Arrange:** (Database state is reset by `beforeEach`).
- [ ] **Act:** Use `supertest` to send the request: `const response = await request(app).post('/api/day/next');`
- [ ] **Assert (Response):**
    - [ ] Check status code: `expect(response.statusCode).toBe(200);`
    - [ ] Check response body structure and values: `expect(response.body).toEqual({ message: 'Day incremented successfully', currentDay: 1 });`
- [ ] **Assert (Database State):**
    *   [ ] Query the test database *after* the request: `const { data } = await supabase.from('system_state').select('current_day').eq('id', 1).single();`
    *   [ ] Check the value: `expect(data?.current_day).toBe(1);`

### Chunk T2.4: Write Error Case Tests (Optional but Recommended)
- [ ] Define test blocks for potential errors (though harder to reliably trigger DB errors in integration tests):
    *   Test what happens if the `system_state` row `id=1` is missing (might require deleting it in `beforeEach` for that specific test). Assert a 500 response and the correct error body.
    *   *(Advanced)* Simulating a database *connection* error during the update might require mocking at a lower level or specific test DB configurations, often skipped in basic integration tests.

## Phase T3: Run and Refine
- [ ] Run the tests using `npm run test`.
- [ ] Debug any failures in the test code or the application code.
- [ ] Refactor test code for clarity if needed.

---

**Do you need Mocha?**

No. Jest is a very popular, all-in-one testing framework for JavaScript/TypeScript. It includes a test runner, assertion library (`expect`), and mocking capabilities. You don't *need* Mocha if you choose Jest. Mocha is another popular runner, often used with separate assertion libraries (like Chai) and mocking libraries (like Sinon). Sticking with Jest is perfectly fine and common.

**Separate Database? How to Use?**

*   **Yes, strongly recommended.** Using your development database for automated tests is risky – tests might delete or modify real data, or leftover test data could interfere with development.
*   **How:**
    1.  Create a second project on Supabase (as outlined in Option A).
    2.  Run your `schema.sql` against *this second project*.
    3.  Create `.env.test` with the URL/Key for the *second project*.
    4.  Configure Jest (via `dotenv-cli` or a setup file) to load `.env.test` when `npm run test` is executed.
    5.  Your tests (using the imported `supabase` client) will automatically talk to the test database because the environment variables loaded by Jest point there.
    6.  Use `beforeEach` in your tests to clean up/reset data *in the test database* before each test runs (like resetting `current_day` to 0).

This setup ensures your tests run in an isolated environment without affecting your development data.