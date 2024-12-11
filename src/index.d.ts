/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_WORKER_URL: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_PROXY_CONTROL_PORT: string
  readonly VITE_LITELLM_PORT: string
  readonly VITE_LOCAL_PROXY_URL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare module 'markdown-it' {
  interface MarkdownIt {
    render(markdown: string): string;
  }
  
  interface MarkdownItConstructor {
    new (): MarkdownIt;
  }
  
  const markdown: MarkdownItConstructor;
  export = markdown;
}

interface Window {
  markdownit: () => import('markdown-it');
}