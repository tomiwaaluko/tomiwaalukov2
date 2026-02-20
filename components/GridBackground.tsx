import { motion } from 'motion/react';

interface GridBackgroundProps {
  variant: 'cyan' | 'blue';
}

export function GridBackground({ variant }: GridBackgroundProps) {
  const primaryColor = variant === 'cyan' ? '#00ffff' : '#0066ff';
  const secondaryColor = variant === 'cyan' ? '#004466' : '#001a4d';

  return (
    <div className="absolute inset-0">
      {/* Base gradient */}
      <div 
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at center, ${secondaryColor} 0%, #000000 70%)`
        }}
      />
      
      {/* Perspective grid */}
      <motion.div
        className="absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 2 }}
        style={{
          backgroundImage: `
            linear-gradient(${primaryColor}22 2px, transparent 2px),
            linear-gradient(90deg, ${primaryColor}22 2px, transparent 2px)
          `,
          backgroundSize: '60px 60px',
          transform: 'perspective(500px) rotateX(60deg)',
          transformOrigin: 'center center',
        }}
      />
      
      {/* Horizontal lines for depth */}
      <div className="absolute inset-0 flex flex-col justify-around opacity-20">
        {[...Array(12)].map((_, i) => (
          <motion.div
            key={i}
            className="w-full h-px"
            style={{ 
              background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
              boxShadow: `0 0 10px ${primaryColor}`,
            }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.5, delay: i * 0.1 }}
          />
        ))}
      </div>
      
      {/* Glow orb */}
      <motion.div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: primaryColor }}
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.2, 0.3, 0.2],
        }}
        transition={{
          duration: 4,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </div>
  );
}
