# Flashcard Learner: Spaced Repetition with Gesture Input

This project is a web-based flashcard learning application implementing a Modified Leitner spaced repetition system. It features a React frontend, a Node.js/Express backend using Supabase for persistence, and a Chrome extension for quick card creation. A key feature is the ability to rate card difficulty using hand gestures detected via webcam and TensorFlow.js.

## Features

**Core Learning:**
*   **Spaced Repetition:** Implements a Modified Leitner system where cards move between buckets based on recall difficulty, determining the next review interval.
*   **Daily Practice Sessions:** Fetches cards due for review each "day" (day counter managed by the backend).
*   **Card Hints:** Supports optional hints for flashcards.

**Backend:**
*   **Persistent Storage:** Uses Supabase (PostgreSQL) to store flashcards, practice history, and system state (current day).
*   **RESTful API:** Provides endpoints for managing practice sessions, updating card progress, managing cards (CRUD), fetching hints, and retrieving progress statistics.
*   **Database Functions:** Utilizes PostgreSQL functions for efficient querying (e.g., fetching practice cards, calculating stats).

**Frontend:**
*   **Practice View:** Displays flashcards due for the current day, allows showing the answer, and submitting difficulty ratings.
*   **Hand Gesture Input:** Integrates with webcam and TensorFlow.js Hand Pose Detection to allow rating cards ('Easy', 'Hard', 'Wrong') via hand gestures (Thumbs Up, Flat Hand, Thumbs Down) with a hold-to-confirm mechanism.
*   **Progress View:** Displays learning statistics including total cards, cards per bucket, cards due today, and recall accuracy over a selectable date range.

**Browser Extension (Chrome):**
*   **Quick Card Creation:** Allows users to highlight text on any webpage and trigger a popup to create a new flashcard, pre-filling the 'Back' field.
*   **Card Updates:** Supports updating the created card directly from the extension popup.
*   **Backend Integration:** Communicates with the backend API to save and update flashcards.

## Tech Stack

*   **Frontend:** React, Vite, TypeScript, Axios, TensorFlow.js (`@tensorflow/tfjs`, `@tensorflow-models/hand-pose-detection`), CSS Modules
*   **Backend:** Node.js, Express, TypeScript, Supabase Client (`@supabase/supabase-js`), CORS, Dotenv
*   **Database:** Supabase (PostgreSQL)
*   **Extension:** Chrome Extension APIs (Manifest V3), TypeScript
*   **Testing:** Jest, Supertest (Backend Integration)

## Project Structure

## Setup and Installation

**Prerequisites:**
*   Node.js and npm (or yarn)
*   Google Chrome (for the extension)

**1. Clone the Repository:**

## Setup and Installation

**Prerequisites:**
*   Node.js and npm (or yarn) installed.
*   Google Chrome browser installed.


**Step 1: Clone the Repositor**

git clone <repository-url>
cd <repository-directory>

**Step 2: Backend instalation**
npm install -y

**Step 3: FrontEnd instalation**
npm install -y

**Step 4: extension instalation**
npm install -y
npm run watch

**Step 5: extension setup**
add extension to browser
ctrl + R is needed if create flashcard button is not shown.

**Step 6: Backend run**
npm run dev

**Step 7: Frontend run**
npm run dev