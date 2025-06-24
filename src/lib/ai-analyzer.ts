import { generateObject } from "ai";
import { ollama } from "ollama-ai-provider";
import { z } from "zod";
import { WhatsAppMessage } from "./whatsapp-data";

// Schema for topic extraction
const topicSchema = z.object({
  title: z.string().describe("Brief title of the topic (max 50 chars)"),
  summary: z.string().describe("Concise summary of the topic"),
  category: z.string().describe("Category: work, personal, urgent, reminder, link, appointment, task, or other"),
  importance: z.number().min(1).max(10).describe("Importance score from 1-10"),
  participants: z.array(z.string()).describe("People involved in this topic"),
  keyPoints: z.array(z.string()).describe("Key points or action items"),
  relatedMessages: z.array(z.string()).describe("Snippets of related messages"),
  timestamp: z.string().describe("ISO timestamp of when the topic was discussed"),
  actionRequired: z.boolean().describe("Whether this topic requires action"),
  deadline: z.string().optional().describe("Deadline if mentioned (ISO format)")
});

const topicsResponseSchema = z.object({
  topics: z.array(topicSchema),
  overallSummary: z.string().describe("Brief summary of all conversations"),
  totalMessages: z.number(),
  timeRange: z.object({
    start: z.string(),
    end: z.string()
  })
});

export type Topic = z.infer<typeof topicSchema>;
export type TopicsResponse = z.infer<typeof topicsResponseSchema>;

/**
 * Analyzes WhatsApp messages and extracts important topics using AI
 * @param messages - Array of WhatsApp messages
 * @param model - AI model to use (default: llama3.2)
 * @param minImportanceScore - Minimum importance score to include topic
 * @returns Topics response with extracted topics
 */
export async function extractTopics(
  messages: WhatsAppMessage[],
  model: string = "llama3.2",
  minImportanceScore: number = 6
): Promise<TopicsResponse> {
  if (!messages || messages.length === 0) {
    return {
      topics: [],
      overallSummary: "No messages to analyze",
      totalMessages: 0,
      timeRange: {
        start: new Date().toISOString(),
        end: new Date().toISOString()
      }
    };
  }

  // Prepare messages for AI analysis
  const messageText = messages.map(msg => 
    `[${msg.timestamp.toLocaleTimeString()}] ${msg.sender}: ${msg.content}`
  ).join('\n');

  const startTime = messages[0].timestamp;
  const endTime = messages[messages.length - 1].timestamp;

  const prompt = `You are analyzing WhatsApp conversation messages to extract important topics.
    
    Analyze the following WhatsApp messages and extract all important topics that might require attention, action, or are worth remembering.
    
    Focus on:
    - Work-related discussions and tasks
    - Personal commitments and appointments
    - Urgent matters that need immediate attention
    - Links, resources, or references shared
    - Reminders and deadlines mentioned
    - Important decisions or agreements made
    - Plans or events being discussed
    
    Messages:
    ${messageText}
    
    Time range: ${startTime.toLocaleString()} to ${endTime.toLocaleString()}
    Total messages: ${messages.length}
    
    Extract topics with importance score >= ${minImportanceScore}.
    
    For each topic, provide:
    - A clear, concise title
    - A summary of what was discussed
    - The appropriate category
    - An importance score (1-10, where 10 is extremely important)
    - Participants involved
    - Key points or action items
    - Related message snippets
    - Whether action is required
    - Any deadlines mentioned`;

  try {
    const provider = ollama(model);
    const response = await generateObject({
      model: provider,
      messages: [{ role: "user", content: prompt }],
      schema: topicsResponseSchema,
    });

    // Filter topics by importance score
    const filteredTopics = response.object.topics.filter(
      topic => topic.importance >= minImportanceScore
    );

    return {
      ...response.object,
      topics: filteredTopics,
      totalMessages: messages.length,
      timeRange: {
        start: startTime.toISOString(),
        end: endTime.toISOString()
      }
    };
  } catch (error) {
    console.error("Error extracting topics with AI:", error);
    throw error;
  }
}

/**
 * Analyzes a single conversation thread for topics
 * @param messages - Messages from a specific conversation
 * @param conversationName - Name of the conversation/group
 * @param model - AI model to use
 * @returns Topics specific to this conversation
 */
export async function analyzeConversation(
  messages: WhatsAppMessage[],
  conversationName: string,
  model: string = "llama3.2"
): Promise<Topic[]> {
  const messageText = messages.map(msg => 
    `[${msg.timestamp.toLocaleTimeString()}] ${msg.sender}: ${msg.content}`
  ).join('\n');

  const prompt = `Analyze this WhatsApp conversation "${conversationName}" and extract important topics.
    
    Messages:
    ${messageText}
    
    Focus on extracting actionable items, important information, and key decisions.`;

  try {
    const provider = ollama(model);
    const response = await generateObject({
      model: provider,
      messages: [{ role: "user", content: prompt }],
      schema: z.object({ topics: z.array(topicSchema) }),
    });

    return response.object.topics;
  } catch (error) {
    console.error("Error analyzing conversation:", error);
    return [];
  }
}

/**
 * Categorizes messages by topic using AI
 * @param messages - Array of messages to categorize
 * @param customCategories - Custom categories to use
 * @param model - AI model to use
 * @returns Map of category to messages
 */
export async function categorizeMessages(
  messages: WhatsAppMessage[],
  customCategories: string[] = ["work", "personal", "urgent", "reminders", "links", "appointments", "tasks"],
  model: string = "llama3.2"
): Promise<Map<string, WhatsAppMessage[]>> {
  const categorizedMessages = new Map<string, WhatsAppMessage[]>();
  
  // Initialize categories
  customCategories.forEach(cat => categorizedMessages.set(cat, []));
  categorizedMessages.set("other", []);

  // Batch process messages for efficiency
  const batchSize = 10;
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    
    const prompt = `Categorize these WhatsApp messages into one of these categories: ${customCategories.join(", ")}, or "other".
      
      Messages:
      ${batch.map((msg, idx) => `${idx + 1}. [${msg.sender}]: ${msg.content}`).join('\n')}
      
      Return a JSON array with the category for each message by index.`;

    try {
      const provider = ollama(model);
      const response = await generateObject({
        model: provider,
        messages: [{ role: "user", content: prompt }],
        schema: z.object({
          categories: z.array(z.object({
            messageIndex: z.number(),
            category: z.string()
          }))
        }),
      });

      // Assign messages to categories
      response.object.categories.forEach(({ messageIndex, category }) => {
        const message = batch[messageIndex];
        if (message) {
          const cat = categorizedMessages.has(category) ? category : "other";
          categorizedMessages.get(cat)!.push(message);
        }
      });
    } catch (error) {
      console.error("Error categorizing batch:", error);
      // Add uncategorized messages to "other"
      batch.forEach(msg => categorizedMessages.get("other")!.push(msg));
    }
  }

  return categorizedMessages;
}

/**
 * Generates action items from messages
 * @param messages - Messages to analyze
 * @param model - AI model to use
 * @returns List of action items
 */
export async function extractActionItems(
  messages: WhatsAppMessage[],
  model: string = "llama3.2"
): Promise<Array<{
  task: string;
  assignee: string;
  deadline?: string;
  priority: "high" | "medium" | "low";
  source: string;
}>> {
  const messageText = messages.map(msg => 
    `[${msg.timestamp.toLocaleTimeString()}] ${msg.sender}: ${msg.content}`
  ).join('\n');

  const prompt = `Extract all action items, tasks, and commitments from these WhatsApp messages.
    
    Messages:
    ${messageText}
    
    For each action item, identify:
    - The task description
    - Who is responsible (assignee)
    - Any deadline mentioned
    - Priority level
    - The message it came from`;

  try {
    const provider = ollama(model);
    const response = await generateObject({
      model: provider,
      messages: [{ role: "user", content: prompt }],
      schema: z.object({
        actionItems: z.array(z.object({
          task: z.string(),
          assignee: z.string(),
          deadline: z.string().optional(),
          priority: z.enum(["high", "medium", "low"]),
          source: z.string()
        }))
      }),
    });

    return response.object.actionItems;
  } catch (error) {
    console.error("Error extracting action items:", error);
    return [];
  }
}