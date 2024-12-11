import { useState, useEffect, useCallback } from 'react';

interface TypewriterTextProps {
  content: string;
  speed?: number;
  onComplete?: () => void;
}

export const TypewriterText = ({ content, speed = 30, onComplete }: TypewriterTextProps) => {
  const [displayedContent, setDisplayedContent] = useState('');
  const [isTyping, setIsTyping] = useState(true);

  const animate = useCallback(() => {
    let currentIndex = 0;
    setIsTyping(true);

    const interval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(prev => prev + content[currentIndex]);
        currentIndex++;
      } else {
        clearInterval(interval);
        setIsTyping(false);
        onComplete?.();
      }
    }, speed);

    return () => clearInterval(interval);
  }, [content, speed, onComplete]);

  useEffect(() => {
    const cleanup = animate();
    return cleanup;
  }, [animate]);

  return (
    <div className={`animate-typing ${!isTyping ? 'after:hidden' : ''}`}>
      {displayedContent}
    </div>
  );
};