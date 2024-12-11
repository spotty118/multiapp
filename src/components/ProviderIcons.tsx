import { Provider } from '../lib/types';

interface ProviderIconProps {
  className?: string;
}

export const OpenAIIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <rect width="24" height="24" rx="4" fill="#000000" />
    <path
      d="M11.9947 7.34355C13.2252 6.57336 14.7419 6.57336 15.9724 7.34355L18.0372 8.61724C19.2677 9.38742 19.9975 10.7361 19.9975 12.1897V14.7371C19.9975 16.1907 19.2677 17.5394 18.0372 18.3096L15.9724 19.5832C14.7419 20.3534 13.2252 20.3534 11.9947 19.5832L9.92993 18.3096C8.69941 17.5394 7.96967 16.1907 7.96967 14.7371V12.1897C7.96967 10.7361 8.69941 9.38742 9.92993 8.61724L11.9947 7.34355Z"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M14 12C14 13.1046 13.1046 14 12 14C10.8954 14 10 13.1046 10 12C10 10.8954 10.8954 10 12 10C13.1046 10 14 10.8954 14 12Z"
      stroke="white"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const AnthropicIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M12 4L20 18H4L12 4Z"
      stroke="#0582FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M12 15L8 7M12 15L16 7M8 13H16"
      stroke="#0582FF"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

export const GoogleIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" className={className}>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
  </svg>
);

export const CloudflareIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <path
      d="M16.5088 16.8447c.1475-.5068.0901-.9708-.1537-1.3804-.2178-.3837-.5792-.6632-1.0207-.7947l-8.3091-1.2485a.2241.2241 0 0 1-.1475-.0886.2003.2003 0 0 1-.0394-.1711c.0205-.0903.0901-.1548.1744-.1711l8.4197-1.2402c.4415-.1314.7967-.4052 1.0083-.7806.2177-.3836.2751-.8476.1475-1.3544-.2374-.8313-.9505-1.397-1.7963-1.397h-.6187a.386.386 0 0 1-.3006-.1427c-.0819-.0903-.1106-.2088-.0901-.3273.0409-.1548.0409-.3012.0409-.4477 0-1.2733-1.0411-2.3095-2.3201-2.3095-.7024 0-1.3687.3185-1.8239.8558-.1229.1427-.32.1899-.4841.1089a2.042 2.042 0 0 0-.7639-.1427c-1.1722 0-2.1259.9462-2.1259 2.1063 0 .1249.0082.2498.0327.3747a.2675.2675 0 0 1-.065.2498.2815.2815 0 0 1-.246.0822A3.3535 3.3535 0 0 0 4.62 9.7476c0 1.8276 1.4997 3.3142 3.3442 3.3142h7.0224c.8458 0 1.5589-.5571 1.7963-1.388l-.2741-.0291z"
      fill="#F48120"
    />
  </svg>
);

export const OpenRouterIcon = ({ className = "w-5 h-5" }: ProviderIconProps) => (
  <svg viewBox="0 0 24 24" fill="none" className={className}>
    <defs>
      <linearGradient id="openrouter-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FF4B4B" />
        <stop offset="100%" stopColor="#FF6B6B" />
      </linearGradient>
    </defs>
    <path
      d="M12 2L2 7L12 12L22 7L12 2Z"
      stroke="url(#openrouter-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M2 17L12 22L22 17"
      stroke="url(#openrouter-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M2 12L12 17L22 12"
      stroke="url(#openrouter-gradient)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </svg>
);

export const getProviderIcon = (provider: Provider) => {
  switch (provider) {
    case 'openai':
      return OpenAIIcon;
    case 'anthropic':
      return AnthropicIcon;
    case 'google':
      return GoogleIcon;
    case 'cloudflare':
      return CloudflareIcon;
    case 'openrouter':
      return OpenRouterIcon;
  }
};