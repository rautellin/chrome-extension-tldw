// Background service worker for TLDW extension

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('TLDW extension installed');
  }
});

console.log('TLDW background service worker loaded');
