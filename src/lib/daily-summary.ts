import { format, startOfDay, endOfDay } from "date-fns";
import { Topic, TopicsResponse } from "./ai-analyzer";
import { WhatsAppMessage } from "./whatsapp-data";

export interface DailySummary {
  date: Date;
  totalMessages: number;
  totalConversations: number;
  topicsByCategory: Map<string, Topic[]>;
  urgentTopics: Topic[];
  actionItems: ActionItem[];
  keyHighlights: string[];
  overallSummary: string;
  timeDistribution: TimeDistribution[];
}

export interface ActionItem {
  task: string;
  assignee: string;
  deadline?: Date;
  priority: "high" | "medium" | "low";
  topic: string;
  completed: boolean;
}

export interface TimeDistribution {
  hour: number;
  messageCount: number;
  topicCount: number;
}

/**
 * Generates a comprehensive daily summary from topics
 * @param topics - Extracted topics from the day
 * @param messages - All messages from the day
 * @returns Daily summary object
 */
export function generateDailySummary(
  topics: Topic[],
  messages: WhatsAppMessage[]
): DailySummary {
  const date = new Date();
  
  // Group topics by category
  const topicsByCategory = groupTopicsByCategory(topics);
  
  // Filter urgent topics (importance >= 8)
  const urgentTopics = topics.filter(topic => topic.importance >= 8);
  
  // Extract action items from topics
  const actionItems = extractActionItemsFromTopics(topics);
  
  // Generate key highlights
  const keyHighlights = generateKeyHighlights(topics, messages);
  
  // Calculate time distribution
  const timeDistribution = calculateTimeDistribution(messages, topics);
  
  // Count unique conversations
  const uniqueSenders = new Set(messages.map(msg => msg.sender));
  
  // Generate overall summary
  const overallSummary = generateOverallSummary(topics, messages, uniqueSenders.size);
  
  return {
    date,
    totalMessages: messages.length,
    totalConversations: uniqueSenders.size,
    topicsByCategory,
    urgentTopics,
    actionItems,
    keyHighlights,
    overallSummary,
    timeDistribution
  };
}

/**
 * Groups topics by category
 * @param topics - Array of topics
 * @returns Map of category to topics
 */
function groupTopicsByCategory(topics: Topic[]): Map<string, Topic[]> {
  const grouped = new Map<string, Topic[]>();
  
  topics.forEach(topic => {
    const category = topic.category;
    if (!grouped.has(category)) {
      grouped.set(category, []);
    }
    grouped.get(category)!.push(topic);
  });
  
  // Sort topics within each category by importance
  grouped.forEach((topicList, category) => {
    grouped.set(category, topicList.sort((a, b) => b.importance - a.importance));
  });
  
  return grouped;
}

/**
 * Extracts action items from topics
 * @param topics - Array of topics
 * @returns Array of action items
 */
function extractActionItemsFromTopics(topics: Topic[]): ActionItem[] {
  const actionItems: ActionItem[] = [];
  
  topics.forEach(topic => {
    if (topic.actionRequired) {
      topic.keyPoints.forEach(point => {
        // Simple heuristic to identify action items
        if (point.toLowerCase().includes("need to") || 
            point.toLowerCase().includes("will") ||
            point.toLowerCase().includes("should") ||
            point.toLowerCase().includes("must")) {
          
          actionItems.push({
            task: point,
            assignee: topic.participants[0] || "Unknown",
            deadline: topic.deadline ? new Date(topic.deadline) : undefined,
            priority: topic.importance >= 8 ? "high" : topic.importance >= 5 ? "medium" : "low",
            topic: topic.title,
            completed: false
          });
        }
      });
    }
  });
  
  return actionItems;
}

/**
 * Generates key highlights from the day
 * @param topics - Array of topics
 * @param messages - Array of messages
 * @returns Array of highlight strings
 */
function generateKeyHighlights(topics: Topic[], messages: WhatsAppMessage[]): string[] {
  const highlights: string[] = [];
  
  // Most important topics
  const topTopics = topics
    .sort((a, b) => b.importance - a.importance)
    .slice(0, 3);
  
  topTopics.forEach(topic => {
    highlights.push(`⭐ ${topic.title} (${topic.category})`);
  });
  
  // Urgent items
  const urgentCount = topics.filter(t => t.importance >= 8).length;
  if (urgentCount > 0) {
    highlights.push(`🚨 ${urgentCount} urgent topic${urgentCount > 1 ? 's' : ''} requiring attention`);
  }
  
  // Action items
  const actionCount = topics.filter(t => t.actionRequired).length;
  if (actionCount > 0) {
    highlights.push(`✅ ${actionCount} action item${actionCount > 1 ? 's' : ''} to complete`);
  }
  
  // Most active conversation
  const senderCounts = new Map<string, number>();
  messages.forEach(msg => {
    senderCounts.set(msg.sender, (senderCounts.get(msg.sender) || 0) + 1);
  });
  
  const mostActive = Array.from(senderCounts.entries())
    .sort((a, b) => b[1] - a[1])[0];
  
  if (mostActive) {
    highlights.push(`💬 Most active: ${mostActive[0]} (${mostActive[1]} messages)`);
  }
  
  return highlights;
}

/**
 * Calculates message and topic distribution by hour
 * @param messages - Array of messages
 * @param topics - Array of topics
 * @returns Time distribution array
 */
function calculateTimeDistribution(
  messages: WhatsAppMessage[], 
  topics: Topic[]
): TimeDistribution[] {
  const distribution: TimeDistribution[] = [];
  
  // Initialize all hours
  for (let hour = 0; hour < 24; hour++) {
    distribution.push({
      hour,
      messageCount: 0,
      topicCount: 0
    });
  }
  
  // Count messages per hour
  messages.forEach(msg => {
    const hour = msg.timestamp.getHours();
    distribution[hour].messageCount++;
  });
  
  // Count topics per hour
  topics.forEach(topic => {
    const topicTime = new Date(topic.timestamp);
    const hour = topicTime.getHours();
    distribution[hour].topicCount++;
  });
  
  return distribution;
}

/**
 * Generates an overall summary of the day
 * @param topics - Array of topics
 * @param messages - Array of messages
 * @param conversationCount - Number of unique conversations
 * @returns Summary string
 */
function generateOverallSummary(
  topics: Topic[], 
  messages: WhatsAppMessage[], 
  conversationCount: number
): string {
  const categoryCount = new Map<string, number>();
  topics.forEach(topic => {
    categoryCount.set(topic.category, (categoryCount.get(topic.category) || 0) + 1);
  });
  
  const topCategories = Array.from(categoryCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([cat, count]) => `${cat} (${count})`);
  
  const urgentCount = topics.filter(t => t.importance >= 8).length;
  const actionCount = topics.filter(t => t.actionRequired).length;
  
  return `Today you had ${conversationCount} active conversations with ${messages.length} messages. ` +
         `${topics.length} important topics were identified, with ${urgentCount} urgent items and ${actionCount} requiring action. ` +
         `Main categories: ${topCategories.join(", ")}.`;
}

/**
 * Formats the daily summary for display
 * @param summary - Daily summary object
 * @returns Formatted string
 */
export function formatDailySummary(summary: DailySummary): string {
  const lines: string[] = [];
  
  lines.push(`📅 Daily WhatsApp Summary - ${format(summary.date, "MMMM d, yyyy")}`);
  lines.push(`${"=".repeat(50)}\n`);
  
  lines.push(`📊 Overview:`);
  lines.push(summary.overallSummary);
  lines.push("");
  
  lines.push(`🌟 Key Highlights:`);
  summary.keyHighlights.forEach(highlight => {
    lines.push(`  ${highlight}`);
  });
  lines.push("");
  
  if (summary.urgentTopics.length > 0) {
    lines.push(`🚨 Urgent Topics:`);
    summary.urgentTopics.forEach(topic => {
      lines.push(`  • ${topic.title} - ${topic.summary}`);
    });
    lines.push("");
  }
  
  lines.push(`📋 Topics by Category:`);
  summary.topicsByCategory.forEach((topics, category) => {
    lines.push(`\n${category.toUpperCase()} (${topics.length}):`);
    topics.slice(0, 3).forEach(topic => {
      lines.push(`  • ${topic.title} [${topic.importance}/10]`);
    });
    if (topics.length > 3) {
      lines.push(`  ... and ${topics.length - 3} more`);
    }
  });
  
  if (summary.actionItems.length > 0) {
    lines.push(`\n✅ Action Items:`);
    summary.actionItems.forEach(item => {
      const priority = item.priority === "high" ? "🔴" : item.priority === "medium" ? "🟡" : "🟢";
      const deadline = item.deadline ? ` (Due: ${format(item.deadline, "MMM d")})` : "";
      lines.push(`  ${priority} ${item.task}${deadline}`);
    });
  }
  
  return lines.join("\n");
}

/**
 * Generates a summary for a specific time range
 * @param topics - Topics within the time range
 * @param startTime - Start of the range
 * @param endTime - End of the range
 * @returns Summary object
 */
export function generateTimeRangeSummary(
  topics: Topic[],
  messages: WhatsAppMessage[],
  startTime: Date,
  endTime: Date
): {
  summary: string;
  topicCount: number;
  messageCount: number;
  highlights: string[];
} {
  // Filter topics and messages within the time range
  const rangeTopics = topics.filter(topic => {
    const topicTime = new Date(topic.timestamp);
    return topicTime >= startTime && topicTime <= endTime;
  });
  
  const rangeMessages = messages.filter(msg => 
    msg.timestamp >= startTime && msg.timestamp <= endTime
  );
  
  const highlights = generateKeyHighlights(rangeTopics, rangeMessages);
  
  const summary = `Between ${format(startTime, "HH:mm")} and ${format(endTime, "HH:mm")}: ` +
                 `${rangeMessages.length} messages, ${rangeTopics.length} topics identified. ` +
                 `${rangeTopics.filter(t => t.actionRequired).length} items need action.`;
  
  return {
    summary,
    topicCount: rangeTopics.length,
    messageCount: rangeMessages.length,
    highlights
  };
}