// DOM Elements
const elements = {
  // Views
  setupView: document.getElementById('setup-view'),
  summaryView: document.getElementById('summary-view'),
  settingsView: document.getElementById('settings-view'),
  
  // Setup
  apiKeyInput: document.getElementById('api-key-input'),
  saveKeyBtn: document.getElementById('save-key-btn'),
  toggleVisibility: document.getElementById('toggle-visibility'),
  
  // Summary states
  notYoutube: document.getElementById('not-youtube'),
  readyState: document.getElementById('ready-state'),
  loadingState: document.getElementById('loading-state'),
  resultState: document.getElementById('result-state'),
  transcriptState: document.getElementById('transcript-state'),
  errorState: document.getElementById('error-state'),
  
  // Video info
  videoThumbnail: document.getElementById('video-thumbnail'),
  videoTitle: document.getElementById('video-title'),
  videoChannel: document.getElementById('video-channel'),
  
  // Actions
  summarizeBtn: document.getElementById('summarize-btn'),
  transcriptBtn: document.getElementById('transcript-btn'),
  copyBtn: document.getElementById('copy-btn'),
  copyTranscriptBtn: document.getElementById('copy-transcript-btn'),
  newSummaryBtn: document.getElementById('new-summary-btn'),
  backToVideoBtn: document.getElementById('back-to-video-btn'),
  retryBtn: document.getElementById('retry-btn'),

  // Result
  summaryContent: document.getElementById('summary-content'),
  transcriptContent: document.getElementById('transcript-content'),
  loadingStatus: document.getElementById('loading-status'),
  errorMessage: document.getElementById('error-message'),
  
  // Settings
  settingsBtn: document.getElementById('settings-btn'),
  backBtn: document.getElementById('back-btn'),
  settingsApiKey: document.getElementById('settings-api-key'),
  settingsToggleVisibility: document.getElementById('settings-toggle-visibility'),
  summaryLength: document.getElementById('summary-length'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  clearKeyBtn: document.getElementById('clear-key-btn'),
  
  // Toast
  toast: document.getElementById('toast')
};

// State
let currentVideoId = null;
let currentTranscript = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const apiKey = await getStoredApiKey();
  
  if (apiKey) {
    showSummaryView();
    checkCurrentTab();
  } else {
    showSetupView();
  }
  
  // Load settings
  const settings = await getSettings();
  elements.summaryLength.value = settings.summaryLength || 'standard';
  
  setupEventListeners();
}

// Event Listeners
function setupEventListeners() {
  // Setup view
  elements.saveKeyBtn.addEventListener('click', handleSaveApiKey);
  elements.toggleVisibility.addEventListener('click', () => togglePasswordVisibility(elements.apiKeyInput));
  elements.apiKeyInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSaveApiKey();
  });
  
  // Summary view
  elements.summarizeBtn.addEventListener('click', handleSummarize);
  elements.transcriptBtn.addEventListener('click', handleGetTranscript);
  elements.copyBtn.addEventListener('click', handleCopy);
  elements.copyTranscriptBtn.addEventListener('click', handleCopyTranscript);
  elements.newSummaryBtn.addEventListener('click', handleSummarize);
  elements.backToVideoBtn.addEventListener('click', () => {
    showSummaryView();
    checkCurrentTab();
  });
  elements.retryBtn.addEventListener('click', handleSummarize);
  
  // Settings
  elements.settingsBtn.addEventListener('click', showSettingsView);
  elements.backBtn.addEventListener('click', () => {
    showSummaryView();
    checkCurrentTab();
  });
  elements.settingsToggleVisibility.addEventListener('click', () => togglePasswordVisibility(elements.settingsApiKey));
  elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);
  elements.clearKeyBtn.addEventListener('click', handleClearKey);
}

// Storage functions
async function getStoredApiKey() {
  const result = await chrome.storage.local.get(['openaiApiKey']);
  return result.openaiApiKey;
}

async function setStoredApiKey(key) {
  await chrome.storage.local.set({ openaiApiKey: key });
}

async function getSettings() {
  const result = await chrome.storage.local.get(['summaryLength']);
  return {
    summaryLength: result.summaryLength || 'standard'
  };
}

async function saveSettings(settings) {
  await chrome.storage.local.set(settings);
}

// View management
function hideAllViews() {
  elements.setupView.classList.add('hidden');
  elements.summaryView.classList.add('hidden');
  elements.settingsView.classList.add('hidden');
}

function hideAllStates() {
  elements.notYoutube.classList.add('hidden');
  elements.readyState.classList.add('hidden');
  elements.loadingState.classList.add('hidden');
  elements.resultState.classList.add('hidden');
  elements.transcriptState.classList.add('hidden');
  elements.errorState.classList.add('hidden');
}

function showSetupView() {
  hideAllViews();
  elements.setupView.classList.remove('hidden');
}

function showSummaryView() {
  hideAllViews();
  elements.summaryView.classList.remove('hidden');
}

function showSettingsView() {
  hideAllViews();
  elements.settingsView.classList.remove('hidden');
  
  // Load current API key (masked)
  getStoredApiKey().then(key => {
    if (key) {
      elements.settingsApiKey.value = key;
    }
  });
}

function showState(state) {
  hideAllStates();
  state.classList.remove('hidden');
}

// Tab checking
async function checkCurrentTab() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    if (!tab?.url?.includes('youtube.com/watch')) {
      showState(elements.notYoutube);
      return;
    }
    
    // Extract video ID
    const url = new URL(tab.url);
    const videoId = url.searchParams.get('v');
    
    if (!videoId) {
      showState(elements.notYoutube);
      return;
    }
    
    currentVideoId = videoId;
    
    // Get video info from content script
    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });
      
      if (response && response.title) {
        elements.videoTitle.textContent = response.title;
        elements.videoChannel.textContent = response.channel || 'YouTube';
        elements.videoThumbnail.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/mqdefault.jpg)`;
      } else {
        elements.videoTitle.textContent = 'YouTube Video';
        elements.videoChannel.textContent = 'Loading...';
        elements.videoThumbnail.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/mqdefault.jpg)`;
      }
    } catch (e) {
      // Content script might not be loaded yet
      elements.videoTitle.textContent = 'YouTube Video';
      elements.videoChannel.textContent = '';
      elements.videoThumbnail.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/mqdefault.jpg)`;
    }
    
    showState(elements.readyState);
    
  } catch (error) {
    console.error('Error checking tab:', error);
    showState(elements.notYoutube);
  }
}

// API Key handling
async function handleSaveApiKey() {
  const apiKey = elements.apiKeyInput.value.trim();
  
  if (!apiKey) {
    showToast('Please enter an API key', 'error');
    return;
  }
  
  if (!apiKey.startsWith('sk-')) {
    showToast('Invalid API key format', 'error');
    return;
  }
  
  elements.saveKeyBtn.disabled = true;
  elements.saveKeyBtn.textContent = 'Validating...';
  
  // Validate API key
  const isValid = await validateApiKey(apiKey);
  
  if (isValid) {
    await setStoredApiKey(apiKey);
    showToast('API key saved!', 'success');
    showSummaryView();
    checkCurrentTab();
  } else {
    showToast('Invalid API key', 'error');
  }
  
  elements.saveKeyBtn.disabled = false;
  elements.saveKeyBtn.textContent = 'Save & Continue';
}

async function validateApiKey(apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Settings handling
async function handleSaveSettings() {
  const apiKey = elements.settingsApiKey.value.trim();
  const summaryLength = elements.summaryLength.value;
  
  if (apiKey && !apiKey.startsWith('sk-')) {
    showToast('Invalid API key format', 'error');
    return;
  }
  
  if (apiKey) {
    const isValid = await validateApiKey(apiKey);
    if (!isValid) {
      showToast('Invalid API key', 'error');
      return;
    }
    await setStoredApiKey(apiKey);
  }
  
  await saveSettings({ summaryLength });
  showToast('Settings saved!', 'success');
}

async function handleClearKey() {
  await chrome.storage.local.remove(['openaiApiKey']);
  showToast('API key removed', 'success');
  showSetupView();
  elements.apiKeyInput.value = '';
}

// Fetch transcript from content script (shared helper)
async function fetchTranscript() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  let transcriptResponse;
  try {
    transcriptResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getTranscript' });
  } catch (e) {
    await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
    await new Promise(resolve => setTimeout(resolve, 500));
    transcriptResponse = await chrome.tabs.sendMessage(tab.id, { action: 'getTranscript' });
  }

  if (!transcriptResponse || !transcriptResponse.transcript) {
    throw new Error(transcriptResponse?.error || 'Could not fetch transcript. Make sure the video has captions enabled.');
  }

  return transcriptResponse.transcript;
}

// Get transcript only
async function handleGetTranscript() {
  showState(elements.loadingState);
  elements.loadingStatus.textContent = 'Fetching transcript...';

  try {
    currentTranscript = await fetchTranscript();
    elements.transcriptContent.textContent = currentTranscript;
    showState(elements.transcriptState);
  } catch (error) {
    console.error('Transcript error:', error);
    elements.errorMessage.textContent = error.message || 'Failed to fetch transcript. Please try again.';
    showState(elements.errorState);
  }
}

// Summarize handling
async function handleSummarize() {
  showState(elements.loadingState);
  elements.loadingStatus.textContent = 'Fetching transcript...';

  try {
    currentTranscript = await fetchTranscript();
    elements.loadingStatus.textContent = 'Generating summary...';

    const apiKey = await getStoredApiKey();
    const settings = await getSettings();
    const summary = await generateSummary(currentTranscript, apiKey, settings.summaryLength);

    elements.summaryContent.innerHTML = formatSummary(summary);
    showState(elements.resultState);
  } catch (error) {
    console.error('Summarize error:', error);
    elements.errorMessage.textContent = error.message || 'Failed to generate summary. Please try again.';
    showState(elements.errorState);
  }
}

async function generateSummary(transcript, apiKey, length) {
  const lengthInstructions = {
    brief: 'Provide a very brief summary in 2-3 sentences.',
    standard: 'Provide a concise summary in one paragraph (4-6 sentences).',
    detailed: 'Provide a detailed summary with key points organized in multiple paragraphs or bullet points.'
  };
  
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `You are a helpful assistant that creates TLDR summaries of video transcripts. ${lengthInstructions[length]} Focus on the main points and key takeaways. Be clear and informative.`
        },
        {
          role: 'user',
          content: `Please provide a TLDR summary of this video transcript:\n\n${transcript.substring(0, 15000)}`
        }
      ],
      max_tokens: 500,
      temperature: 0.7
    })
  });
  
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate summary');
  }
  
  const data = await response.json();
  return data.choices[0].message.content;
}

function formatSummary(text) {
  // Convert markdown-like formatting to HTML
  return text
    .split('\n\n')
    .map(para => {
      // Handle bullet points
      if (para.startsWith('- ') || para.startsWith('• ')) {
        const items = para.split('\n').map(item => 
          `<li>${item.replace(/^[-•]\s*/, '')}</li>`
        ).join('');
        return `<ul>${items}</ul>`;
      }
      // Handle numbered lists
      if (/^\d+\.\s/.test(para)) {
        const items = para.split('\n').map(item => 
          `<li>${item.replace(/^\d+\.\s*/, '')}</li>`
        ).join('');
        return `<ol>${items}</ol>`;
      }
      // Regular paragraph
      return `<p>${para}</p>`;
    })
    .join('');
}

// Copy handling
async function handleCopy() {
  const text = elements.summaryContent.innerText;

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  } catch (error) {
    showToast('Failed to copy', 'error');
  }
}

async function handleCopyTranscript() {
  const text = elements.transcriptContent.innerText;

  try {
    await navigator.clipboard.writeText(text);
    showToast('Copied to clipboard!', 'success');
  } catch (error) {
    showToast('Failed to copy', 'error');
  }
}

// Utility functions
function togglePasswordVisibility(input) {
  input.type = input.type === 'password' ? 'text' : 'password';
}

function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} show`;
  
  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}

