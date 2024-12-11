const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const fetch = require('node-fetch');

const app = express();
const port = process.env.PORT || 8787;

// Middleware
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Chat completion endpoint
app.post('/api/chat/completions', async (req, res) => {
  const { provider, model, messages, apiKey } = req.body;

  if (!provider || !model || !messages) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Provider, model, and messages are required'
      }
    });
  }

  let endpoint;
  let headers = {
    'Content-Type': 'application/json'
  };
  let body;

  // Configure request based on provider
  switch (provider) {
    case 'openai':
      endpoint = 'https://api.openai.com/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      body = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      };
      break;

    case 'anthropic':
      endpoint = 'https://api.anthropic.com/v1/messages';
      headers['x-api-key'] = apiKey;
      headers['anthropic-version'] = '2023-06-01';
      body = {
        model,
        messages,
        max_tokens: 1000
      };
      break;

    case 'google':
      endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${apiKey}`;
      body = {
        contents: messages.map(m => ({
          role: m.role,
          parts: [{ text: m.content }]
        }))
      };
      break;

    case 'openrouter':
      endpoint = 'https://openrouter.ai/api/v1/chat/completions';
      headers['Authorization'] = `Bearer ${apiKey}`;
      headers['HTTP-Referer'] = req.headers.origin || '*';
      body = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1000
      };
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
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      let errorData;
      try {
        errorData = await response.json();
      } catch {
        throw new Error(`${response.status} ${response.statusText}`);
      }

      throw new Error(errorData.error?.message || 'API request failed');
    }

    const data = await response.json();
    res.json({
      success: true,
      result: {
        response: provider === 'google' 
          ? data.candidates[0].content.parts[0].text
          : data.choices[0].message.content,
        usage: data.usage
      }
    });

  } catch (error) {
    console.error(`Error with ${provider} API:`, error);
    res.status(500).json({
      success: false,
      error: {
        message: error.message || 'Failed to get response',
        type: 'api_error'
      }
    });
  }
});

// Models endpoint
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

// Start server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
