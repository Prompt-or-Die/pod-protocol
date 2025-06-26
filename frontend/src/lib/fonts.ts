import { Inter, JetBrains_Mono, Orbitron } from 'next/font/google';
import localFont from 'next/font/local';

// Primary font - Inter for body text
export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
  preload: true,
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'Segoe UI',
    'Roboto',
    'Helvetica Neue',
    'Arial',
    'sans-serif',
  ],
});

// Monospace font - JetBrains Mono for code
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jetbrains-mono',
  preload: false, // Only load when needed
  fallback: [
    'Menlo',
    'Monaco',
    'Consolas',
    'Liberation Mono',
    'Courier New',
    'monospace',
  ],
});

// Heading font - Orbitron for sci-fi aesthetic
export const orbitron = Orbitron({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-orbitron',
  weight: ['400', '500', '600', '700', '800', '900'],
  preload: false, // Only load when needed
  fallback: [
    'system-ui',
    '-apple-system',
    'BlinkMacSystemFont',
    'sans-serif',
  ],
});

// Custom local font for branding (disabled due to font loading issues)
// Using Orbitron as the brand font instead
export const customBrand = orbitron;

// Font loading utility
export const preloadFonts = () => {
  if (typeof window === 'undefined') return;
  
  // Preload critical fonts
  const link = document.createElement('link');
  link.rel = 'preload';
  link.as = 'font';
  link.type = 'font/woff2';
  link.crossOrigin = 'anonymous';
  
  // Inter weights commonly used
  const interWeights = [300, 400, 500, 600, 700];
  interWeights.forEach(weight => {
    const linkElement = link.cloneNode() as HTMLLinkElement;
    linkElement.href = `https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2`;
    document.head.appendChild(linkElement);
  });
};

// Font optimization configuration
export const fontConfig = {
  // Critical fonts that should be preloaded
  critical: [inter],
  
  // Fonts that can be lazy loaded
  lazy: [jetbrainsMono, orbitron, customBrand],
  
  // Font display strategies
  strategies: {
    primary: 'swap', // For body text
    decorative: 'optional', // For headings/branding
    code: 'fallback', // For code blocks
  },
};

// CSS variables for easy access
export const fontVariables = {
  '--font-inter': inter.style.fontFamily,
  '--font-jetbrains-mono': jetbrainsMono.style.fontFamily,
  '--font-orbitron': orbitron.style.fontFamily,
  '--font-custom-brand': orbitron.style.fontFamily, // Using Orbitron as brand font
};

export default {
  inter,
  jetbrainsMono,
  orbitron,
  customBrand,
  preloadFonts,
  fontConfig,
  fontVariables,
};