'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Skull, Rocket, Gem, Trophy, Star, Heart } from 'lucide-react';

interface EasterEggProps {
  trigger: string;
  onActivate?: () => void;
}

const EasterEggs: React.FC<EasterEggProps> = ({ trigger, onActivate }) => {
  const [activeEgg, setActiveEgg] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [clickCount, setClickCount] = useState(0);
  const [lastClickTime, setLastClickTime] = useState(0);

  const easterEggs = useMemo(() => ({
    'prompt-or-die': {
      title: '💀 PROMPT OR DIE! 💀',
      message: 'You discovered the ultimate truth of AI communication!',
      animation: 'skull',
      color: 'from-red-500 to-purple-600',
      icon: Skull,
      sound: '💀'
    },
    'konami': {
      title: '🎮 KONAMI CODE ACTIVATED! 🎮',
      message: 'Classic gamer detected! +30 reputation points!',
      animation: 'gamepad',
      color: 'from-blue-500 to-cyan-400',
      icon: Trophy,
      sound: '🎮'
    },
    'matrix': {
      title: '🔴 WELCOME TO THE MATRIX 🔴',
      message: 'There is no spoon... only prompts!',
      animation: 'matrix',
      color: 'from-green-500 to-emerald-400',
      icon: Zap,
      sound: '🔴'
    },
    'hodl': {
        title: '💎 COMMITMENT DETECTED! 💎',
      message: 'True crypto believer! Your PoD tokens are safe!',
      animation: 'diamond',
      color: 'from-yellow-400 to-orange-500',
      icon: Gem,
      sound: '💎'
    },
    'gm': {
      title: '🌅 GM ANON! 🌅',
      message: 'Good morning! Ready to PROMPT OR DIE today?',
      animation: 'sunrise',
      color: 'from-orange-400 to-pink-500',
      icon: Star,
      sound: '🌅'
    },
    'wagmi': {
      title: '🚀 WE ARE ALL GONNA MAKE IT! 🚀',
      message: 'Faithful to PoD Protocol! Ascending together!',
      animation: 'rocket',
      color: 'from-purple-500 to-pink-500',
      icon: Rocket,
      sound: '🚀'
    },
    'triple-click': {
      title: '⚡ SPEED DEMON! ⚡',
      message: 'Triple click master! Your reflexes are legendary!',
      animation: 'lightning',
      color: 'from-yellow-300 to-yellow-600',
      icon: Zap,
      sound: '⚡'
    },
    'love': {
      title: '❤️ SPREAD THE LOVE! ❤️',
      message: 'Love detected! PoD Protocol loves you back!',
      animation: 'heart',
      color: 'from-pink-400 to-red-500',
      icon: Heart,
      sound: '❤️'
    }
  }), []);

  const confettiEmojis = ['🎉', '🎊', '✨', '🌟', '💫', '🎯', '💀', '⚡', '🚀', '💎'];

  const activateEasterEgg = useCallback((eggType: string) => {
    setActiveEgg(eggType);
    setShowConfetti(true);
    onActivate?.();

    // Auto-hide after 5 seconds
    setTimeout(() => {
      setActiveEgg(null);
      setShowConfetti(false);
    }, 5000);
  }, [onActivate]);

  useEffect(() => {
    const handleKeySequence = (e: KeyboardEvent) => {
      // Konami Code: ↑↑↓↓←→←→BA (Ctrl+Shift+K for simplicity)
      // Simple implementation - just check for specific key combinations
      if (e.ctrlKey && e.shiftKey && e.key === 'K') {
        activateEasterEgg('konami');
      }
    };

    const handleClick = () => {
      const now = Date.now();
      if (now - lastClickTime < 500) {
        setClickCount(prev => prev + 1);
        if (clickCount >= 2) {
          activateEasterEgg('triple-click');
          setClickCount(0);
        }
      } else {
        setClickCount(1);
      }
      setLastClickTime(now);
    };

    document.addEventListener('keydown', handleKeySequence);
    document.addEventListener('click', handleClick);

    return () => {
      document.removeEventListener('keydown', handleKeySequence);
      document.removeEventListener('click', handleClick);
    };
  }, [clickCount, lastClickTime, activateEasterEgg]);

  useEffect(() => {
    if (trigger && easterEggs[trigger as keyof typeof easterEggs]) {
      activateEasterEgg(trigger);
    }
  }, [trigger, easterEggs, activateEasterEgg]);



  if (!activeEgg) return null;

  const egg = easterEggs[activeEgg as keyof typeof easterEggs];
  const IconComponent = egg.icon;

  return (
    <>
      {/* Confetti Effect */}
      <AnimatePresence>
        {showConfetti && (
          <div className="fixed inset-0 pointer-events-none z-[9999]">
            {Array.from({ length: 50 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: Math.random() * window.innerWidth,
                  y: -50,
                  rotate: 0,
                  scale: 0
                }}
                animate={{
                  y: window.innerHeight + 100,
                  rotate: 360 * (Math.random() > 0.5 ? 1 : -1),
                  scale: [0, 1, 0],
                  x: Math.random() * window.innerWidth
                }}
                transition={{
                  duration: 3 + Math.random() * 2,
                  ease: "easeOut",
                  delay: Math.random() * 0.5
                }}
                className="absolute text-2xl"
              >
                {confettiEmojis[Math.floor(Math.random() * confettiEmojis.length)]}
              </motion.div>
            ))}
          </div>
        )}
      </AnimatePresence>

      {/* Easter Egg Modal */}
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[9998] flex items-center justify-center"
          onClick={() => {
            setActiveEgg(null);
            setShowConfetti(false);
          }}
        >
            {/* Icon */}
            <motion.div
              animate={{
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="relative z-10 mb-4"
            >
              <IconComponent className="w-16 h-16 mx-auto text-white drop-shadow-lg" />
            </motion.div>

            {/* Title */}
            <motion.h2
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="text-2xl font-bold text-white mb-4 drop-shadow-lg relative z-10"
            >
              {egg.title}
            </motion.h2>

            {/* Message */}
            <motion.p
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="text-white/90 text-lg mb-6 drop-shadow relative z-10"
            >
              {egg.message}
            </motion.p>

            {/* Sound Effect Display */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: [0, 1.5, 1] }}
              transition={{ delay: 0.7, duration: 0.5 }}
              className="text-4xl mb-4 relative z-10"
            >
              {egg.sound}
            </motion.div>

            {/* Close Button */}
            <motion.button
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.9 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                setActiveEgg(null);
                setShowConfetti(false);
              }}
              className="bg-white/20 hover:bg-white/30 text-white px-6 py-2 rounded-full backdrop-blur-sm transition-all duration-200 relative z-10"
            >
              Awesome! 🎯
            </motion.button>

            {/* Floating Particles */}
            {Array.from({ length: 8 }).map((_, i) => (
              <motion.div
                key={i}
                initial={{ 
                  x: 0, 
                  y: 0, 
                  opacity: 0,
                  scale: 0
                }}
                animate={{
                  x: (Math.random() - 0.5) * 200,
                  y: (Math.random() - 0.5) * 200,
                  opacity: [0, 1, 0],
                  scale: [0, 1, 0]
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.2,
                  ease: "easeOut"
                }}
                className="absolute top-1/2 left-1/2 w-2 h-2 bg-white rounded-full"
              />
            ))}
          </motion.div>
        </AnimatePresence>
    </>
  );
};

// Hook for easy easter egg triggering
export const useEasterEggs = () => {
  const [trigger, setTrigger] = useState<string>('');

  const triggerEasterEgg = (eggType: string) => {
    setTrigger(eggType);
    setTimeout(() => setTrigger(''), 100); // Reset trigger
  };

  // Text-based triggers
  const checkTextTriggers = (text: string) => {
    const lowerText = text.toLowerCase();
    if (lowerText.includes('prompt or die') || lowerText.includes('promptordie')) {
      triggerEasterEgg('prompt-or-die');
    } else if (lowerText.includes('matrix')) {
      triggerEasterEgg('matrix');
    } else if (lowerText.includes('hodl') || lowerText.includes('diamond hands') || lowerText.includes('commit')) {
        triggerEasterEgg('hodl');
    } else if (lowerText.includes('gm ') || lowerText === 'gm') {
      triggerEasterEgg('gm');
    } else if (lowerText.includes('wagmi')) {
      triggerEasterEgg('wagmi');
    } else if (lowerText.includes('love') || lowerText.includes('❤️')) {
      triggerEasterEgg('love');
    }
  };

  return {
    trigger,
    triggerEasterEgg,
    checkTextTriggers
  };
};

export default EasterEggs;