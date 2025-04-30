// extension/popup.ts

console.log("Popup script loaded (popup.ts).");


interface PopupFormData {
    front: string;
    back: string;
    hint: string | null;
    tags: string[]; // Processed tags array
}

interface SaveMessage {
    action: "saveCard" | "updateCard"; // Differentiate create vs update
    cardId?: string | null; // Include ID only for updates
    data: PopupFormData;
}

// Shape of the expected response FROM background
interface BackgroundResponse {
    success: boolean;
    message?: string; // Optional error/success message from background
    card?: { id: string; [key: string]: any }; // Include card on success, esp. ID
}

// --- DOM References ---
const form = document.getElementById('flashcard-form') as HTMLFormElement | null;
const frontInput = document.getElementById('cardFront') as HTMLTextAreaElement | null;
const backInput = document.getElementById('cardBack') as HTMLTextAreaElement | null;
const hintInput = document.getElementById('hint') as HTMLInputElement | null;
const tagsInput = document.getElementById('tags') as HTMLInputElement | null;
const messageArea = document.getElementById('messageArea');
const saveButton = document.getElementById('saveButton') as HTMLButtonElement | null;

// --- State ---
let currentCardId: string | null = null; // Used if updating a card
let isSubmitting = false; // Prevent double submission

// --- Helper Functions ---
function showMessage(message: string, type: 'info' | 'success' | 'error' = 'info') {
    if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = `message ${type}`;
    }
    console.log(`Popup Message (${type}): ${message}`);
}

function disableForm(disabled: boolean) {
    isSubmitting = disabled;
    if (saveButton) saveButton.disabled = disabled;
    if (frontInput) frontInput.disabled = disabled;
    if (backInput) backInput.disabled = disabled;
    if (hintInput) hintInput.disabled = disabled;
    if (tagsInput) tagsInput.disabled = disabled;
}

// --- Form Submission Logic ---
if (form) {
    form.addEventListener('submit', async (event) => {
        event.preventDefault(); // Stop default page reload
        if (isSubmitting) return; // Prevent double clicks

        showMessage(''); // Clear previous messages
        disableForm(true);

        if (!frontInput?.value || !backInput?.value) {
            showMessage('Front and Back text are required.', 'error');
            disableForm(false);
            return;
        }

        // Prepare data object
        const cardData: PopupFormData = {
            front: frontInput.value.trim(),
            back: backInput.value.trim(),
            hint: hintInput?.value.trim() || null,
            // Process tags: split by comma, trim, remove empty strings
            tags: tagsInput?.value
                      .split(',')
                      .map(tag => tag.trim())
                      .filter(tag => tag !== '') || []
        };

        // Construct the message for the background script
        const message: SaveMessage = {
            action: currentCardId ? "updateCard" : "saveCard", // Decide action based on ID
            cardId: currentCardId,
            data: cardData
        };

        console.log('Popup: Sending message to background:', message);

        try {
            const response: BackgroundResponse | undefined = await chrome.runtime.sendMessage(message);

            console.log('Popup: Received response from background:', response);

            if (response?.success && response.card) {
                showMessage(`Card ${message.action === 'updateCard' ? 'updated' : 'created'} successfully!`, 'success');
                // If created, store the new ID for potential subsequent updates *within this popup session*
                if (message.action === 'saveCard' && response.card.id) {
                    currentCardId = response.card.id;
                    console.log("Popup: Stored new card ID for this session:", currentCardId);
                }
                // Optional: Maybe clear the form or close popup after success?
                // window.close(); // Closes the popup
            } else {
                // Handle failure response from background
                showMessage(response?.message || 'Failed to save card. Background script error.', 'error');
            }
        } catch (error: any) {
            // Handle errors during message sending itself (e.g., background script not responding)
            console.error("Popup: Error sending message or receiving response:", error);
            showMessage(`Error communicating with extension background: ${error.message}`, 'error');
        } finally {
            disableForm(false); // Re-enable form regardless of outcome
        }
    });
} else {
    console.error("Popup: Could not find the flashcard form element.");
}



console.log("Popup script execution finished.");