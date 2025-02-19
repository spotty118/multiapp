// ... previous imports and code ...

// Add models endpoint to handle model fetching
app.post('/api/models', async (req, res) => {
  const { provider, apiKey } = req.body;

  if (!provider) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Provider is required'
      }
    });
  }

  let endpoint;
  let headers = {
    'Content-Type': 'application/json'
  };

  // Configure endpoint and headers based on provider
  switch (provider) {
    case 'openai':
      endpoint = 'https://api.openai.com/v1/models';
      headers['Authorization'] = `Bearer ${apiKey}`;
      break;
    case 'anthropic':
      endpoint = 'https://api.anthropic.com/v1/models';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      break;
    case 'google':
      endpoint = 'https://generativelanguage.googleapis.com/v1/models';
      headers['x-goog-api-key'] = apiKey;
      break;
    case 'openrouter':
      endpoint = 'https://openrouter.ai/api/v1/models';
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = req.headers.origin || '*';
      break;
    default:
      return res.status(400).json({
        success: false,
        error: {
          message: 'Unsupported provider'
        }
      });
  }

  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      throw new Error(errorData.error?.message || 'Failed to fetch models');
    }

    const data = await response.json();
    res.json(data);

  } catch (error) {
    console.error(`Error fetching models for ${provider}:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to fetch models',
        type: 'api_error'
      }
    });
  }
});

// ... rest of your worker.js code ...