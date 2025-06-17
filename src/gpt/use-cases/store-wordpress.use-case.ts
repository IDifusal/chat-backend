import { getCompanyConfig } from 'src/config/assistants.config';

interface Options {
  threadId: string;
  question: string;
  company?: string;
  assistant?: string;
}

export const storeWordpress = async (options: Options): Promise<void> => {
  const { threadId, question, company = 'default', assistant = null } = options;

  // Get company config for WordPress settings
  const companyConfig = getCompanyConfig(company);

  // Check if WordPress is ready for this company
  if (!companyConfig.wordpress.isReady) {
    console.log(`WordPress not ready for company: ${company}`);
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
  };

  try {
    const response = await fetch(companyConfig.wordpress.endpoint, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        threadId: threadId,
        message: question,
        company: company,
        assistant: assistant || companyConfig.assistant.name,
      }),
    });

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    // Parse the JSON response body
    const responseData = await response.json();
    console.log(`WORDPRESS RESPONSE DATA for ${company}:`, responseData);
  } catch (error) {
    console.error(
      `There was a problem with the WordPress fetch for ${company}:`,
      error,
    );
  }
};
