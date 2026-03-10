// Content script for YouTube transcript extraction

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    sendResponse(getVideoInfo());
  }
});

// Get video info from page
function getVideoInfo() {
  try {
    const title = document.querySelector('h1.ytd-video-primary-info-renderer, h1.ytd-watch-metadata yt-formatted-string')?.textContent ||
                  document.querySelector('meta[name="title"]')?.content ||
                  document.title.replace(' - YouTube', '');

    const channel = document.querySelector('#channel-name a, #owner #text a, ytd-channel-name yt-formatted-string a')?.textContent ||
                    document.querySelector('meta[itemprop="author"]')?.content ||
                    '';

    return { title: title.trim(), channel: channel.trim() };
  } catch (error) {
    console.error('[TLDW] Error getting video info:', error);
    return { title: '', channel: '' };
  }
}

console.log('[TLDW] Content script loaded');
