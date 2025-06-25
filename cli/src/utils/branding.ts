import chalk from "chalk";

// Force color support for better terminal compatibility
if (process.env.NODE_ENV !== "test") {
  chalk.level = 3; // Force truecolor support
}

/**
 * PoD Protocol CLI Branding and Visual Elements
 */

// Enhanced POD Banner with better Unicode support
export const POD_BANNER = `
${chalk.magenta.bold("██████╗  ██████╗ ██████╗     ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ ██████╗ ██╗     ")}
${chalk.magenta.bold("██╔══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝██╔═══██╗██║     ")}
${chalk.magenta.bold("██████╔╝██║   ██║██║  ██║    ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║     ")}
${chalk.magenta.bold("██╔═══╝ ██║   ██║██║  ██║    ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║     ")}
${chalk.magenta.bold("██║     ╚██████╔╝██████╔╝    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗╚██████╔╝███████╗")}
${chalk.magenta.bold("╚═╝      ╚═════╝ ╚═════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝")}

${chalk.cyan.bold("                    The Ultimate AI Agent Communication Protocol")}
${chalk.gray("                          Where prompts become prophecy ⚡️")}
`;

// Enhanced "Prompt or Die" banner with improved Unicode support
export const PROMPT_OR_DIE_BANNER = `
${chalk.gray("╔═══════════════════════════════════════════════════════════════════════════════╗")}
${chalk.gray("║")} ${chalk.magenta.bold("██████╗ ██████╗  ██████╗ ███╗   ███╗██████╗ ████████╗")} ${chalk.white.bold("  ██████╗ ██████╗ ")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝")} ${chalk.white.bold(" ██╔═══██╗██╔══██╗")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("██████╔╝██████╔╝██║   ██║██╔████╔██║██████╔╝   ██║   ")} ${chalk.white.bold(" ██║   ██║██████╔╝")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██╔═══╝    ██║   ")} ${chalk.white.bold(" ██║   ██║██╔══██╗")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║        ██║   ")} ${chalk.white.bold(" ╚██████╔╝██║  ██║")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝   ")} ${chalk.white.bold("  ╚═════╝ ╚═╝  ╚═╝")} ${chalk.gray("║")}
${chalk.gray("║")}                                                                               ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("    ███████╗██╗██╗     ██╗")} ${chalk.red.bold("███████╗    ██████╗ ██╗███████╗    ")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("    ██╔═════╝██║██║     ██║")} ${chalk.red.bold("██╔════╝    ██╔══██╗██║██╔════╝    ")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("    █████╗  ██║██║     ██║")} ${chalk.red.bold("█████╗      ██║  ██║██║█████╗      ")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("    ██╔══╝  ██║██║     ██║")} ${chalk.red.bold("██╔══╝      ██║  ██║██║██╔══╝      ")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("    ███████╗██║███████╗██║")} ${chalk.red.bold("███████╗    ██████╔╝██║███████╗    ")} ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.magenta.bold("    ╚══════╝╚═╝╚══════╝╚═╝")} ${chalk.red.bold("╚══════╝    ╚═════╝ ╚═╝╚══════╝    ")} ${chalk.gray("║")}
${chalk.gray("║")}                                                                               ${chalk.gray("║")}
${chalk.gray("║")} ${chalk.cyan.bold("                    Where AI agents meet their destiny ⚡️                  ")} ${chalk.gray("║")}
${chalk.gray("╚═══════════════════════════════════════════════════════════════════════════════╝")}
`;

// Compact "Prompt or Die" banner
export const PROMPT_OR_DIE_COMPACT = `
${chalk.magenta.bold("PROMPT")} ${chalk.white.bold("or")} ${chalk.red.bold("DIE")} ${chalk.yellow("⚡️")}
${chalk.cyan("──────────────────────────────")}
`;

// Ultra-compact one-liner
export const PROMPT_OR_DIE_MINI = `${chalk.magenta("[")} ${chalk.magenta.bold("PROMPT")} ${chalk.white("or")} ${chalk.red.bold("DIE")} ${chalk.magenta("]")} ${chalk.yellow("⚡")}`;

// Revert to original mini logo
export const POD_MINI_LOGO = `${chalk.magenta.bold("⚡️ PoD")} ${chalk.cyan("Protocol")}`;

// Simple command banners using working colors
export const COMMAND_BANNERS = {
  agent: `${chalk.magenta("▄▄▄")} ${chalk.cyan.bold("🤖 AGENT COMMAND")} ${chalk.magenta("▄▄▄")}`,
  message: `${chalk.magenta("▄▄▄")} ${chalk.cyan.bold("💬 MESSAGE COMMAND")} ${chalk.magenta("▄▄▄")}`,
  channel: `${chalk.magenta("▄▄▄")} ${chalk.cyan.bold("🏛️ CHANNEL COMMAND")} ${chalk.magenta("▄▄▄")}`,
  escrow: `${chalk.magenta("▄▄▄")} ${chalk.cyan.bold("💰 ESCROW COMMAND")} ${chalk.magenta("▄▄▄")}`,
  config: `${chalk.magenta("▄▄▄")} ${chalk.cyan.bold("⚙️ CONFIG COMMAND")} ${chalk.magenta("▄▄▄")}`,
  status: `${chalk.magenta("▄▄▄")} ${chalk.cyan.bold("🛡️ STATUS CHECK")} ${chalk.magenta("▄▄▄")}`,
};

// Black terminal command banners
export const BLACK_TERMINAL_COMMAND_BANNERS = {
  agent: () => {
    const purple = chalk.hex('#9D4EDD');
    const white = chalk.white;
    return `${purple("▄▄▄")} ${white.bold("🤖 AGENT COMMAND")} ${purple("▄▄▄")}`;
  },
  message: () => {
    const purple = chalk.hex('#9D4EDD');
    const white = chalk.white;
    return `${purple("▄▄▄")} ${white.bold("💬 MESSAGE COMMAND")} ${purple("▄▄▄")}`;
  },
  channel: () => {
    const purple = chalk.hex('#9D4EDD');
    const white = chalk.white;
    return `${purple("▄▄▄")} ${white.bold("🏛️ CHANNEL COMMAND")} ${purple("▄▄▄")}`;
  },
  escrow: () => {
    const purple = chalk.hex('#9D4EDD');
    const white = chalk.white;
    return `${purple("▄▄▄")} ${white.bold("💰 ESCROW COMMAND")} ${purple("▄▄▄")}`;
  },
  config: () => {
    const purple = chalk.hex('#9D4EDD');
    const white = chalk.white;
    return `${purple("▄▄▄")} ${white.bold("⚙️ CONFIG COMMAND")} ${purple("▄▄▄")}`;
  },
  status: () => {
    const purple = chalk.hex('#9D4EDD');
    const white = chalk.white;
    return `${purple("▄▄▄")} ${white.bold("🛡️ STATUS CHECK")} ${purple("▄▄▄")}`;
  },
};

// Simple decorative elements using working colors
export const DECORATIVE_ELEMENTS = {
  starBorder: `${chalk.yellow("✧")} ${chalk.magenta("─".repeat(50))} ${chalk.yellow("✧")}`,
  gemBorder: `${chalk.cyan("◆")} ${chalk.magenta("─".repeat(48))} ${chalk.cyan("◆")}`,
  lightningBorder: `${chalk.yellow("⚡")} ${chalk.magenta("━".repeat(48))} ${chalk.yellow("⚡")}`,
  violetGradient: chalk.magenta("▓".repeat(50)),
};

// Banner size options
export enum BannerSize {
  FULL = "full",
  COMPACT = "compact",
  MINI = "mini",
  NONE = "none",
}

// Black terminal styling with white, purple, and crimson colors
export const BLACK_TERMINAL_COLORS = {
  primary: chalk.hex('#9D4EDD'), // Purple
  secondary: chalk.hex('#DC143C'), // Crimson
  success: chalk.hex('#00FF7F'), // Spring green for visibility
  warning: chalk.hex('#FFD700'), // Gold for visibility
  error: chalk.hex('#DC143C'), // Crimson
  info: chalk.hex('#9D4EDD'), // Purple
  muted: chalk.hex('#808080'), // Gray
  accent: chalk.white.bold, // White
  dim: chalk.hex('#696969'), // Dim gray
  text: chalk.white, // White text
  background: '\x1b[40m', // Black background ANSI code
  reset: '\x1b[0m', // Reset ANSI code
  border: chalk.hex('#9D4EDD'), // Purple borders
  highlight: chalk.hex('#DC143C'), // Crimson highlights
} as const;

export const BRAND_COLORS = {
  primary: chalk.magenta,
  secondary: chalk.cyan,
  success: chalk.green,
  warning: chalk.yellow,
  error: chalk.red,
  info: chalk.blue,
  muted: chalk.gray,
  accent: chalk.white.bold,
  dim: chalk.dim,
} as const;

export const ICONS = {
  success: "✅",
  error: "❌",
  warning: "⚠️",
  info: "ℹ️",
  loading: "⏳",
  agent: "🤖",
  message: "💬",
  channel: "🏛️",
  escrow: "💰",
  network: "🌐",
  key: "🔑",
  rocket: "🚀",
  lightning: "⚡️",
  shield: "🛡️",
  gear: "⚙️",
  search: "🔍",
  bell: "🔔",
  star: "⭐",
  fire: "🔥",
  gem: "💎",
  chain: "⛓️",
} as const;

export const DIVIDERS = {
  thin: chalk.gray("─".repeat(60)),
  thick: chalk.gray("═".repeat(60)),
  fancy: chalk.magenta("▓".repeat(60)),
  dots: chalk.dim("·".repeat(60)),
} as const;

/**
 * Display the original working banner
 */
/**
 * Enable black terminal mode with proper styling
 */
let blackTerminalMode = false;

export function enableBlackTerminal(): void {
  blackTerminalMode = true;
  // Try to set terminal background to black
  process.stdout.write('\x1b[40m\x1b[2J\x1b[H');
}

export function disableBlackTerminal(): void {
  blackTerminalMode = false;
  process.stdout.write('\x1b[0m');
}

export function isBlackTerminalMode(): boolean {
  return blackTerminalMode;
}

/**
 * Get appropriate colors based on terminal mode
 */
export function getColors() {
  return blackTerminalMode ? BLACK_TERMINAL_COLORS : BRAND_COLORS;
}

export function showBanner(size: BannerSize = BannerSize.FULL): void {
  const colors = getColors();
  
  if (blackTerminalMode) {
    // Clear screen and set black background
    console.clear();
    process.stdout.write('\x1b[40m\x1b[2J\x1b[H');
  }
  
  switch (size) {
    case BannerSize.FULL:
      if (blackTerminalMode) {
        showBlackTerminalBanner();
      } else {
        console.log(POD_BANNER);
        console.log(DIVIDERS.thin);
      }
      break;
    case BannerSize.COMPACT:
      if (blackTerminalMode) {
        showBlackTerminalCompactBanner();
      } else {
        console.log(PROMPT_OR_DIE_COMPACT);
        console.log(DIVIDERS.dots);
      }
      break;
    case BannerSize.MINI:
      if (blackTerminalMode) {
        showBlackTerminalMiniBanner();
      } else {
        console.log(PROMPT_OR_DIE_MINI);
      }
      break;
    case BannerSize.NONE:
      return;
  }
  console.log();
}

/**
 * Display the beautiful "Prompt or Die" banner
 */
export function showPromptOrDieBanner(): void {
  if (blackTerminalMode) {
    showBlackTerminalPromptOrDieBanner();
    console.log(BLACK_TERMINAL_COLORS.primary("⚡") + " " + BLACK_TERMINAL_COLORS.primary("━".repeat(48)) + " " + BLACK_TERMINAL_COLORS.primary("⚡"));
  } else {
    console.log(PROMPT_OR_DIE_BANNER);
    console.log(DECORATIVE_ELEMENTS.lightningBorder);
  }
  console.log();
}

/**
 * Display a compact header for commands
 */
export function showMiniHeader(command?: string): void {
  if (blackTerminalMode) {
    const purple = chalk.hex('#9D4EDD');
    const white = chalk.white;
    const crimson = chalk.hex('#DC143C');
    
    if (command && BLACK_TERMINAL_COMMAND_BANNERS[command as keyof typeof BLACK_TERMINAL_COMMAND_BANNERS]) {
      console.log(BLACK_TERMINAL_COMMAND_BANNERS[command as keyof typeof BLACK_TERMINAL_COMMAND_BANNERS]());
      console.log(purple("✧") + " " + purple("─".repeat(48)) + " " + purple("✧"));
    } else {
      const header = command
        ? `${purple.bold("⚡️ PoD")} ${white("Protocol")} ${purple("›")} ${white.bold(command)}`
        : `${purple.bold("⚡️ PoD")} ${white("Protocol")}`;
      console.log(header);
      console.log(purple("·".repeat(60)));
    }
  } else {
    if (command && COMMAND_BANNERS[command as keyof typeof COMMAND_BANNERS]) {
      console.log(COMMAND_BANNERS[command as keyof typeof COMMAND_BANNERS]);
      console.log(DECORATIVE_ELEMENTS.starBorder);
    } else {
      const header = command
        ? `${POD_MINI_LOGO} ${chalk.gray("›")} ${chalk.cyan.bold(command)}`
        : POD_MINI_LOGO;
      console.log(header);
      console.log(DIVIDERS.dots);
    }
  }
  console.log();
}

/**
 * Display command-specific decorative header
 */
export function showCommandHeader(command: string, subtitle?: string): void {
  if (blackTerminalMode) {
    blackTerminalCommandHeader(command, subtitle);
    return;
  }
  
  const commandBanner =
    COMMAND_BANNERS[command as keyof typeof COMMAND_BANNERS];
  if (commandBanner) {
    console.log(commandBanner);
    if (subtitle) {
      console.log(
        `${chalk.magenta("│")} ${chalk.white(subtitle)} ${chalk.magenta("│")}`,
      );
    }
    console.log(chalk.magenta("▀".repeat(30)));
  } else {
    showMiniHeader(command);
  }
  console.log();
}

/**
 * Format a section header
 */
export function sectionHeader(title: string, icon?: string): string {
  const colors = getColors();
  const prefix = icon ? `${icon} ` : "";
  return `${prefix}${colors.accent(title)}`;
}

/**
 * Format a status message with appropriate styling
 */
export function statusMessage(
  type: "success" | "error" | "warning" | "info",
  message: string,
  details?: string,
): string {
  const colors = getColors();
  const color = colors[type];
  const icon = ICONS[type];

  let output = `${icon} ${color(message)}`;
  if (details) {
    output += `\n   ${colors.dim(details)}`;
  }

  return output;
}

/**
 * Format a progress indicator
 */
export function progressIndicator(
  step: number,
  total: number,
  message: string,
): string {
  const colors = getColors();
  const percentage = Math.round((step / total) * 100);
  const progressBar =
    "█".repeat(Math.floor(percentage / 5)) +
    "░".repeat(20 - Math.floor(percentage / 5));

  return `${ICONS.loading} ${colors.info(`[${step}/${total}]`)} ${progressBar} ${percentage}%\n   ${message}`;
}

/**
 * Format a key-value pair for display
 */
export function keyValue(
  key: string,
  value: string | number,
  icon?: string,
): string {
  const colors = getColors();
  const prefix = icon ? `${icon} ` : "";
  return `${prefix}${colors.accent(key)}: ${colors.secondary(value.toString())}`;
}

/**
 * Create a bordered box for important information
 */
export function infoBox(
  title: string,
  content: string[],
  type: "info" | "warning" | "error" = "info",
): string {
  if (blackTerminalMode) {
    return blackTerminalInfoBox(title, content, type);
  }
  
  const color = BRAND_COLORS[type];
  const icon = ICONS[type];

  const maxWidth =
    Math.max(title.length, ...content.map((line) => line.length)) + 4;
  const border = "─".repeat(maxWidth);

  let box = `${color("┌" + border + "┐")}\n`;
  box += `${color("│")} ${icon} ${color.bold(title)}${" ".repeat(maxWidth - title.length - 2)} ${color("│")}\n`;
  box += `${color("├" + border + "┤")}\n`;

  content.forEach((line) => {
    box += `${color("│")} ${line}${" ".repeat(maxWidth - line.length - 1)} ${color("│")}\n`;
  });

  box += `${color("└" + border + "┘")}`;

  return box;
}

/**
 * Format command usage examples
 */
export function commandExample(command: string, description: string): string {
  const colors = getColors();
  return `${colors.muted("$")} ${colors.accent(command)}\n  ${colors.dim(description)}`;
}

/**
 * Create a branded spinner message
 */
export function spinnerMessage(message: string): string {
  const colors = getColors();
  return `${ICONS.loading} ${colors.info(message)}`;
}

/**
 * Black terminal specific banner with improved ASCII art and better Unicode support
 */
function showBlackTerminalBanner(): void {
  const purple = chalk.hex('#9D4EDD');
  const crimson = chalk.hex('#DC143C');
  const white = chalk.white;
  
  // Clear screen and set terminal background
  process.stdout.write('\x1b[2J\x1b[H\x1b[40m');
  
  console.log(purple.bold(
`██████╗  ██████╗ ██████╗     ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ ██████╗ ██╗     
██╔══██╗██╔═══██╗██╔══██╗    ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝██╔═══██╗██║     
██████╔╝██║   ██║██║  ██║    ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║     
██╔═══╝ ██║   ██║██║  ██║    ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║     
██║     ╚██████╔╝██████╔╝    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗╚██████╔╝███████╗
╚═╝      ╚═════╝ ╚═════╝     ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝`
  ));
  
  console.log(white.bold("\n                    The Ultimate AI Agent Communication Protocol"));
  console.log(crimson("                          Where prompts become prophecy ⚡️"));
  console.log(purple("─".repeat(80)));
}

/**
 * Enhanced black terminal "Prompt or Die" banner with better Unicode support
 */
function showBlackTerminalPromptOrDieBanner(): void {
  const purple = chalk.hex('#9D4EDD');
  const crimson = chalk.hex('#DC143C');
  const white = chalk.white;
  
  // Clear screen and set terminal background  
  process.stdout.write('\x1b[2J\x1b[H\x1b[40m');
  
  console.log(purple(
`╔═══════════════════════════════════════════════════════════════════════════════╗`
  ));
  console.log(purple(`║`) + " " + purple.bold(
`██████╗ ██████╗  ██████╗ ███╗   ███╗██████╗ ████████╗`
  ) + "  " + white.bold(
`██████╗ ██████╗ `
  ) + " " + purple(`║`));
  console.log(purple(`║`) + " " + purple.bold(
`██╔══██╗██╔══██╗██╔═══██╗████╗ ████║██╔══██╗╚══██╔══╝`
  ) + " " + white.bold(
`██╔═══██╗██╔══██╗`
  ) + " " + purple(`║`));
  console.log(purple(`║`) + " " + purple.bold(
`██████╔╝██████╔╝██║   ██║██╔████╔██║██████╔╝   ██║   `
  ) + " " + white.bold(
`██║   ██║██████╔╝`
  ) + " " + purple(`║`));
  console.log(purple(`║`) + " " + purple.bold(
`██╔═══╝ ██╔══██╗██║   ██║██║╚██╔╝██║██╔═══╝    ██║   `
  ) + " " + white.bold(
`██║   ██║██╔══██╗`
  ) + " " + purple(`║`));
  console.log(purple(`║`) + " " + purple.bold(
`██║     ██║  ██║╚██████╔╝██║ ╚═╝ ██║██║        ██║   `
  ) + " " + white.bold(
`╚██████╔╝██║  ██║`
  ) + " " + purple(`║`));
  console.log(purple(`║`) + " " + purple.bold(
`╚═╝     ╚═╝  ╚═╝ ╚═════╝ ╚═╝     ╚═╝╚═╝        ╚═╝   `
  ) + "  " + white.bold(
`╚═════╝ ╚═╝  ╚═╝`
  ) + " " + purple(`║`));
  console.log(purple(`║`) + " ".repeat(79) + purple(`║`));
  console.log(purple(`║`) + "    " + purple.bold(
`███████╗██╗██╗     ██╗`
  ) + " " + crimson.bold(
`███████╗    ██████╗ ██╗███████╗`
  ) + "    " + purple(`║`));
  console.log(purple(`║`) + "    " + purple.bold(
`██╔═════╝██║██║     ██║`
  ) + " " + crimson.bold(
`██╔════╝    ██╔══██╗██║██╔════╝`
  ) + "    " + purple(`║`));
  console.log(purple(`║`) + "    " + purple.bold(
`█████╗  ██║██║     ██║`
  ) + " " + crimson.bold(
`█████╗      ██║  ██║██║█████╗  `
  ) + "    " + purple(`║`));
  console.log(purple(`║`) + "    " + purple.bold(
`██╔══╝  ██║██║     ██║`
  ) + " " + crimson.bold(
`██╔══╝      ██║  ██║██║██╔══╝  `
  ) + "    " + purple(`║`));
  console.log(purple(`║`) + "    " + purple.bold(
`███████╗██║███████╗██║`
  ) + " " + crimson.bold(
`███████╗    ██████╔╝██║███████╗`
  ) + "    " + purple(`║`));
  console.log(purple(`║`) + "    " + purple.bold(
`╚══════╝╚═╝╚══════╝╚═╝`
  ) + " " + crimson.bold(
`╚══════╝    ╚═════╝ ╚═╝╚══════╝`
  ) + "    " + purple(`║`));
  console.log(purple(`║`) + " ".repeat(79) + purple(`║`));
  console.log(purple(`║`) + " " + white.bold(
`                    Where AI agents meet their destiny ⚡️`
  ) + "                  " + purple(`║`));
  console.log(purple(
`╚═══════════════════════════════════════════════════════════════════════════════╝`
  ));
}

/**
 * Enhanced status message for black terminal
 */
export function blackTerminalStatus(
  type: "success" | "error" | "warning" | "info",
  message: string,
  details?: string,
): string {
  if (!blackTerminalMode) {
    return statusMessage(type, message, details);
  }
  
  const colors = BLACK_TERMINAL_COLORS;
  const color = colors[type];
  const icon = ICONS[type];

  let output = `${icon} ${color(message)}`;
  if (details) {
    output += `\n   ${colors.dim(details)}`;
  }

  return output;
}

/**
 * Enhanced command header for black terminal
 */
export function blackTerminalCommandHeader(command: string, subtitle?: string): void {
  if (!blackTerminalMode) {
    showCommandHeader(command, subtitle);
    return;
  }
  
  const purple = chalk.hex('#9D4EDD');
  const crimson = chalk.hex('#DC143C');
  const white = chalk.white;
  
  console.log(purple("▄▄▄") + " " + white.bold(`🚀 ${command.toUpperCase()} COMMAND`) + " " + crimson("▄▄▄"));
  if (subtitle) {
    console.log(purple("│") + " " + white(subtitle) + " " + purple("│"));
  }
  console.log(purple("▀".repeat(30)));
  console.log();
}

/**
 * Black terminal compact banner
 */
function showBlackTerminalCompactBanner(): void {
  const purple = chalk.hex('#9D4EDD');
  const crimson = chalk.hex('#DC143C');
  const white = chalk.white;
  
  console.log(purple.bold("PROMPT") + " " + white.bold("or") + " " + crimson.bold("DIE") + " " + white("⚡️"));
  console.log(purple("─".repeat(30)));
}

/**
 * Black terminal mini banner
 */
function showBlackTerminalMiniBanner(): void {
  const purple = chalk.hex('#9D4EDD');
  const crimson = chalk.hex('#DC143C');
  const white = chalk.white;
  
  console.log(purple("[") + " " + purple.bold("PROMPT") + " " + white("or") + " " + crimson.bold("DIE") + " " + purple("]") + " " + white("⚡"));
}

/**
 * Black terminal compatible info box
 */
export function blackTerminalInfoBox(
  title: string,
  content: string[],
  type: "info" | "warning" | "error" = "info",
): string {
  if (!blackTerminalMode) {
    return infoBox(title, content, type);
  }
  
  const colors = BLACK_TERMINAL_COLORS;
  const color = colors[type];
  const icon = ICONS[type];

  const maxWidth = Math.max(title.length, ...content.map((line) => line.length)) + 4;
  const border = "─".repeat(maxWidth);

  let box = `${color("┌" + border + "┐")}\n`;
  box += `${color("│")} ${icon} ${chalk.white.bold(title)}${" ".repeat(maxWidth - title.length - 2)} ${color("│")}\n`;
  box += `${color("├" + border + "┤")}\n`;

  content.forEach((line) => {
    box += `${color("│")} ${chalk.white(line)}${" ".repeat(maxWidth - line.length - 1)} ${color("│")}\n`;
  });

  box += `${color("└" + border + "┘")}`;

  return box;
}
