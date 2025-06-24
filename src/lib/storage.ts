import { pipe } from "@screenpipe/js";
import { Topic } from "./ai-analyzer";
import { DailySummary, ActionItem } from "./daily-summary";
import { format } from "date-fns";

export interface StoredTopic extends Topic {
  id: string;
  extractedAt: string;
  archived: boolean;
}

export interface StoredSummary {
  id: string;
  date: string;
  summary: DailySummary;
  createdAt: string;
}

export interface StoredActionItem extends ActionItem {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export interface TopicsStorage {
  topics: StoredTopic[];
  summaries: StoredSummary[];
  actionItems: StoredActionItem[];
  lastUpdated: string;
}

const STORAGE_KEY = "whatsappTopicsData";

/**
 * Loads stored data from screenpipe storage
 * @returns Stored topics data
 */
export async function loadStoredData(): Promise<TopicsStorage> {
  try {
    const data = await pipe.getCustomData(STORAGE_KEY);
    
    if (!data || typeof data !== "object") {
      return {
        topics: [],
        summaries: [],
        actionItems: [],
        lastUpdated: new Date().toISOString()
      };
    }
    
    return data as TopicsStorage;
  } catch (error) {
    console.error("Error loading stored data:", error);
    return {
      topics: [],
      summaries: [],
      actionItems: [],
      lastUpdated: new Date().toISOString()
    };
  }
}

/**
 * Saves data to screenpipe storage
 * @param data - Data to save
 */
export async function saveStoredData(data: TopicsStorage): Promise<void> {
  try {
    data.lastUpdated = new Date().toISOString();
    await pipe.setCustomData(STORAGE_KEY, data);
    console.log("Data saved successfully");
  } catch (error) {
    console.error("Error saving data:", error);
    throw error;
  }
}

/**
 * Stores new topics
 * @param topics - Topics to store
 * @returns Stored topics with IDs
 */
export async function storeTopics(topics: Topic[]): Promise<StoredTopic[]> {
  const data = await loadStoredData();
  const now = new Date().toISOString();
  
  const storedTopics: StoredTopic[] = topics.map(topic => ({
    ...topic,
    id: generateId(),
    extractedAt: now,
    archived: false
  }));
  
  // Add new topics to existing ones
  data.topics = [...data.topics, ...storedTopics];
  
  // Clean up old topics based on settings
  await cleanupOldData(data);
  
  await saveStoredData(data);
  return storedTopics;
}

/**
 * Stores a daily summary
 * @param summary - Daily summary to store
 * @returns Stored summary with ID
 */
export async function storeDailySummary(summary: DailySummary): Promise<StoredSummary> {
  const data = await loadStoredData();
  
  const storedSummary: StoredSummary = {
    id: generateId(),
    date: format(summary.date, "yyyy-MM-dd"),
    summary: summary,
    createdAt: new Date().toISOString()
  };
  
  // Check if summary for this date already exists
  const existingIndex = data.summaries.findIndex(s => s.date === storedSummary.date);
  if (existingIndex >= 0) {
    data.summaries[existingIndex] = storedSummary;
  } else {
    data.summaries.push(storedSummary);
  }
  
  await saveStoredData(data);
  return storedSummary;
}

/**
 * Stores action items
 * @param actionItems - Action items to store
 * @returns Stored action items with IDs
 */
export async function storeActionItems(actionItems: ActionItem[]): Promise<StoredActionItem[]> {
  const data = await loadStoredData();
  const now = new Date().toISOString();
  
  const storedItems: StoredActionItem[] = actionItems.map(item => ({
    ...item,
    id: generateId(),
    createdAt: now,
    updatedAt: now
  }));
  
  data.actionItems = [...data.actionItems, ...storedItems];
  
  await saveStoredData(data);
  return storedItems;
}

/**
 * Gets topics for a specific date
 * @param date - Date to get topics for
 * @returns Topics for that date
 */
export async function getTopicsForDate(date: Date): Promise<StoredTopic[]> {
  const data = await loadStoredData();
  const dateStr = format(date, "yyyy-MM-dd");
  
  return data.topics.filter(topic => {
    const topicDate = format(new Date(topic.timestamp), "yyyy-MM-dd");
    return topicDate === dateStr && !topic.archived;
  });
}

/**
 * Gets topics by category
 * @param category - Category to filter by
 * @returns Topics in that category
 */
export async function getTopicsByCategory(category: string): Promise<StoredTopic[]> {
  const data = await loadStoredData();
  return data.topics.filter(topic => 
    topic.category === category && !topic.archived
  );
}

/**
 * Gets pending action items
 * @returns Uncompleted action items
 */
export async function getPendingActionItems(): Promise<StoredActionItem[]> {
  const data = await loadStoredData();
  return data.actionItems.filter(item => !item.completed);
}

/**
 * Updates an action item
 * @param id - Action item ID
 * @param updates - Updates to apply
 */
export async function updateActionItem(
  id: string, 
  updates: Partial<ActionItem>
): Promise<void> {
  const data = await loadStoredData();
  const index = data.actionItems.findIndex(item => item.id === id);
  
  if (index >= 0) {
    data.actionItems[index] = {
      ...data.actionItems[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await saveStoredData(data);
  }
}

/**
 * Archives a topic
 * @param id - Topic ID to archive
 */
export async function archiveTopic(id: string): Promise<void> {
  const data = await loadStoredData();
  const index = data.topics.findIndex(topic => topic.id === id);
  
  if (index >= 0) {
    data.topics[index].archived = true;
    await saveStoredData(data);
  }
}

/**
 * Gets summary for a specific date
 * @param date - Date to get summary for
 * @returns Summary if exists
 */
export async function getSummaryForDate(date: Date): Promise<StoredSummary | null> {
  const data = await loadStoredData();
  const dateStr = format(date, "yyyy-MM-dd");
  
  return data.summaries.find(s => s.date === dateStr) || null;
}

/**
 * Gets recent summaries
 * @param days - Number of days to look back
 * @returns Recent summaries
 */
export async function getRecentSummaries(days: number = 7): Promise<StoredSummary[]> {
  const data = await loadStoredData();
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return data.summaries
    .filter(s => new Date(s.date) >= cutoffDate)
    .sort((a, b) => b.date.localeCompare(a.date));
}

/**
 * Searches topics by text
 * @param query - Search query
 * @returns Matching topics
 */
export async function searchTopics(query: string): Promise<StoredTopic[]> {
  const data = await loadStoredData();
  const lowerQuery = query.toLowerCase();
  
  return data.topics.filter(topic => {
    if (topic.archived) return false;
    
    return (
      topic.title.toLowerCase().includes(lowerQuery) ||
      topic.summary.toLowerCase().includes(lowerQuery) ||
      topic.keyPoints.some(point => point.toLowerCase().includes(lowerQuery)) ||
      topic.relatedMessages.some(msg => msg.toLowerCase().includes(lowerQuery))
    );
  });
}

/**
 * Gets statistics about stored data
 * @returns Storage statistics
 */
export async function getStorageStats(): Promise<{
  totalTopics: number;
  totalSummaries: number;
  totalActionItems: number;
  pendingActionItems: number;
  topicsByCategory: Map<string, number>;
  oldestData: Date | null;
  newestData: Date | null;
}> {
  const data = await loadStoredData();
  
  const topicsByCategory = new Map<string, number>();
  data.topics.forEach(topic => {
    if (!topic.archived) {
      topicsByCategory.set(
        topic.category,
        (topicsByCategory.get(topic.category) || 0) + 1
      );
    }
  });
  
  const dates = [
    ...data.topics.map(t => new Date(t.extractedAt)),
    ...data.summaries.map(s => new Date(s.createdAt))
  ];
  
  return {
    totalTopics: data.topics.filter(t => !t.archived).length,
    totalSummaries: data.summaries.length,
    totalActionItems: data.actionItems.length,
    pendingActionItems: data.actionItems.filter(i => !i.completed).length,
    topicsByCategory,
    oldestData: dates.length > 0 ? new Date(Math.min(...dates.map(d => d.getTime()))) : null,
    newestData: dates.length > 0 ? new Date(Math.max(...dates.map(d => d.getTime()))) : null
  };
}

/**
 * Cleans up old data based on settings
 * @param data - Current storage data
 * @param maxDays - Maximum days to keep data
 */
async function cleanupOldData(data: TopicsStorage, maxDays: number = 30): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - maxDays);
  const cutoffStr = cutoffDate.toISOString();
  
  // Clean up old topics
  data.topics = data.topics.filter(topic => 
    topic.extractedAt > cutoffStr || !topic.archived
  );
  
  // Clean up old summaries
  data.summaries = data.summaries.filter(summary => 
    summary.createdAt > cutoffStr
  );
  
  // Clean up completed action items older than cutoff
  data.actionItems = data.actionItems.filter(item => 
    !item.completed || item.updatedAt > cutoffStr
  );
}

/**
 * Generates a unique ID
 * @returns Unique ID string
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Exports data to JSON
 * @returns JSON string of all data
 */
export async function exportData(): Promise<string> {
  const data = await loadStoredData();
  return JSON.stringify(data, null, 2);
}

/**
 * Clears all stored data
 */
export async function clearAllData(): Promise<void> {
  await saveStoredData({
    topics: [],
    summaries: [],
    actionItems: [],
    lastUpdated: new Date().toISOString()
  });
}