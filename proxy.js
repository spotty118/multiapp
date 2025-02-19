import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import { config } from 'dotenv';
import { createServer } from 'http';
import { OpenAI } from 'openai';
import { GoogleGenerativeAI } from '@google/generative-ai';
import Anthropic from '@anthropic-ai/sdk';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
config();

const app = express();
const port = process.env.PORT || 8787;

// Rate limiting setup
const requestCounts = new Map();
const RATE_LIMIT = 50;  // requests per window
const RATE_WINDOW = 60 * 1000;  // 1 minute in milliseconds

// Track the proxy server process
let proxyServerProcess = null;

// Rate limiting middleware
const rateLimiter = (req, res, next) => {
  const ip = req.ip;
  const now = Date.now();
  const userRequests = requestCounts.get(ip) || [];
  
  // Remove requests outside current window
  const validRequests = userRequests.filter(time => time > now - RATE_WINDOW);
  
  if (validRequests.length >= RATE_LIMIT) {
    return res.status(429).json({
      success: false,
      error: {
        message: 'Too many requests, please try again later',
        type: 'rate_limit_error'
      }
    });
  }
  
  validRequests.push(now);
  requestCounts.set(ip, validRequests);
  next();
};

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:4173'],
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

app.use(morgan('dev')); // Logging
app.use(express.json());
app.use(rateLimiter);

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Initialize API clients
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

const gemini = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// Validate messages middleware
const validateMessages = (req, res, next) => {
  const { messages } = req.body;
  
  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Messages array is required'
      }
    });
  }

  // Basic message validation
  for (const [index, msg] of messages.entries()) {
    if (!msg.role || !msg.content) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid message at index ${index}: role and content are required`
        }
      });
    }
    if (!['user', 'assistant', 'system'].includes(msg.role)) {
      return res.status(400).json({
        success: false,
        error: {
          message: `Invalid role "${msg.role}" at index ${index}`
        }
      });
    }
  }
  
  next();
};

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    error: {
      message: err.message || 'An unexpected error occurred',
      type: err.name || 'Error'
    }
  });
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Proxy server control endpoints
app.post('/proxy/start', async (req, res) => {
  try {
    if (proxyServerProcess) {
      return res.status(400).json({ error: 'Proxy server is already running' });
    }

    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    
    // First, try to install litellm if not already installed
    try {
      await new Promise((resolve, reject) => {
        const pip = spawn('pip', ['install', 'litellm']);
        pip.on('close', (code) => {
          if (code === 0) resolve();
          else reject(new Error(`pip install failed with code ${code}`));
        });
      });
    } catch (error) {
      console.warn('Could not install litellm:', error);
      // Continue anyway as it might already be installed
    }

    // Start the proxy server
    proxyServerProcess = spawn('litellm', ['--config', path.join(__dirname, 'config.yaml')]);

    proxyServerProcess.stdout.on('data', (data) => {
      console.log(`Proxy server stdout: ${data}`);
    });

    proxyServerProcess.stderr.on('data', (data) => {
      console.error(`Proxy server stderr: ${data}`);
    });

    proxyServerProcess.on('close', (code) => {
      console.log(`Proxy server process exited with code ${code}`);
      proxyServerProcess = null;
    });

    res.json({ success: true, message: 'Proxy server started' });
  } catch (error) {
    console.error('Error starting proxy server:', error);
    res.status(500).json({ error: 'Failed to start proxy server' });
  }
});

app.post('/proxy/stop', (req, res) => {
  if (!proxyServerProcess) {
    return res.status(400).json({ error: 'Proxy server is not running' });
  }

  try {
    proxyServerProcess.kill();
    proxyServerProcess = null;
    res.json({ success: true, message: 'Proxy server stopped' });
  } catch (error) {
    console.error('Error stopping proxy server:', error);
    res.status(500).json({ error: 'Failed to stop proxy server' });
  }
});

// ... rest of your proxy.js file remains the same ...