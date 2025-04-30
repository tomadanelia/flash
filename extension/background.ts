console.log("Background service worker started (background.ts).");

const API_BASE_URL = 'http://localhost:3001/api';
const TEMP_SELECTED_TEXT_KEY = 'tempSelectedText';

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background: Received message:", request);

    if (request.action === "initiateCardCreation") {
        console.log("Background: Received initiateCardCreation request.");
        const selectedText = request.selectedText;

        if (selectedText) {
            console.log("Background: Storing selected text:", selectedText);
            (async () => {
                try {
                    await chrome.storage.local.set({ [TEMP_SELECTED_TEXT_KEY]: selectedText });
                    console.log("Background: Selected text stored successfully.");
                    await chrome.action.openPopup();
                    console.log("Background: Popup opened.");
                    sendResponse({ success: true, message: "Popup opened with text stored." });
                } catch (error: any) {
                    console.error("Background: Error storing text or opening popup:", error);
                    sendResponse({ success: false, message: `Error: ${error.message}` });
                }
            })();
            return true;
        } else {
            console.warn("Background: Received initiateCardCreation but no selectedText provided.");
            sendResponse({ success: false, message: "No text received." });
            return false;
        }
    }

    else if (request.action === "saveCard" || request.action === "updateCard") {
        const cardData = request.data;
        const cardId = request.cardId;
        const isUpdate = request.action === "updateCard";

        (async () => {
            let responseData: any;
            try {
                const apiUrl = isUpdate
                    ? `${API_BASE_URL}/flashcards/${cardId}`
                    : `${API_BASE_URL}/flashcards`;

                const method = isUpdate ? 'PUT' : 'POST';

                const bodyToSend = {
                    cardFront: cardData.front,
                    cardBack: cardData.back,
                    hint: cardData.hint,
                    tags: cardData.tags
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
                    responseBody = null;
                }

                if (!response.ok) {
                    const errorMsg = responseBody?.message || responseBody?.error || `HTTP error ${response.status}`;
                    throw new Error(errorMsg);
                }

                responseData = {
                    success: true,
                    card: responseBody
                };

            } catch (error: any) {
                console.error(`Background: API call failed for ${request.action}:`, error);
                responseData = {
                    success: false,
                    message: `API Error: ${error.message}`
                };
            }

            console.log("Background: Sending response back to sender:", responseData);
            sendResponse(responseData);

        })();

        return true;
    }
});

chrome.runtime.onInstalled.addListener(() => {
    console.log('Flashcard Creator extension installed/updated.');
    chrome.storage.local.remove(TEMP_SELECTED_TEXT_KEY, () => {
        if (chrome.runtime.lastError) {
            console.error("Error clearing temp storage on install:", chrome.runtime.lastError);
        } else {
            console.log("Temporary storage cleared on install/update.");
        }
    });
});
