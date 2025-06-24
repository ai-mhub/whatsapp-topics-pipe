import { pipe } from "@screenpipe/js";

export interface WhatsAppMessage {
  timestamp: Date;
  sender: string;
  content: string;
  isMedia: boolean;
  mediaType?: string;
}

export interface WhatsAppCapture {
  timestamp: Date;
  messages: WhatsAppMessage[];
  rawText: string;
  screenshot?: string;
}

/**
 * Captures WhatsApp Web data from screenpipe
 * @param hours - Number of hours to look back (default: 1)
 * @returns Array of WhatsApp captures with messages
 */
export async function captureWhatsAppData(hours: number = 1): Promise<WhatsAppCapture[]> {
  const endTime = new Date();
  const startTime = new Date(endTime.getTime() - hours * 60 * 60 * 1000);

  try {
    // Query screenpipe for WhatsApp Web content
    const results = await pipe.queryScreenpipe({
      browserUrl: "web.whatsapp.com",
      contentType: "ocr",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      limit: 1000,
      includeFrames: true
    });

    if (!results || !results.data || results.data.length === 0) {
      console.log("No WhatsApp data found in the specified time range");
      return [];
    }

    // Process and group captures
    const captures: WhatsAppCapture[] = results.data.map((item: any) => {
      const timestamp = new Date(
        item.type === "OCR" ? item.content.timestamp : item.content.timestamp
      );

      const rawText = item.type === "OCR" ? item.content.text : item.content.text;
      const screenshot = item.type === "OCR" && item.content.frame ? item.content.frame : null;

      return {
        timestamp,
        messages: [], // Will be extracted in the next step
        rawText,
        screenshot
      };
    });

    return captures;
  } catch (error) {
    console.error("Error capturing WhatsApp data:", error);
    throw error;
  }
}

/**
 * Fetches WhatsApp data for the entire day
 * @returns Array of WhatsApp captures from the last 24 hours
 */
export async function getDailyWhatsAppData(): Promise<WhatsAppCapture[]> {
  return captureWhatsAppData(24);
}

/**
 * Fetches WhatsApp data for a specific time range
 * @param startTime - Start of the time range
 * @param endTime - End of the time range
 * @returns Array of WhatsApp captures
 */
export async function getWhatsAppDataInRange(
  startTime: Date,
  endTime: Date
): Promise<WhatsAppCapture[]> {
  try {
    const results = await pipe.queryScreenpipe({
      browserUrl: "web.whatsapp.com",
      contentType: "ocr",
      startTime: startTime.toISOString(),
      endTime: endTime.toISOString(),
      limit: 1000,
      includeFrames: true
    });

    if (!results || !results.data || results.data.length === 0) {
      return [];
    }

    return results.data.map((item: any) => {
      const timestamp = new Date(
        item.type === "OCR" ? item.content.timestamp : item.content.timestamp
      );

      const rawText = item.type === "OCR" ? item.content.text : item.content.text;
      const screenshot = item.type === "OCR" && item.content.frame ? item.content.frame : null;

      return {
        timestamp,
        messages: [],
        rawText,
        screenshot
      };
    });
  } catch (error) {
    console.error("Error fetching WhatsApp data in range:", error);
    throw error;
  }
}