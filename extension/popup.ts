console.log("Popup script loaded (popup.ts).");

const POPUP_TEMP_SELECTED_TEXT_KEY = 'tempSelectedText';

interface PopupFormData {
    front: string;
    back: string;
    hint: string | null;
    tags: string[];
}

interface SaveMessage {
    action: "saveCard" | "updateCard";
    cardId?: string | null;
    data: PopupFormData;
}

interface BackgroundResponse {
    success: boolean;
    message?: string;
    card?: { id: string; [key: string]: any };
}

const form = document.getElementById('flashcard-form') as HTMLFormElement | null;
const frontInput = document.getElementById('cardFront') as HTMLTextAreaElement | null;
const backInput = document.getElementById('cardBack') as HTMLTextAreaElement | null;
const hintInput = document.getElementById('hint') as HTMLInputElement | null;
const tagsInput = document.getElementById('tags') as HTMLInputElement | null;
const messageArea = document.getElementById('messageArea');
const saveButton = document.getElementById('saveButton') as HTMLButtonElement | null;

let currentCardId: string | null = null;
let isSubmitting = false;

function showMessage(message: string, type: 'info' | 'success' | 'error' = 'info') {
    if (!messageArea) return;
    messageArea.textContent = message;
    messageArea.className = `message ${type}`;
}

function disableForm(disabled: boolean) {
    [frontInput, backInput, hintInput, tagsInput, saveButton].forEach(element => {
        if (element) element.disabled = disabled;
    });
}

(async () => {
    console.log("Popup: Checking for pre-filled text in storage...");
    try {
        const result = await chrome.storage.local.get(POPUP_TEMP_SELECTED_TEXT_KEY);
        if (result && result[POPUP_TEMP_SELECTED_TEXT_KEY]) {
            const storedText = result[POPUP_TEMP_SELECTED_TEXT_KEY];
            console.log("Popup: Found stored text:", storedText);
            if (backInput) {
                backInput.value = storedText;
                console.log("Popup: Pre-filled 'Back' textarea.");
            } else {
                console.error("Popup: Could not find 'Back' textarea element to pre-fill.");
            }
            await chrome.storage.local.remove(POPUP_TEMP_SELECTED_TEXT_KEY);
            console.log("Popup: Removed temporary text from storage.");
        } else {
            console.log("Popup: No pre-filled text found in storage.");
        }
    } catch (error: any) {
        console.error("Popup: Error accessing storage:", error);
        showMessage("Error retrieving selected text.", "error");
    }
})();

if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault();
        if (isSubmitting) return;

        showMessage('');
        disableForm(true);

        if (!frontInput?.value || !backInput?.value) {
            showMessage('Front and Back text are required.', 'error');
            disableForm(false);
            return;
        }

        const cardData: PopupFormData = {
            front: frontInput.value.trim(),
            back: backInput.value.trim(),
            hint: hintInput?.value.trim() || null,
            tags: tagsInput?.value
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(tag => tag !== '') || []
        };

        const message: SaveMessage = {
            action: currentCardId ? "updateCard" : "saveCard",
            cardId: currentCardId,
            data: cardData
        };

        console.log('Popup: Sending message to background:', message);

        try {
            const response: BackgroundResponse | undefined = await chrome.runtime.sendMessage(message);
            console.log('Popup: Received response from background:', response);

            if (response?.success && response.card) {
                showMessage(`Card ${message.action === 'updateCard' ? 'updated' : 'created'} successfully!`, 'success');
                if (message.action === 'saveCard' && response.card.id) {
                    currentCardId = response.card.id;
                    console.log("Popup: Stored new card ID for this session:", currentCardId);
                    if (saveButton) saveButton.textContent = "Update Card";
                }
            } else {
                showMessage(response?.message || 'Failed to save card. Background script error.', 'error');
            }
        } catch (error: any) {
            console.error("Popup: Error sending message or receiving response:", error);
            showMessage(`Error communicating with extension background: ${error.message}`, 'error');
        } finally {
            disableForm(false);
        }
    });
} else {
    console.error("Popup: Could not find the flashcard form element.");
}

console.log("Popup script execution finished.");
