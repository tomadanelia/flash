console.log("Flashcard Creator: Content script loaded!");

let createButton: HTMLButtonElement | null = null;
let ignoreNextDocumentMouseUp = false; 
function showCreateButton(x: number, y: number) {
    if (createButton) {
        removeCreateButton();
    }

    const newButton = document.createElement('button');
    newButton.textContent = 'Create Flashcard';
    newButton.id = 'flashcard-creator-button'; 
    newButton.style.position = 'absolute';
    newButton.style.left = `${x}px`;
    newButton.style.top = `${y}px`;
    newButton.style.zIndex = '99999';

    newButton.addEventListener('click', handleButtonClick);

    createButton = newButton;
    if (document.body) {
        document.body.appendChild(createButton);
    } else {
        console.error("Flashcard Creator Error: document.body is null, cannot append button!");
        createButton = null;
    }
}

function removeCreateButton() {
    if (createButton && createButton.parentNode) {
        createButton.removeEventListener('click', handleButtonClick);
        try {
            createButton.parentNode.removeChild(createButton);
        } catch (e) {
            console.error("Flashcard Creator Error removing button from DOM:", e);
        }
    } else if (createButton) {
        console.warn("Flashcard Creator Warning: removeCreateButton called, button exists but has no parentNode?");
    }
    createButton = null;
}

function handleButtonClick(event: MouseEvent) {
    ignoreNextDocumentMouseUp = true;

    const selectedText = window.getSelection()?.toString().trim();

    if (selectedText) {
     
       
        chrome.runtime.sendMessage({
            action: "initiateCardCreation",
            selectedText: selectedText
        }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Flashcard Creator Error sending message:", chrome.runtime.lastError.message);
            } else {
                console.log("Message sent, response from background:", response); // Useful for confirming background received it
            }
        });
    } else {
        console.warn("Flashcard Creator Warning: Button clicked but no text selected?");
    }

    removeCreateButton();
}

document.addEventListener('mouseup', (event) => {
    setTimeout(() => {
        if (ignoreNextDocumentMouseUp) {
            ignoreNextDocumentMouseUp = false; 
            return; 
        }

        const selection = window.getSelection();
        const selectedText = selection ? selection.toString().trim() : "";

        if (selectedText && selectedText.length > 0) {
            const buttonX = event.pageX + 5; 
            const buttonY = event.pageY + 5;
            showCreateButton(buttonX, buttonY);
        } else {
           
            removeCreateButton();
        }
    }, 0); 
});
