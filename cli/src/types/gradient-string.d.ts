/**
 * Type definitions for gradient-string
 */
declare module 'gradient-string' {
  interface GradientFunction {
    (text: string): string;
    multiline(text: string): string;
  }

  interface GradientStringStatic {
    (colors: string[]): GradientFunction;
    (startColor: string, endColor: string): GradientFunction;
    
    // Pre-defined gradients
    rainbow: GradientFunction;
    pastel: GradientFunction;
    atlas: GradientFunction;
    retro: GradientFunction;
    summer: GradientFunction;
    cristal: GradientFunction;
    teen: GradientFunction;
    mind: GradientFunction;
    morning: GradientFunction;
    vice: GradientFunction;
    passion: GradientFunction;
    fruit: GradientFunction;
    instagram: GradientFunction;
  }

  const gradient: GradientStringStatic;
  export default gradient;
}