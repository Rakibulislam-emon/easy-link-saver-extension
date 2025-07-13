// Background script for LinkVault Chrome Extension

// Handle extension installation
// Remove duplicate onInstalled listener
chrome.runtime.onInstalled.addListener((details) => {
    if (details.reason === 'install') {
        console.log('LinkVault extension installed');
        chrome.storage.local.set({
            links: [],
            installDate: new Date().toISOString()
        });
        
        // Create context menu
        chrome.contextMenus.create({
            id: 'addToLinkVault',
            title: 'Add to LinkVault',
            contexts: ['link']
        });
    }
});

// Handle extension startup
chrome.runtime.onStartup.addListener(() => {
    console.log('LinkVault extension started');
});

// Handle messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    switch (request.action) {
        case 'getStorageData':
            chrome.storage.local.get(null, (data) => {
                sendResponse({ data: data });
            });
            return true; // Keep message channel open for async response
            
        case 'setStorageData':
            chrome.storage.local.set(request.data, () => {
                sendResponse({ success: true });
            });
            return true;
            
        case 'clearStorage':
            chrome.storage.local.clear(() => {
                sendResponse({ success: true });
            });
            return true;
            
        default:
            sendResponse({ error: 'Unknown action' });
    }
});

// Handle context menu (optional feature for future enhancement)
chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: 'addToLinkVault',
        title: 'Add to LinkVault',
        contexts: ['link']
    });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === 'addToLinkVault') {
        // Open popup with the link pre-filled
        chrome.action.openPopup();
    }
});

// Monitor storage changes for debugging
chrome.storage.onChanged.addListener((changes, namespace) => {
    console.log('Storage changed:', changes, 'in', namespace);
});