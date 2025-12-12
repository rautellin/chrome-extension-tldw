// Background service worker for TLDW extension

// Listen for installation
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    console.log('TLDW extension installed');
    
    // Open popup to prompt for API key setup
    // Note: We can't directly open popup, but the popup will show setup view
    // when no API key is found
  }
});

// Listen for messages from popup or content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'generateSummary') {
    handleGenerateSummary(request)
      .then(summary => sendResponse({ summary }))
      .catch(error => sendResponse({ error: error.message }));
    return true; // Keep message channel open for async response
  }
});

// Handle summary generation (optional - can be used instead of popup doing it directly)
async function handleGenerateSummary({ transcript, apiKey, length }) {
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

console.log('TLDW background service worker loaded');

