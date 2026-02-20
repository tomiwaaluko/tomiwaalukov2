import { useState, useEffect } from 'react';
import { motion } from 'motion/react';

interface TerminalConsoleProps {
  variant: 'cyan' | 'blue';
}

const bootSequence = [
  { text: 'Initializing SolarOS 4.0.1...', delay: 0 },
  { text: 'Loading kernel modules...', delay: 800 },
  { text: 'Mounting file systems...', delay: 1400 },
  { text: 'Starting network services...', delay: 2000 },
  { text: '', delay: 2600 },
  { text: 'SolarOS 4.0.1 (tty1)', delay: 2800 },
  { text: '', delay: 3000 },
  { text: 'login: backdoor', delay: 3200 },
  { text: 'Password: ********', delay: 3800 },
  { text: '', delay: 4200 },
  { text: 'Last login: Sun Oct 12 23:47:08 2025', delay: 4400 },
  { text: '$ whoami', delay: 5000 },
  { text: '> guest_user', delay: 5400 },
  { text: '$', delay: 5800 },
];

export function TerminalConsole({ variant }: TerminalConsoleProps) {
  const [visibleLines, setVisibleLines] = useState(0);
  const [showCursor, setShowCursor] = useState(true);
  
  const primaryColor = variant === 'cyan' ? '#00ffff' : '#0066ff';
  const glowColor = variant === 'cyan' ? 'rgba(0, 255, 255, 0.5)' : 'rgba(0, 102, 255, 0.5)';

  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];
    
    bootSequence.forEach((line, index) => {
      const timer = setTimeout(() => {
        setVisibleLines(index + 1);
      }, line.delay);
      timers.push(timer);
    });

    return () => timers.forEach(timer => clearTimeout(timer));
  }, []);

  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 530);

    return () => clearInterval(cursorInterval);
  }, []);

  return (
    <motion.div
      className="relative w-full max-w-3xl backdrop-blur-md rounded-lg overflow-hidden"
      style={{
        background: 'rgba(0, 0, 0, 0.85)',
        border: `1px solid ${primaryColor}`,
        boxShadow: `
          0 0 20px ${glowColor},
          inset 0 0 40px rgba(0, 0, 0, 0.5)
        `,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1, delay: 0.5 }}
    >
      {/* Glass reflection effect */}
      <div 
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)',
        }}
      />
      
      {/* Terminal Header */}
      <div 
        className="px-6 py-3 flex items-center gap-3 border-b"
        style={{ 
          borderColor: `${primaryColor}33`,
          background: 'rgba(0, 0, 0, 0.5)',
        }}
      >
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500/80" />
          <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
          <div className="w-3 h-3 rounded-full bg-green-500/80" />
        </div>
        <span 
          className="tracking-wider"
          style={{ 
            color: primaryColor,
            fontFamily: 'Share Tech Mono, monospace',
            textShadow: `0 0 10px ${glowColor}`,
          }}
        >
          TERMINAL ACCESS GATE
        </span>
      </div>
      
      {/* Terminal Content */}
      <div 
        className="p-6 min-h-[400px]"
        style={{ fontFamily: 'Share Tech Mono, monospace' }}
      >
        {bootSequence.slice(0, visibleLines).map((line, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.1 }}
            style={{
              color: primaryColor,
              textShadow: `0 0 8px ${glowColor}`,
            }}
            className="mb-2"
          >
            {line.text}
          </motion.div>
        ))}
        
        {/* Blinking cursor */}
        {visibleLines === bootSequence.length && (
          <span
            style={{
              color: primaryColor,
              textShadow: `0 0 8px ${glowColor}`,
            }}
          >
            {showCursor ? '█' : ' '}
          </span>
        )}
      </div>
      
      {/* Bottom glow */}
      <div 
        className="absolute bottom-0 left-0 right-0 h-px"
        style={{
          background: primaryColor,
          boxShadow: `0 0 20px ${glowColor}`,
        }}
      />
    </motion.div>
  );
}
