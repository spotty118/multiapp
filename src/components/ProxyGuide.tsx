import { ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

const sections = [
  {
    title: 'Prerequisites',
    content: `Before setting up LiteLLM Proxy, ensure you have:

- Operating System: Linux, macOS, or Windows
- Python: Version 3.8 or higher
- Package Manager: pip for Python package installation
- API Keys: From your desired AI providers (OpenAI, Anthropic, etc.)
- Optional: Docker for containerized deployment
- Basic knowledge of CLI, Python, and networking`
  },
  {
    title: 'Installation',
    content: `### Using Python and pip

1. Install LiteLLM:
\`\`\`bash
pip install litellm
\`\`\`

2. Create a configuration file (\`config.yaml\`):
\`\`\`yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: sk-...

  - model_name: claude-3-opus
    litellm_params:
      model: claude-3-opus
      api_key: sk-...

  - model_name: gemini-pro
    litellm_params:
      model: gemini-pro
      api_key: ...

proxy_config:
  # Enable model caching
  cache: true
  # Number of retries
  num_retries: 2
  # Redis cache config (optional)
  redis_host: localhost
  redis_port: 6379
  redis_password: xxx
\`\`\`

### Using Docker

1. Create a Dockerfile:
\`\`\`dockerfile
FROM ghcr.io/berriai/litellm:latest

COPY config.yaml /app/config.yaml
EXPOSE 8000

CMD ["litellm", "--config", "config.yaml"]
\`\`\`

2. Build and run:
\`\`\`bash
docker build -t litellm-proxy .
docker run -d -p 8000:8000 litellm-proxy
\`\`\``
  },
  {
    title: 'Advanced Configuration',
    content: `### Load Balancing

\`\`\`yaml
model_list:
  - model_name: gpt-4
    litellm_params:
      model: gpt-4
      api_key: ["key1", "key2", "key3"]

router_config:
  routing_strategy: least-busy
  retry_strategy: fallback
\`\`\`

### Cost Tracking

\`\`\`yaml
litellm_settings:
  cost_tracking: true
  cost_callbacks: ["slack"]

callbacks:
  slack:
    webhook_url: "https://hooks.slack.com/services/xxx"
\`\`\`

### Rate Limiting

\`\`\`yaml
litellm_settings:
  rate_limit: 10
  rate_limit_period: 60  # per minute
\`\`\`

### Health Checks

\`\`\`yaml
health_check:
  enabled: true
  interval: 30  # seconds
  endpoints:
    - url: "https://api.openai.com/v1/chat/completions"
      method: "GET"
    - url: "https://api.anthropic.com/v1/messages"
      method: "GET"
\`\`\``
  },
  {
    title: 'Security Best Practices',
    content: `### 1. API Key Management

- Use environment variables for sensitive keys
- Rotate keys regularly
- Set up key expiration policies

### 2. Request Authentication

Add to \`config.yaml\`:
\`\`\`yaml
litellm_settings:
  api_key: "sk-my-secret-key"
  drop_params: ["api_key", "api_base"]
\`\`\`

### 3. Network Security

- Use HTTPS/TLS
- Set up firewall rules
- Configure CORS properly

### 4. Monitoring

- Enable logging
- Set up alerting
- Monitor rate limits and costs

### 5. Deployment

Use reverse proxy (nginx):
\`\`\`nginx
server {
    listen 443 ssl;
    server_name proxy.yourdomain.com;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
\`\`\``
  },
  {
    title: 'Usage Examples',
    content: `### OpenAI Format

\`\`\`python
import openai

client = openai.OpenAI(
    api_key="your-proxy-key",
    base_url="http://localhost:8000"
)

completion = client.chat.completions.create(
    model="gpt-4",  # or any supported model
    messages=[
        {"role": "user", "content": "Hello, world!"}
    ]
)
print(completion.choices[0].message.content)
\`\`\`

### Curl Example

\`\`\`bash
curl http://localhost:8000/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer your-proxy-key" \\
  -d '{
    "model": "gpt-4",
    "messages": [
      {
        "role": "user",
        "content": "Hello, world!"
      }
    ]
  }'
\`\`\`

### JavaScript Example

\`\`\`javascript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: 'your-proxy-key',
  baseURL: 'http://localhost:8000'
});

const completion = await openai.chat.completions.create({
  model: 'gpt-4',
  messages: [
    { role: 'user', content: 'Hello, world!' }
  ]
});

console.log(completion.choices[0].message.content);
\`\`\``
  }
];

interface SectionProps {
  title: string;
  content: string;
  isOpen: boolean;
  onToggle: () => void;
}

const Section = ({ title, content, isOpen, onToggle }: SectionProps) => {
  return (
    <div className="border border-zinc-200 rounded-lg mb-4">
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between bg-white hover:bg-zinc-50 rounded-lg transition-colors"
      >
        <h3 className="text-sm font-medium text-zinc-900">{title}</h3>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-zinc-500" />
        ) : (
          <ChevronDown className="w-5 h-5 text-zinc-500" />
        )}
      </button>
      
      {isOpen && (
        <div className="px-4 pb-4">
          <div 
            className="prose prose-sm max-w-none prose-zinc prose-headings:font-semibold prose-headings:text-zinc-800 prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2"
            dangerouslySetInnerHTML={{ 
              __html: window.markdownit().render(content) 
            }} 
          />
        </div>
      )}
    </div>
  );
};

export const ProxyGuide = () => {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  const toggleSection = (title: string) => {
    setOpenSections(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h2 className="text-xl font-semibold text-zinc-900 mb-6">
        LiteLLM Proxy Setup Guide
      </h2>
      
      {sections.map((section) => (
        <Section
          key={section.title}
          title={section.title}
          content={section.content}
          isOpen={openSections[section.title] || false}
          onToggle={() => toggleSection(section.title)}
        />
      ))}
    </div>
  );
};