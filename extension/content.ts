
console.log("Flashcard Creator: Content script loaded!");

let createButton: HTMLButtonElement | null = null; 
function showCreateButton(x: number, y: number) {
    console.log("01 - Entering showCreateButton"); 

    if (createButton) {
        console.log("02 - Previous button existed, calling removeCreateButton."); 
        removeCreateButton();
        console.log("03 - Returned from removeCreateButton."); 
    } else {
        console.log("02b - No previous button found."); 
    }

    if (createButton !== null) {
        console.error("04 - Logic Error: createButton was not null after attempting removal!"); 
        return;
    }

    console.log("05 - Creating new button element..."); 
    const newButton = document.createElement('button');
    console.log("06 - Setting textContent..."); 
    newButton.textContent = 'Create Flashcard';
    console.log("07 - Setting ID..."); 
    newButton.id = 'flashcard-creator-button';
    console.log("08 - Setting style.position..."); 
    newButton.style.position = 'absolute';
    console.log("09 - Setting style.left..."); 
    newButton.style.left = `${x}px`;
    console.log("10 - Setting style.top..."); 
    newButton.style.top = `${y}px`;
    console.log("11 - Setting style.zIndex..."); 
    newButton.style.zIndex = '99999';

    console.log("12 - Adding click event listener..."); 
    newButton.addEventListener('click', handleButtonClick);

    createButton = newButton;
    console.log("13 - Assigned to global createButton. About to append:", createButton); // Log 13

    if (document.body) {
        console.log("14 - document.body exists. Appending child..."); // Log 14
        document.body.appendChild(createButton);
        console.log("15 - Button appended to body."); // Log 15
    } else {
        console.error("16 - Error: document.body is null, cannot append button!"); // Log 16 (Error)
        createButton = null;
    }
     console.log("17 - Exiting showCreateButton"); // Log 17
}

function removeCreateButton() {
    console.log("--- Entering removeCreateButton. Current createButton:", createButton);
    if (createButton && createButton.parentNode) {
        console.log("Removing button from parent:", createButton.parentNode);
        createButton.removeEventListener('click', handleButtonClick);
        try {
            createButton.parentNode.removeChild(createButton);
             console.log("Button removed from DOM successfully.");
        } catch (e) {
             console.error("Error removing button from DOM:", e);
        }
    } else if (createButton) {
        console.warn("removeCreateButton called, button exists but has no parentNode?");
    } else {
         console.log("removeCreateButton called, but no button exists.");
    }
    // *** End critical part ***

    createButton = null; // Clear the global reference
    console.log("--- Exiting removeCreateButton (createButton is now null) ---");
}
// Modify the function signature to accept the event
let ignoreNextDocumentMouseUp = false; // Add this global flag

function handleButtonClick(event: MouseEvent) { // <-- Add event parameter
    // Stop this click event from bubbling up to the document's mouseup listener

    const selectedText = window.getSelection()?.toString().trim();
    console.log("Create Flashcard button clicked!");

    if (selectedText) {
        console.log("Selected Text:", selectedText);

        console.log("Sending message to background to initiate card creation...");
        chrome.runtime.sendMessage({
            action: "initiateCardCreation",
            selectedText: selectedText
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Error sending message:", chrome.runtime.lastError.message);
            } else {
                console.log("Message sent, response from background:", response);
            }
        });

    } else {
        console.log("No text selected when button clicked?");
    }
    console.log("Setting ignoreNextDocumentMouseUp flag.");
    ignoreNextDocumentMouseUp = true; // Set the flag
    // Remove the button immediately after handling the click
    removeCreateButton();
}
document.addEventListener('mouseup', (event) => {
    console.log("MouseUp event detected on document.");
    setTimeout(() => {
        if (ignoreNextDocumentMouseUp) {
            console.log("Ignoring this mouseup event because flag is set.");
            ignoreNextDocumentMouseUp = false; // Reset the flag for the *next* mouseup
            return; // Stop processing this event
        }
        const selection = window.getSelection();
        console.log("Inside setTimeout - Selection object:", selection);
        const selectedText = selection ? selection.toString().trim() : "";
        console.log("Inside setTimeout - Selected text:", `"${selectedText}"`);

        if (selectedText && selectedText.length > 0) {
            console.log("Inside setTimeout - Text found, attempting to show button.");
            const buttonX = event.pageX + 5;
            const buttonY = event.pageY + 5;

            // --- Modification Here ---
            // Ensure the actual function call is active:
            showCreateButton(buttonX, buttonY);
            // --- End Modification ---

        } else {
            console.log("Inside setTimeout - No text found, removing button.");
            // If text is NOT found, we might want to remove any existing button
             removeCreateButton(); // Make sure this is called here
        }
    }, 0);
});

/*document.addEventListener('mousedown', (event) => {
    console.log("Mousedown listener fired. Target:", event.target); // Add log
    if (createButton && event.target !== createButton) {
        console.log("Mousedown removing button."); // Add log
        removeCreateButton();
    } else if (createButton && event.target === createButton) {
         console.log("Mousedown occurred ON the button, not removing."); // Add log
    } else {
         console.log("Mousedown occurred, but button didn't exist or target was button."); // Add log
    }
});
*/