import { pipe } from "@screenpipe/js";

export interface WhatsAppTopicsSettings {
  enabled: boolean;
  updateInterval: number; // in minutes
  aiModel: string;
  categories: string[];
  minImportanceScore: number;
  autoSummarize: boolean;
  summarizeTime: string; // HH:MM format
  storageLocation: string;
  maxDaysToKeep: number;
  notifyUrgentTopics: boolean;
  excludeSenders: string[];
  includeOnlySenders: string[];
  language: string;
}

export const DEFAULT_SETTINGS: WhatsAppTopicsSettings = {
  enabled: true,
  updateInterval: 30,
  aiModel: "llama3.2",
  categories: ["work", "personal", "urgent", "reminders", "links", "appointments", "tasks"],
  minImportanceScore: 6,
  autoSummarize: true,
  summarizeTime: "18:00",
  storageLocation: "whatsapp-topics",
  maxDaysToKeep: 30,
  notifyUrgentTopics: true,
  excludeSenders: [],
  includeOnlySenders: [],
  language: "en"
};

/**
 * Loads settings from screenpipe storage
 * @returns Current settings or defaults
 */
export async function loadSettings(): Promise<WhatsAppTopicsSettings> {
  try {
    const storedSettings = await pipe.getCustomSettings("whatsappTopics");
    
    if (!storedSettings || Object.keys(storedSettings).length === 0) {
      // First time setup - save defaults
      await saveSettings(DEFAULT_SETTINGS);
      return DEFAULT_SETTINGS;
    }
    
    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_SETTINGS,
      ...storedSettings
    } as WhatsAppTopicsSettings;
  } catch (error) {
    console.error("Error loading settings:", error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Saves settings to screenpipe storage
 * @param settings - Settings to save
 */
export async function saveSettings(settings: WhatsAppTopicsSettings): Promise<void> {
  try {
    await pipe.setCustomSettings("whatsappTopics", settings);
    console.log("Settings saved successfully");
  } catch (error) {
    console.error("Error saving settings:", error);
    throw error;
  }
}

/**
 * Updates specific settings fields
 * @param updates - Partial settings to update
 */
export async function updateSettings(updates: Partial<WhatsAppTopicsSettings>): Promise<WhatsAppTopicsSettings> {
  const currentSettings = await loadSettings();
  const newSettings = {
    ...currentSettings,
    ...updates
  };
  
  await saveSettings(newSettings);
  return newSettings;
}

/**
 * Validates settings
 * @param settings - Settings to validate
 * @returns Validation result with any errors
 */
export function validateSettings(settings: WhatsAppTopicsSettings): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // Validate update interval
  if (settings.updateInterval < 5 || settings.updateInterval > 360) {
    errors.push("Update interval must be between 5 and 360 minutes");
  }
  
  // Validate AI model
  const validModels = ["llama3.2", "phi4:14b-q4_K_M", "gpt-4o", "claude-3-sonnet"];
  if (!validModels.includes(settings.aiModel)) {
    errors.push(`AI model must be one of: ${validModels.join(", ")}`);
  }
  
  // Validate categories
  if (!settings.categories || settings.categories.length === 0) {
    errors.push("At least one category must be defined");
  }
  
  // Validate importance score
  if (settings.minImportanceScore < 1 || settings.minImportanceScore > 10) {
    errors.push("Minimum importance score must be between 1 and 10");
  }
  
  // Validate summarize time format
  if (settings.autoSummarize && !isValidTimeFormat(settings.summarizeTime)) {
    errors.push("Summarize time must be in HH:MM format");
  }
  
  // Validate max days to keep
  if (settings.maxDaysToKeep < 1 || settings.maxDaysToKeep > 365) {
    errors.push("Max days to keep must be between 1 and 365");
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Checks if a time string is in valid HH:MM format
 * @param time - Time string to validate
 * @returns True if valid
 */
function isValidTimeFormat(time: string): boolean {
  const regex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  return regex.test(time);
}

/**
 * Gets the next scheduled run time based on settings
 * @param settings - Current settings
 * @returns Next run time as Date
 */
export function getNextRunTime(settings: WhatsAppTopicsSettings): Date {
  const now = new Date();
  const nextRun = new Date(now.getTime() + settings.updateInterval * 60 * 1000);
  return nextRun;
}

/**
 * Gets the next summary time based on settings
 * @param settings - Current settings
 * @returns Next summary time as Date
 */
export function getNextSummaryTime(settings: WhatsAppTopicsSettings): Date | null {
  if (!settings.autoSummarize) {
    return null;
  }
  
  const now = new Date();
  const [hours, minutes] = settings.summarizeTime.split(":").map(Number);
  
  const summaryTime = new Date(now);
  summaryTime.setHours(hours, minutes, 0, 0);
  
  // If the time has already passed today, set it for tomorrow
  if (summaryTime <= now) {
    summaryTime.setDate(summaryTime.getDate() + 1);
  }
  
  return summaryTime;
}

/**
 * Checks if a sender should be processed based on settings
 * @param sender - Sender name
 * @param settings - Current settings
 * @returns True if sender should be processed
 */
export function shouldProcessSender(sender: string, settings: WhatsAppTopicsSettings): boolean {
  // Check exclude list
  if (settings.excludeSenders.length > 0) {
    const isExcluded = settings.excludeSenders.some(excluded => 
      sender.toLowerCase().includes(excluded.toLowerCase())
    );
    if (isExcluded) return false;
  }
  
  // Check include list (if specified, only these senders are processed)
  if (settings.includeOnlySenders.length > 0) {
    const isIncluded = settings.includeOnlySenders.some(included => 
      sender.toLowerCase().includes(included.toLowerCase())
    );
    return isIncluded;
  }
  
  return true;
}

/**
 * Resets settings to defaults
 */
export async function resetSettings(): Promise<void> {
  await saveSettings(DEFAULT_SETTINGS);
}