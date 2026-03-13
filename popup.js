// DOM Elements
const elements = {
  // Views
  setupView: document.getElementById('setup-view'),
  summaryView: document.getElementById('summary-view'),
  settingsView: document.getElementById('settings-view'),

  // Setup
  setupProvider: document.getElementById('setup-provider'),
  apiKeyInput: document.getElementById('api-key-input'),
  saveKeyBtn: document.getElementById('save-key-btn'),
  toggleVisibility: document.getElementById('toggle-visibility'),
  setupHelpLink: document.getElementById('setup-help-link'),

  // Summary states
  notYoutube: document.getElementById('not-youtube'),
  readyState: document.getElementById('ready-state'),
  loadingState: document.getElementById('loading-state'),
  resultState: document.getElementById('result-state'),
  transcriptState: document.getElementById('transcript-state'),
  errorState: document.getElementById('error-state'),

  // Video info
  videoTitle: document.getElementById('video-title'),
  videoThumbnail: document.getElementById('video-thumbnail'),

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
  settingsProvider: document.getElementById('settings-provider'),
  settingsApiKey: document.getElementById('settings-api-key'),
  settingsApiKeyLabel: document.getElementById('settings-api-key-label'),
  settingsToggleVisibility: document.getElementById('settings-toggle-visibility'),
  summaryLength: document.getElementById('summary-length'),
  saveSettingsBtn: document.getElementById('save-settings-btn'),
  clearKeyBtn: document.getElementById('clear-key-btn'),

  // Toast
  toast: document.getElementById('toast')
};

const PROVIDER_CONFIG = {
  openai: {
    placeholder: 'sk-...',
    helpUrl: 'https://platform.openai.com/api-keys',
    helpText: 'Get your OpenAI API key →',
    label: 'OpenAI API Key'
  },
  claude: {
    placeholder: 'sk-ant-...',
    helpUrl: 'https://console.anthropic.com/settings/keys',
    helpText: 'Get your Claude API key →',
    label: 'Claude API Key'
  }
};

// State
let currentVideoId = null;
let currentTranscript = null;

// Initialize
document.addEventListener('DOMContentLoaded', init);

async function init() {
  const settings = await getSettings();
  const apiKey = settings.apiKey;

  if (apiKey) {
    showSummaryView();
    checkCurrentTab();
  } else {
    showSetupView();
  }

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
  elements.setupProvider.addEventListener('change', updateSetupPlaceholder);

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
  elements.settingsProvider.addEventListener('change', updateSettingsPlaceholder);
  elements.settingsToggleVisibility.addEventListener('click', () => togglePasswordVisibility(elements.settingsApiKey));
  elements.saveSettingsBtn.addEventListener('click', handleSaveSettings);
  elements.clearKeyBtn.addEventListener('click', handleClearKey);
}

function updateSetupPlaceholder() {
  const provider = elements.setupProvider.value;
  const config = PROVIDER_CONFIG[provider];
  elements.apiKeyInput.placeholder = config.placeholder;
  elements.setupHelpLink.href = config.helpUrl;
  elements.setupHelpLink.textContent = config.helpText;
}

function updateSettingsPlaceholder() {
  const provider = elements.settingsProvider.value;
  const config = PROVIDER_CONFIG[provider];
  elements.settingsApiKey.placeholder = config.placeholder;
  elements.settingsApiKeyLabel.textContent = config.label;
}

// Storage functions
async function getSettings() {
  const result = await chrome.storage.local.get(['provider', 'apiKey', 'summaryLength']);
  return {
    provider: result.provider || 'openai',
    apiKey: result.apiKey || null,
    summaryLength: result.summaryLength || 'bullet'
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
  updateSetupPlaceholder();
}

function showSummaryView() {
  hideAllViews();
  elements.summaryView.classList.remove('hidden');
}

async function showSettingsView() {
  hideAllViews();
  elements.settingsView.classList.remove('hidden');

  const settings = await getSettings();
  elements.settingsProvider.value = settings.provider;
  if (settings.apiKey) {
    elements.settingsApiKey.value = settings.apiKey;
  }
  updateSettingsPlaceholder();
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

    const url = new URL(tab.url);
    const videoId = url.searchParams.get('v');

    if (!videoId) {
      showState(elements.notYoutube);
      return;
    }

    currentVideoId = videoId;

    elements.videoThumbnail.style.backgroundImage = `url(https://img.youtube.com/vi/${videoId}/mqdefault.jpg)`;

    try {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getVideoInfo' });
      const title = response?.title?.trim();
      if (title) {
        elements.videoTitle.textContent = title;
        elements.videoTitle.classList.remove('hidden');
      } else {
        elements.videoTitle.classList.add('hidden');
      }
    } catch (e) {
      elements.videoTitle.classList.add('hidden');
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
  const provider = elements.setupProvider.value;

  if (!apiKey) {
    showToast('Please enter an API key', 'error');
    return;
  }

  elements.saveKeyBtn.disabled = true;
  elements.saveKeyBtn.textContent = 'Validating...';

  const isValid = await validateApiKey(apiKey, provider);

  if (isValid) {
    await saveSettings({ apiKey, provider });
    showToast('API key saved!', 'success');
    showSummaryView();
    checkCurrentTab();
  } else {
    showToast('Invalid API key', 'error');
  }

  elements.saveKeyBtn.disabled = false;
  elements.saveKeyBtn.textContent = 'Save & Continue';
}

async function validateApiKey(apiKey, provider) {
  try {
    if (provider === 'claude') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'hi' }]
        })
      });
      return response.ok;
    } else {
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: { 'Authorization': `Bearer ${apiKey}` }
      });
      return response.ok;
    }
  } catch (error) {
    return false;
  }
}

// Settings handling
async function handleSaveSettings() {
  const apiKey = elements.settingsApiKey.value.trim();
  const provider = elements.settingsProvider.value;
  const summaryLength = elements.summaryLength.value;

  if (apiKey) {
    const isValid = await validateApiKey(apiKey, provider);
    if (!isValid) {
      showToast('Invalid API key', 'error');
      return;
    }
  }

  await saveSettings({ apiKey, provider, summaryLength });
  showToast('Settings saved!', 'success');
}

async function handleClearKey() {
  await chrome.storage.local.remove(['apiKey', 'provider', 'openaiApiKey']);
  showToast('API key removed', 'success');
  showSetupView();
  elements.apiKeyInput.value = '';
}

// Fetch transcript from local Python server
async function fetchTranscript() {
  if (!currentVideoId) {
    throw new Error('No video ID found');
  }

  let response;
  try {
    response = await fetch(`http://localhost:5055/transcript?v=${currentVideoId}`);
  } catch (e) {
    throw new Error('Could not connect to transcript server. Make sure the Python server is running:\n  pip install -r requirements.txt\n  python server.py');
  }

  const data = await response.json();

  if (!response.ok || !data.transcript) {
    throw new Error(data.error || 'Could not fetch transcript. Make sure the video has captions enabled.');
  }

  return data.transcript;
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

    const settings = await getSettings();
    const summary = await generateSummary(currentTranscript, settings.apiKey, settings.provider, settings.summaryLength);

    elements.summaryContent.innerHTML = formatSummary(summary);
    showState(elements.resultState);
  } catch (error) {
    console.error('Summarize error:', error);
    elements.errorMessage.textContent = error.message || 'Failed to generate summary. Please try again.';
    showState(elements.errorState);
  }
}

async function generateSummary(transcript, apiKey, provider, length) {
  const lengthInstructions = {
    brief: 'Provide a very brief summary in 2-3 sentences. Use plain text, no bullet points or markdown headers.',
    standard: 'Provide a concise summary in one paragraph (4-6 sentences). Use plain text, no bullet points or markdown headers.',
    bullet: 'Summarize the key points as a bullet point list using "- " for each point. Include 5-10 bullet points covering the main ideas. Do not use sub-bullets or nested lists.',
    detailed: 'Provide a detailed summary with key points organized using markdown. Use ## for section headers and "- " for bullet points where appropriate. Include multiple sections covering the main themes.'
  };

  const systemPrompt = `You are a helpful assistant that creates TLDR summaries of video transcripts. ${lengthInstructions[length]} Focus on the main points and key takeaways. Be clear and informative.`;
  const userPrompt = `Please provide a TLDR summary of this video transcript:\n\n${transcript.substring(0, 15000)}`;

  if (provider === 'claude') {
    return await generateWithClaude(apiKey, systemPrompt, userPrompt);
  } else {
    return await generateWithOpenAI(apiKey, systemPrompt, userPrompt);
  }
}

async function generateWithOpenAI(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
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

async function generateWithClaude(apiKey, systemPrompt, userPrompt) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        { role: 'user', content: userPrompt }
      ]
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || 'Failed to generate summary');
  }

  const data = await response.json();
  return data.content[0].text;
}

function formatSummary(text) {
  const lines = text.split('\n');
  let html = '';
  let inUl = false;
  let inOl = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      continue;
    }

    const formatted = trimmed
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');

    if (/^#{1,3}\s/.test(trimmed)) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      const headerText = formatted.replace(/^#{1,3}\s+/, '');
      html += `<h4>${headerText}</h4>`;
    } else if (/^[-•]\s/.test(trimmed)) {
      if (inOl) { html += '</ol>'; inOl = false; }
      if (!inUl) { html += '<ul>'; inUl = true; }
      html += `<li>${formatted.replace(/^[-•]\s+/, '')}</li>`;
    } else if (/^\d+\.\s/.test(trimmed)) {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (!inOl) { html += '<ol>'; inOl = true; }
      html += `<li>${formatted.replace(/^\d+\.\s+/, '')}</li>`;
    } else {
      if (inUl) { html += '</ul>'; inUl = false; }
      if (inOl) { html += '</ol>'; inOl = false; }
      html += `<p>${formatted}</p>`;
    }
  }

  if (inUl) html += '</ul>';
  if (inOl) html += '</ol>';
  return html;
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
  const btn = input.parentElement.querySelector('.icon-btn-small');
  const svg = btn.querySelector('.eye-icon');

  if (input.type === 'password') {
    input.type = 'text';
    svg.innerHTML = '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle>';
  } else {
    input.type = 'password';
    svg.innerHTML = '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line>';
  }
}

function showToast(message, type = 'info') {
  elements.toast.textContent = message;
  elements.toast.className = `toast ${type} show`;

  setTimeout(() => {
    elements.toast.classList.remove('show');
  }, 3000);
}
