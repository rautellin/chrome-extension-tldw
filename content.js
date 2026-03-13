// Content script for YouTube transcript extraction

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'getVideoInfo') {
    sendResponse(getVideoInfo());
  } else if (request.action === 'getTranscript') {
    extractTranscriptFromDOM()
      .then(transcript => sendResponse({ transcript }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep channel open for async response
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

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForElement(selector, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    const el = document.querySelector(selector);
    if (el) return el;
    await sleep(200);
  }
  return null;
}

async function extractTranscriptFromDOM() {
  // Click "Show more" expand button if present and not already expanded
  const expandBtn = document.querySelector('tp-yt-paper-button#expand');
  if (expandBtn) {
    expandBtn.click();
    await sleep(700);
  }

  // Find the "Show transcript" button
  let transcriptBtn = document.querySelector('button[aria-label="Show transcript"]');
  if (!transcriptBtn) {
    await sleep(600);
    transcriptBtn = document.querySelector('button[aria-label="Show transcript"]');
  }

  if (!transcriptBtn) {
    throw new Error('No "Show transcript" button found. This video may not have a transcript available.');
  }

  transcriptBtn.click();

  // Wait for transcript segments to appear
  const firstSegment = await waitForElement('ytd-transcript-segment-renderer', 6000);
  if (!firstSegment) {
    throw new Error('Transcript did not load. Please try again.');
  }

  await sleep(300); // Let remaining segments render

  const segments = document.querySelectorAll('ytd-transcript-segment-renderer');
  const text = Array.from(segments)
    .map(seg =>
      seg.querySelector('yt-formatted-string.segment-text')?.textContent?.trim() ||
      seg.querySelector('.segment-text')?.textContent?.trim()
    )
    .filter(Boolean)
    .join(' ');

  if (!text) {
    throw new Error('Could not extract transcript text.');
  }

  return text;
}

console.log('[TLDW] Content script loaded');
