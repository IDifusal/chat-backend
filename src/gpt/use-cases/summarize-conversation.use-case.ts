import OpenAI from 'openai';

interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string | Date;
}

interface Options {
  conversation: ConversationMessage[] | string;
  maxLength?: number;
  language?: 'es' | 'en';
  includeKeyPoints?: boolean;
}

export const summarizeConversationUseCase = async (
  openai: OpenAI,
  options: Options,
) => {
  const {
    conversation,
    maxLength = 300,
    language = 'es',
    includeKeyPoints = true,
  } = options;

  // Convert conversation to text if it's an array
  let conversationText: string;

  if (typeof conversation === 'string') {
    conversationText = conversation;
  } else {
    // Format conversation messages into readable text
    conversationText = conversation
      .map((message) => {
        const role = message.role === 'user' ? 'Usuario' : 'Asistente';
        return `${role}: ${message.content}`;
      })
      .join('\n\n');
  }

  // Create the prompt for summarization
  const systemPrompt =
    language === 'es'
      ? `Eres un asistente experto en resumir conversaciones de manera clara y amigable para usuarios no técnicos. 
       Tu objetivo es crear resúmenes que sean fáciles de entender, destacando los puntos más importantes 
       de la conversación de forma natural y conversacional.

       Instrucciones:
       - Usa un lenguaje sencillo y claro
       - Evita términos técnicos complejos
       - Mantén un tono amigable y profesional
       - Resalta los temas principales discutidos
       - Incluye las conclusiones o decisiones importantes
       - Mantén el resumen conciso pero informativo
       ${includeKeyPoints ? '- Al final, incluye una sección "Puntos Clave" con los aspectos más importantes' : ''}`
      : `You are an expert assistant at summarizing conversations in a clear and friendly way for non-technical users.
       Your goal is to create summaries that are easy to understand, highlighting the most important points 
       of the conversation in a natural and conversational way.

       Instructions:
       - Use simple and clear language
       - Avoid complex technical terms
       - Maintain a friendly and professional tone
       - Highlight the main topics discussed
       - Include important conclusions or decisions
       - Keep the summary concise but informative
       ${includeKeyPoints ? '- At the end, include a "Key Points" section with the most important aspects' : ''}`;

  const userPrompt =
    language === 'es'
      ? `Por favor, resume la siguiente conversación en aproximadamente ${maxLength} palabras:

${conversationText}`
      : `Please summarize the following conversation in approximately ${maxLength} words:

${conversationText}`;

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt,
        },
        {
          role: 'user',
          content: userPrompt,
        },
      ],
      max_tokens: Math.max(maxLength * 2, 500), // Allow some buffer for the response
      temperature: 0.3, // Lower temperature for more consistent summaries
    });

    const summary = completion.choices[0]?.message?.content || '';
    return {
      summary: summary.trim(),
      wordCount: summary.split(' ').length,
      originalLength: conversationText.length,
      language,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error summarizing conversation:', error);
    throw new Error('Failed to summarize conversation');
  }
};
