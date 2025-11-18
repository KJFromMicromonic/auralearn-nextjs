/**
 * MistralAI Client
 *
 * Handles all AI interactions using MistralAI API via secure proxy route.
 * The API key is kept secure on the server and never exposed to the client.
 * Compatible with OpenAI API format for easy migration.
 */

// Use the API route to proxy requests (keeps API key secure on server)
const MISTRALAI_API_ROUTE = '/api/mistralai/chat';

export interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: 'json_object' };
}

/**
 * Call MistralAI API via secure proxy route
 *
 * @param messages - Array of messages (system + user)
 * @param options - Optional configuration
 * @returns AI response message
 */
export async function callMistralAI(
  messages: Message[],
  options: ChatCompletionOptions = {}
): Promise<{ content: string }> {
  const {
    model = 'mistral-large-latest',
    temperature = 0.7,
    max_tokens = 2500,
    response_format,
  } = options;

  try {
    // Call the API route which proxies to MistralAI (keeps API key secure)
    const response = await fetch(MISTRALAI_API_ROUTE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        ...(response_format && { response_format }),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(
        `MistralAI API error: ${response.status} - ${errorData.error || errorData.details || 'Unknown error'}`
      );
    }

    const data = await response.json();
    return {
      content: data.choices[0].message.content || '',
    };
  } catch (error) {
    console.error('MistralAI API call failed:', error);
    throw error;
  }
}

/**
 * Generate structured JSON response
 *
 * @param prompt - User prompt
 * @param systemPrompt - System prompt
 * @param schema - Expected JSON schema (for validation, optional)
 * @returns Parsed JSON response
 */
export async function generateStructuredResponse<T>(
  prompt: string,
  systemPrompt: string,
  schema?: Record<string, unknown>
): Promise<T> {
  const messages: Message[] = [
    { 
      role: 'system', 
      content: systemPrompt + '\n\nYou MUST respond with valid JSON matching the schema provided.' 
    },
    { role: 'user', content: prompt },
  ];

  const response = await callMistralAI(messages, {
    model: 'mistral-large-latest',
    temperature: 0.7,
    max_tokens: 2500,
    response_format: { type: 'json_object' },
  });

  try {
    // Try to parse JSON from response
    // Handle both code blocks and direct JSON
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
                      response.content.match(/```\n([\s\S]*?)\n```/) ||
                      response.content.match(/\{[\s\S]*\}/) ||
                      response.content.match(/\[[\s\S]*\]/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr) as T;
    }

    // If no JSON block found, try parsing the whole content
    return JSON.parse(response.content) as T;
  } catch (error) {
    console.error('Failed to parse JSON response:', response.content);
    throw new Error('Failed to parse structured response from MistralAI');
  }
}

