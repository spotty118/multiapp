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