import { NextRequest, NextResponse } from "next/server";
import { captureWhatsAppData, getDailyWhatsAppData } from "../../../src/lib/whatsapp-data";
import { extractMessagesFromCaptures } from "../../../src/lib/message-parser";
import { extractTopics, categorizeMessages, extractActionItems } from "@/lib/ai-analyzer";
import { generateDailySummary, formatDailySummary } from "@/lib/daily-summary";
import { loadSettings, shouldProcessSender } from "@/lib/settings";
import { 
  storeTopics, 
  storeDailySummary, 
  storeActionItems,
  getTopicsForDate,
  getPendingActionItems,
  getRecentSummaries,
  searchTopics
} from "@/lib/storage";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const action = searchParams.get("action");

  try {
    switch (action) {
      case "extract":
        // Extract topics from recent WhatsApp data
        return await handleExtractTopics();
      
      case "summary":
        // Generate daily summary
        return await handleDailySummary();
      
      case "topics":
        // Get topics for a specific date
        const dateStr = searchParams.get("date");
        return await handleGetTopics(dateStr);
      
      case "actions":
        // Get pending action items
        return await handleGetActionItems();
      
      case "search":
        // Search topics
        const query = searchParams.get("q");
        return await handleSearchTopics(query);
      
      case "recent":
        // Get recent summaries
        const days = searchParams.get("days");
        return await handleGetRecentSummaries(days);
      
      default:
        return NextResponse.json({
          error: "Invalid action. Use: extract, summary, topics, actions, search, or recent"
        }, { status: 400 });
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}

async function handleExtractTopics() {
  const settings = await loadSettings();
  
  if (!settings.enabled) {
    return NextResponse.json({
      message: "WhatsApp Topics pipe is disabled"
    });
  }

  // Capture WhatsApp data from the last update interval
  const hoursToCapture = settings.updateInterval / 60;
  const captures = await captureWhatsAppData(hoursToCapture);
  
  if (captures.length === 0) {
    return NextResponse.json({
      message: "No WhatsApp data found",
      capturedHours: hoursToCapture,
      topicsFound: 0
    });
  }

  // Extract messages from captures
  const capturesWithMessages = extractMessagesFromCaptures(captures);
  
  // Filter messages based on sender settings
  let allMessages = capturesWithMessages.flatMap(c => c.messages);
  allMessages = allMessages.filter(msg => 
    shouldProcessSender(msg.sender, settings)
  );

  if (allMessages.length === 0) {
    return NextResponse.json({
      message: "No messages found after filtering",
      capturesCount: captures.length,
      topicsFound: 0
    });
  }

  // Extract topics using AI
  const topicsResponse = await extractTopics(
    allMessages, 
    settings.aiModel, 
    settings.minImportanceScore
  );

  // Store topics
  const storedTopics = await storeTopics(topicsResponse.topics);

  // Extract and store action items
  const actionItems = await extractActionItems(allMessages, settings.aiModel);
  if (actionItems.length > 0) {
    await storeActionItems(actionItems);
  }

  // Check for urgent topics and notify if needed
  const urgentTopics = topicsResponse.topics.filter(t => t.importance >= 8);
  
  return NextResponse.json({
    message: "Topics extracted successfully",
    capturesCount: captures.length,
    messagesProcessed: allMessages.length,
    topicsFound: storedTopics.length,
    urgentTopics: urgentTopics.length,
    actionItems: actionItems.length,
    topics: storedTopics,
    overallSummary: topicsResponse.overallSummary
  });
}

async function handleDailySummary() {
  const settings = await loadSettings();
  
  // Get all WhatsApp data for the day
  const captures = await getDailyWhatsAppData();
  const capturesWithMessages = extractMessagesFromCaptures(captures);
  
  // Filter messages
  let allMessages = capturesWithMessages.flatMap(c => c.messages);
  allMessages = allMessages.filter(msg => 
    shouldProcessSender(msg.sender, settings)
  );

  if (allMessages.length === 0) {
    return NextResponse.json({
      message: "No messages found for today",
      summary: null
    });
  }

  // Get today's topics
  const todayTopics = await getTopicsForDate(new Date());
  
  // Generate summary
  const summary = generateDailySummary(
    todayTopics.map(t => ({
      title: t.title,
      summary: t.summary,
      category: t.category,
      importance: t.importance,
      participants: t.participants,
      keyPoints: t.keyPoints,
      relatedMessages: t.relatedMessages,
      timestamp: t.timestamp,
      actionRequired: t.actionRequired,
      deadline: t.deadline
    })),
    allMessages
  );

  // Store summary
  const storedSummary = await storeDailySummary(summary);
  
  // Format summary for display
  const formattedSummary = formatDailySummary(summary);

  return NextResponse.json({
    message: "Daily summary generated",
    summary: storedSummary,
    formatted: formattedSummary,
    stats: {
      totalMessages: summary.totalMessages,
      totalConversations: summary.totalConversations,
      urgentTopics: summary.urgentTopics.length,
      actionItems: summary.actionItems.length
    }
  });
}

async function handleGetTopics(dateStr: string | null) {
  const date = dateStr ? new Date(dateStr) : new Date();
  const topics = await getTopicsForDate(date);
  
  return NextResponse.json({
    date: date.toISOString(),
    topics: topics,
    count: topics.length
  });
}

async function handleGetActionItems() {
  const actionItems = await getPendingActionItems();
  
  return NextResponse.json({
    actionItems: actionItems,
    count: actionItems.length
  });
}

async function handleSearchTopics(query: string | null) {
  if (!query || query.trim().length === 0) {
    return NextResponse.json({
      error: "Search query is required"
    }, { status: 400 });
  }

  const topics = await searchTopics(query);
  
  return NextResponse.json({
    query: query,
    results: topics,
    count: topics.length
  });
}

async function handleGetRecentSummaries(daysStr: string | null) {
  const days = daysStr ? parseInt(daysStr) : 7;
  const summaries = await getRecentSummaries(days);
  
  return NextResponse.json({
    days: days,
    summaries: summaries,
    count: summaries.length
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { action } = body;

  try {
    switch (action) {
      case "updateActionItem":
        // Update an action item
        const { id, updates } = body;
        if (!id) {
          return NextResponse.json({
            error: "Action item ID is required"
          }, { status: 400 });
        }
        
        const { updateActionItem } = await import("@/lib/storage");
        await updateActionItem(id, updates);
        
        return NextResponse.json({
          message: "Action item updated successfully",
          id: id
        });
      
      case "archiveTopic":
        // Archive a topic
        const { topicId } = body;
        if (!topicId) {
          return NextResponse.json({
            error: "Topic ID is required"
          }, { status: 400 });
        }
        
        const { archiveTopic } = await import("@/lib/storage");
        await archiveTopic(topicId);
        
        return NextResponse.json({
          message: "Topic archived successfully",
          id: topicId
        });
      
      default:
        return NextResponse.json({
          error: "Invalid action. Use: updateActionItem or archiveTopic"
        }, { status: 400 });
    }
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({
      error: "Internal server error",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}