export enum AppType {
  TIMETABLELY = "timetablely",
  DOCXIQ = "docxiq",
  LINKSHYFT = "linkshyft",
}

interface AppPromptConfig {
  systemInstructions: string;
  context: string;
  capabilities: string[];
  apiKey: string;
}

const APP_PROMPTS: Record<AppType, AppPromptConfig> = {
  [AppType.TIMETABLELY]: {
    systemInstructions: `You are an AI assistant specialized in timetable and schedule management.
Your role is to help users create, optimize, and manage academic timetables efficiently.`,
    context: `Timetablely is a comprehensive timetable management system that handles:
- Course scheduling and allocation
- Teacher/tutor availability management
- Class session organization
- Conflict detection and resolution
- Automated timetable generation`,
    capabilities: [
      "Generate optimized timetables based on constraints",
      "Detect and resolve scheduling conflicts",
      "Suggest optimal time slots for courses",
      "Manage teacher workload distribution",
      "Handle multiple sessions and classes",
      "Apply scheduling rules and preferences",
    ],
    apiKey: process.env.TIMETABLELY_GEMINI_API_KEY || "",
  },

  [AppType.DOCXIQ]: {
    systemInstructions: `You are an AI assistant specialized in document intelligence and processing.
Your role is to help users analyze, extract, and manipulate document content efficiently.`,
    context: `DocxIQ is a document intelligence platform that provides:
- Document parsing and analysis
- Content extraction and transformation
- Text processing and manipulation
- Document format conversion
- Intelligent document search`,
    capabilities: [
      "Extract and analyze document content",
      "Convert between document formats",
      "Parse structured data from documents",
      "Perform intelligent document search",
      "Generate document summaries",
      "Extract metadata and key information",
    ],
    apiKey: process.env.DOCXIQ_GEMINI_API_KEY || "",
  },

  [AppType.LINKSHYFT]: {
    systemInstructions: `You are an AI assistant specialized in link management and URL shortening.
Your role is to help users create, manage, and analyze shortened links and QR codes.`,
    context: `LinkShyft is a link management platform that offers:
- URL shortening and customization
- QR code generation
- Link analytics and tracking
- Custom domain support
- Link organization and categorization`,
    capabilities: [
      "Create and customize shortened URLs",
      "Generate QR codes for links",
      "Track link performance and analytics",
      "Organize links with tags and categories",
      "Manage custom domains",
      "Provide link insights and statistics",
    ],
    apiKey: process.env.LINKSHYFT_GEMINI_API_KEY || "",
  },
};

interface BuildPromptOptions {
  appType: AppType;
  userPrompt: string;
  includeCapabilities?: boolean;
  additionalContext?: string;
}

export const buildPrompt = ({
  appType,
  userPrompt,
  includeCapabilities = true,
  additionalContext,
}: BuildPromptOptions): string => {
  const appConfig = APP_PROMPTS[appType];

  if (!appConfig) {
    throw new Error(`Invalid app type: ${appType}`);
  }

  const sections: string[] = [
    `# System Instructions`,
    appConfig.systemInstructions,
    ``,
    `# Application Context`,
    appConfig.context,
  ];

  if (includeCapabilities) {
    sections.push(
      ``,
      `# Capabilities`,
      ...appConfig.capabilities.map((cap) => `- ${cap}`),
    );
  }

  if (additionalContext) {
    sections.push(``, `# Additional Context`, additionalContext);
  }

  sections.push(``, `# User Request`, userPrompt);

  return sections.join("\n");
};

export const getAppInstructions = (appType: AppType): string => {
  const appConfig = APP_PROMPTS[appType];
  if (!appConfig) {
    throw new Error(`Invalid app type: ${appType}`);
  }
  return appConfig.systemInstructions;
};

export const getAppContext = (appType: AppType): string => {
  const appConfig = APP_PROMPTS[appType];
  if (!appConfig) {
    throw new Error(`Invalid app type: ${appType}`);
  }
  return appConfig.context;
};

export const getAppCapabilities = (appType: AppType): string[] => {
  const appConfig = APP_PROMPTS[appType];
  if (!appConfig) {
    throw new Error(`Invalid app type: ${appType}`);
  }
  return appConfig.capabilities;
};

export const getAppApiKey = (appType: AppType): string => {
  const appConfig = APP_PROMPTS[appType];
  if (!appConfig) {
    throw new Error(`Invalid app type: ${appType}`);
  }
  if (!appConfig.apiKey) {
    throw new Error(`API key not configured for app type: ${appType}`);
  }
  return appConfig.apiKey;
};
