
console.log("Flashcard Creator: Content script loaded!");

let createButton: HTMLButtonElement | null = null; 

function showCreateButton(x: number, y: number) {
   
    removeCreateButton();

    
    createButton = document.createElement('button');
    createButton.textContent = 'Create Flashcard';
    createButton.id = 'flashcard-creator-button'; 

    
    createButton.addEventListener('click', handleButtonClick);

    
    document.body.appendChild(createButton);
}


function removeCreateButton() {
    if (createButton && createButton.parentNode) {
        createButton.removeEventListener('click', handleButtonClick); 
        createButton.parentNode.removeChild(createButton);
        createButton = null;
    }
}


function handleButtonClick() {
    const selectedText = window.getSelection()?.toString().trim();
    console.log("Create Flashcard button clicked!");

    if (selectedText) {
        console.log("Selected Text:", selectedText);
        
        alert(`Selected: "${selectedText}"\n(Sending to background/popup not implemented yet)`); 

    } else {
        console.log("No text selected when button clicked?");
        removeCreateButton(); 
    }
}


document.addEventListener('mouseup', (event) => {
    
    setTimeout(() => {
        const selectedText = window.getSelection()?.toString().trim();

        if (selectedText && selectedText.length > 0) {
            console.log("Text selected:", selectedText);
            const buttonX = event.pageX + 5;
            const buttonY = event.pageY + 5;

            showCreateButton(buttonX, buttonY);
        } else {
            
            removeCreateButton();
        }
    }, 0); 
});


document.addEventListener('mousedown', (event) => {
    
    if (createButton && event.target !== createButton) {
        removeCreateButton();
    }
});