import { WhatsAppMessage, WhatsAppCapture } from './whatsapp-data';

/**
 * Parses raw OCR text to extract WhatsApp messages
 * @param rawText - Raw text from OCR
 * @returns Array of parsed messages
 */
export function parseWhatsAppMessages(rawText: string): WhatsAppMessage[] {
  const messages: WhatsAppMessage[] = [];
  
  if (!rawText || rawText.trim().length === 0) {
    return messages;
  }

  // Split text into lines
  const lines = rawText.split('\n').filter(line => line.trim() !== '');
  
  // WhatsApp message patterns
  // Pattern 1: [HH:MM, DD/MM/YYYY] Sender: Message
  // Pattern 2: HH:MM Sender Message (simplified)
  // Pattern 3: Sender HH:MM Message
  
  const messagePatterns = [
    // Full timestamp pattern
    /\[(\d{1,2}:\d{2}),\s*(\d{1,2}\/\d{1,2}\/\d{4})\]\s*([^:]+):\s*(.*)/,
    // Time and sender pattern
    /(\d{1,2}:\d{2})\s+([^:]+):\s*(.*)/,
    // Sender and time pattern
    /^([^:]+)\s+(\d{1,2}:\d{2})\s+(.*)/,
    // Simple message pattern with just time
    /^(\d{1,2}:\d{2})\s+(.*)/
  ];

  let currentMessage: Partial<WhatsAppMessage> | null = null;
  let currentTimestamp = new Date();

  for (const line of lines) {
    let matched = false;

    // Try each pattern
    for (const pattern of messagePatterns) {
      const match = line.match(pattern);
      if (match) {
        // Save previous message if exists
        if (currentMessage && currentMessage.content) {
          messages.push(currentMessage as WhatsAppMessage);
        }

        // Parse the new message based on pattern
        if (pattern === messagePatterns[0]) {
          // Full timestamp pattern
          const [, time, date, sender, content] = match;
          currentTimestamp = parseTimestamp(time, date);
          currentMessage = {
            timestamp: currentTimestamp,
            sender: sender.trim(),
            content: content.trim(),
            isMedia: checkIfMedia(content)
          };
        } else if (pattern === messagePatterns[1]) {
          // Time and sender pattern
          const [, time, sender, content] = match;
          currentTimestamp = parseTimeOnly(time, currentTimestamp);
          currentMessage = {
            timestamp: currentTimestamp,
            sender: sender.trim(),
            content: content.trim(),
            isMedia: checkIfMedia(content)
          };
        } else if (pattern === messagePatterns[2]) {
          // Sender and time pattern
          const [, sender, time, content] = match;
          currentTimestamp = parseTimeOnly(time, currentTimestamp);
          currentMessage = {
            timestamp: currentTimestamp,
            sender: sender.trim(),
            content: content.trim(),
            isMedia: checkIfMedia(content)
          };
        } else if (pattern === messagePatterns[3]) {
          // Simple time pattern (no sender)
          const [, time, content] = match;
          currentTimestamp = parseTimeOnly(time, currentTimestamp);
          currentMessage = {
            timestamp: currentTimestamp,
            sender: "Unknown",
            content: content.trim(),
            isMedia: checkIfMedia(content)
          };
        }

        matched = true;
        break;
      }
    }

    // If no pattern matched, it might be a continuation of the previous message
    if (!matched && currentMessage) {
      currentMessage.content = (currentMessage.content || '') + ' ' + line.trim();
    }
  }

  // Don't forget the last message
  if (currentMessage && currentMessage.content) {
    messages.push(currentMessage as WhatsAppMessage);
  }

  // Add media type detection
  messages.forEach(msg => {
    if (msg.isMedia) {
      msg.mediaType = detectMediaType(msg.content);
    }
  });

  return messages;
}

/**
 * Parses a full timestamp string
 * @param time - Time string (HH:MM)
 * @param date - Date string (DD/MM/YYYY)
 * @returns Date object
 */
function parseTimestamp(time: string, date: string): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const [day, month, year] = date.split('/').map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

/**
 * Parses time only and uses reference date
 * @param time - Time string (HH:MM)
 * @param referenceDate - Reference date to use
 * @returns Date object
 */
function parseTimeOnly(time: string, referenceDate: Date): Date {
  const [hours, minutes] = time.split(':').map(Number);
  const newDate = new Date(referenceDate);
  newDate.setHours(hours, minutes, 0, 0);
  return newDate;
}

/**
 * Checks if a message contains media
 * @param content - Message content
 * @returns Boolean indicating if message contains media
 */
function checkIfMedia(content: string): boolean {
  const mediaIndicators = [
    'Photo', 'Foto', 'Image', 'Imagem',
    'Video', 'Vídeo',
    'Audio', 'Áudio',
    'Document', 'Documento',
    'GIF',
    'Sticker', 'Figurinha',
    '<Media omitted>', '<Mídia oculta>',
    '.jpg', '.png', '.mp4', '.pdf', '.docx'
  ];

  const lowerContent = content.toLowerCase();
  return mediaIndicators.some(indicator => lowerContent.includes(indicator.toLowerCase()));
}

/**
 * Detects the type of media in a message
 * @param content - Message content
 * @returns Media type or undefined
 */
function detectMediaType(content: string): string | undefined {
  const lowerContent = content.toLowerCase();
  
  if (lowerContent.includes('photo') || lowerContent.includes('foto') || 
      lowerContent.includes('image') || lowerContent.includes('imagem') ||
      lowerContent.includes('.jpg') || lowerContent.includes('.png')) {
    return 'image';
  }
  
  if (lowerContent.includes('video') || lowerContent.includes('vídeo') ||
      lowerContent.includes('.mp4')) {
    return 'video';
  }
  
  if (lowerContent.includes('audio') || lowerContent.includes('áudio') ||
      lowerContent.includes('.mp3') || lowerContent.includes('.ogg')) {
    return 'audio';
  }
  
  if (lowerContent.includes('document') || lowerContent.includes('documento') ||
      lowerContent.includes('.pdf') || lowerContent.includes('.docx')) {
    return 'document';
  }
  
  if (lowerContent.includes('gif')) {
    return 'gif';
  }
  
  if (lowerContent.includes('sticker') || lowerContent.includes('figurinha')) {
    return 'sticker';
  }
  
  return 'unknown';
}

/**
 * Extracts messages from WhatsApp captures
 * @param captures - Array of WhatsApp captures
 * @returns Updated captures with extracted messages
 */
export function extractMessagesFromCaptures(captures: WhatsAppCapture[]): WhatsAppCapture[] {
  return captures.map(capture => ({
    ...capture,
    messages: parseWhatsAppMessages(capture.rawText)
  }));
}

/**
 * Filters messages by sender
 * @param messages - Array of messages
 * @param sender - Sender name to filter by
 * @returns Filtered messages
 */
export function filterMessagesBySender(messages: WhatsAppMessage[], sender: string): WhatsAppMessage[] {
  return messages.filter(msg => 
    msg.sender.toLowerCase().includes(sender.toLowerCase())
  );
}

/**
 * Filters messages by time range
 * @param messages - Array of messages
 * @param startTime - Start time
 * @param endTime - End time
 * @returns Filtered messages
 */
export function filterMessagesByTime(
  messages: WhatsAppMessage[], 
  startTime: Date, 
  endTime: Date
): WhatsAppMessage[] {
  return messages.filter(msg => 
    msg.timestamp >= startTime && msg.timestamp <= endTime
  );
}

/**
 * Groups messages by sender
 * @param messages - Array of messages
 * @returns Map of sender to messages
 */
export function groupMessagesBySender(messages: WhatsAppMessage[]): Map<string, WhatsAppMessage[]> {
  const grouped = new Map<string, WhatsAppMessage[]>();
  
  for (const message of messages) {
    const sender = message.sender;
    if (!grouped.has(sender)) {
      grouped.set(sender, []);
    }
    grouped.get(sender)!.push(message);
  }
  
  return grouped;
}