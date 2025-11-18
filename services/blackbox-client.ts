/**
 * BlackBox AI Client
 *
 * Handles all AI interactions using BlackBox AI API with tool calling support
 */

import { getEnvVar } from '@/lib/utils';

const BLACKBOX_API_URL = 'https://api.blackbox.ai/chat/completions';
const BLACKBOX_API_KEY = getEnvVar('NEXT_PUBLIC_BLACKBOX_API_KEY', '');

if (!BLACKBOX_API_KEY) {
  console.warn('⚠️ BlackBox API key not configured. AI features will use fallback responses.');
}

interface Message {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
  name?: string;
}

interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

interface Tool {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: {
      type: 'object';
      properties: Record<string, unknown>;
      required: string[];
    };
  };
}

/**
 * Call BlackBox AI with tool support
 */
export async function callBlackBoxAI(
  messages: Message[],
  tools?: Tool[],
  model: string = 'blackboxai/google/gemini-2.0-flash-001'
): Promise<Message> {
  if (!BLACKBOX_API_KEY) {
    throw new Error('BlackBox API key not configured');
  }

  const response = await fetch(BLACKBOX_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${BLACKBOX_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      tools,
      temperature: 0.7,
      max_tokens: 2500,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`BlackBox AI API error: ${response.status} ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message;
}

/**
 * Agentic loop for handling multiple tool calls
 */
export async function runAgenticLoop(
  initialMessage: string,
  tools: Tool[],
  toolMapping: Record<string, (args: unknown) => Promise<unknown>>,
  systemPrompt: string = 'You are a helpful assistant.',
  maxIterations: number = 10
): Promise<string> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: initialMessage },
  ];

  let iterationCount = 0;

  while (iterationCount < maxIterations) {
    iterationCount++;
    console.log(`🔄 Agentic loop iteration ${iterationCount}`);

    // Call BlackBox AI
    const response = await callBlackBoxAI(messages, tools);

    // Add assistant response to messages
    messages.push(response);

    // Check if there are tool calls
    if (response.tool_calls && response.tool_calls.length > 0) {
      console.log(`🔧 Processing ${response.tool_calls.length} tool calls`);

      // Execute each tool call
      for (const toolCall of response.tool_calls) {
        const toolName = toolCall.function.name;
        const toolArgs = JSON.parse(toolCall.function.arguments);

        console.log(`📞 Calling tool: ${toolName}`, toolArgs);

        // Execute the tool
        const toolFunction = toolMapping[toolName];
        if (!toolFunction) {
          throw new Error(`Tool ${toolName} not found in mapping`);
        }

        const toolResult = await toolFunction(toolArgs);

        // Add tool result to messages
        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          name: toolName,
          content: JSON.stringify(toolResult),
        });
      }
    } else {
      // No more tool calls, return final response
      console.log('✅ Agentic loop completed');
      return response.content || '';
    }
  }

  console.warn('⚠️ Maximum iterations reached');
  return messages[messages.length - 1].content || 'Maximum iterations reached without final answer';
}

/**
 * Generate structured JSON response
 */
export async function generateStructuredResponse<T>(
  prompt: string,
  systemPrompt: string,
  schema: Record<string, unknown>
): Promise<T> {
  const messages: Message[] = [
    { role: 'system', content: systemPrompt + '\n\nYou MUST respond with valid JSON matching the schema provided.' },
    { role: 'user', content: prompt },
  ];

  const response = await callBlackBoxAI(messages);

  try {
    // Try to parse JSON from response
    const jsonMatch = response.content.match(/```json\n([\s\S]*?)\n```/) ||
                      response.content.match(/\{[\s\S]*\}/);

    if (jsonMatch) {
      const jsonStr = jsonMatch[1] || jsonMatch[0];
      return JSON.parse(jsonStr) as T;
    }

    // If no JSON block found, try parsing the whole content
    return JSON.parse(response.content) as T;
  } catch (error) {
    console.error('Failed to parse JSON response:', response.content);
    throw new Error('Failed to parse structured response from BlackBox AI');
  }
}
