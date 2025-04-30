// extension/background.ts

console.log("Background service worker started (background.ts).");

// Define backend base URL (consider making this configurable later)
// Ensure this matches where your backend is running!
const API_BASE_URL = 'http://localhost:3001/api'; // Adjust port if needed

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background: Received message:", request);

    if (request.action === "saveCard" || request.action === "updateCard") {
        const cardData = request.data; // { front, back, hint, tags }
        const cardId = request.cardId; // Only present for updateCard
        const isUpdate = request.action === "updateCard";

        // --- Make the REAL API Call ---
        (async () => { // Use an async IIFE (Immediately Invoked Function Expression)
            let responseData: any; // To hold the final response sent back to popup
            try {
                const apiUrl = isUpdate
                    ? `${API_BASE_URL}/flashcards/${cardId}` // URL for PUT
                    : `${API_BASE_URL}/flashcards`;        // URL for POST

                const method = isUpdate ? 'PUT' : 'POST'; // Correct HTTP method

                // Prepare body expected by the backend handler
                const bodyToSend = {
                    cardFront: cardData.front,
                    cardBack: cardData.back,
                    hint: cardData.hint, // Pass hint as is (null or string)
                    tags: cardData.tags   // Pass tags array as is
                };

                console.log(`Background: Making ${method} request to ${apiUrl}`);
                console.log(`Background: Sending body:`, bodyToSend);

                const response = await fetch(apiUrl, {
                    method: method,
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(bodyToSend)
                });

                console.log(`Background: Received API response status: ${response.status}`);

                let responseBody;
                try {
                     responseBody = await response.json();
                     console.log("Background: Parsed API response body:", responseBody);
                } catch (e) {
                     console.warn("Background: Could not parse API response as JSON.", await response.text());
                     responseBody = null; // Or handle text response
                }


                if (!response.ok) {
                    // Handle HTTP errors (4xx, 5xx)
                    const errorMsg = responseBody?.message || responseBody?.error || `HTTP error ${response.status}`;
                    throw new Error(errorMsg); // Throw an error to be caught below
                }

                // Success case (200 OK for PUT, 201 Created for POST)
                responseData = {
                    success: true,
                    card: responseBody // Backend returns the created/updated card
                };

            } catch (error: any) {
                console.error(`Background: API call failed for ${request.action}:`, error);
                responseData = {
                    success: false,
                    message: `API Error: ${error.message}` // Send error message back
                };
            }

            console.log("Background: Sending response back to sender:", responseData);
            sendResponse(responseData); // Send the result back to the popup

        })(); // Immediately invoke the async function

        return true; // IMPORTANT: Keep message channel open for async response
        // --- End REAL API Call ---

    }
    // Handle other actions if needed...
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Flashcard Creator extension installed/updated.');
});