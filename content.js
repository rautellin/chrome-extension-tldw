// Content script for YouTube transcript extraction

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    sendResponse(getVideoInfo());
  } else if (request.action === 'getTranscript') {
    sendResponse(getTranscriptUrl());
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

// Extract caption track URL from ytInitialPlayerResponse embedded in page scripts
function getTranscriptUrl() {
  for (const script of document.querySelectorAll('script')) {
    const text = script.textContent;
    if (!text.includes('ytInitialPlayerResponse')) continue;

    const eqIdx = text.indexOf('=', text.indexOf('ytInitialPlayerResponse'));
    if (eqIdx === -1) continue;

    const jsonStart = text.indexOf('{', eqIdx);
    if (jsonStart === -1) continue;

    let depth = 0, jsonEnd = -1;
    for (let i = jsonStart; i < text.length; i++) {
      if (text[i] === '{') depth++;
      else if (text[i] === '}' && --depth === 0) { jsonEnd = i + 1; break; }
    }
    if (jsonEnd === -1) continue;

    try {
      const playerResponse = JSON.parse(text.slice(jsonStart, jsonEnd));
      const tracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      if (!tracks?.length) return { error: 'No captions available for this video.' };

      const track = tracks.find(t => t.languageCode === 'en') ||
                    tracks.find(t => t.languageCode?.startsWith('en')) ||
                    tracks[0];
      return { captionUrl: track.baseUrl };
    } catch (e) {
      continue;
    }
  }
  return { error: 'Could not find video data. Please refresh the page and try again.' };
}

console.log('[TLDW] Content script loaded');
