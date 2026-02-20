import { motion } from 'motion/react';
import { ArrowRight } from 'lucide-react';

interface SkipButtonProps {
  variant: 'cyan' | 'blue';
}

export function SkipButton({ variant }: SkipButtonProps) {
  const primaryColor = variant === 'cyan' ? '#00ffff' : '#0066ff';
  const glowColor = variant === 'cyan' ? 'rgba(0, 255, 255, 0.5)' : 'rgba(0, 102, 255, 0.5)';

  return (
    <motion.button
      className="absolute bottom-8 right-8 z-20 px-6 py-3 backdrop-blur-md rounded-md flex items-center gap-2 group transition-all"
      style={{
        background: 'rgba(0, 0, 0, 0.6)',
        border: `1px solid ${primaryColor}`,
        color: primaryColor,
        fontFamily: 'Share Tech Mono, monospace',
        boxShadow: `0 0 15px ${glowColor}`,
      }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.8, delay: 2 }}
      whileHover={{ 
        scale: 1.05,
        boxShadow: `0 0 25px ${glowColor}`,
      }}
      whileTap={{ scale: 0.95 }}
      onClick={() => alert('Navigating to portfolio...')}
    >
      <span className="tracking-wider">Skip Terminal</span>
      <ArrowRight 
        size={18} 
        className="transition-transform group-hover:translate-x-1"
        style={{ filter: `drop-shadow(0 0 4px ${glowColor})` }}
      />
    </motion.button>
  );
}
