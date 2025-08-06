export interface AssistantConfig {
  id: string;
  name: string;
  description?: string;
  apiKey?: string; // Optional: Different API key for each assistant
  model?: string; // Optional: Different model for each assistant
  predefinedMessages?: string[]; // Array of predefined initial messages
}

export interface WordPressConfig {
  isReady: boolean;
  endpoint: string;
}

export interface CompanyConfig {
  name: string;
  description?: string;
  assistant: AssistantConfig; // Single assistant instead of multiple
  wordpress: WordPressConfig;
}

export const assistantsConfig: { [key: string]: CompanyConfig } = {
  // Default company config
  default: {
    name: 'Default Company',
    assistant: {
      id: 'asst_sqBNPQPw6UUymJGZr4SFslm7', // Current assistant ID
      name: 'Main Assistant',
      predefinedMessages: [
        'How can I help you today?',
        'What would you like to know about our services?',
        'Do you have any questions about our products?',
      ],
    },
    wordpress: {
      isReady: true,
      endpoint: 'https://centromedicolatino.com/wp-json/custom/v1/thread/',
    },
  },

  // Example of another company
  espanglish: {
    name: 'Company 1',
    assistant: {
      id: 'asst_sqBNPQPw6UUymJGZr4SFslm7', // Replace with actual ID
      name: 'Espanglish Assistant',
      description: 'Assistant that helps with Spanish-English translation',
      predefinedMessages: [
        '¿Cómo puedo ayudarte hoy?',
        '¿Qué te gustaría saber sobre nuestros servicios?',
        'Do you need help with translation?',
      ],
    },
    wordpress: {
      isReady: false,
      endpoint: 'https://company1.com/wp-json/custom/v1/thread/',
    },
  },
  laTorreLaw: {
    name: 'La Torre Law',
    assistant: {
      id: 'asst_UyucgVomt8ss7y5BUDvwoFut', // Replace with actual ID
      name: 'La Torre Law Assistant',
      description: 'Assistant that helps with legal services',
    },
    wordpress: {
      isReady: false,
      endpoint: 'https://latorellaw.com/wp-json/custom/v1/thread/',
    },
  },
};

// Helper function to get assistant configuration
export function getAssistantConfig(
  company: string = 'default',
): AssistantConfig {
  // Check if company exists, otherwise use default
  const companyConfig = assistantsConfig[company] || assistantsConfig.default;

  // Return the single assistant for the company
  return companyConfig.assistant;
}

// Helper function to get company configuration
export function getCompanyConfig(company: string = 'default'): CompanyConfig {
  return assistantsConfig[company] || assistantsConfig.default;
}

// Helper function to check if a company exists
export function companyExists(company: string): boolean {
  return !!assistantsConfig[company];
}
