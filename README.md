# WhatsApp Topics Extractor Pipe

A screenpipe plugin that automatically extracts and categorizes important topics from your WhatsApp Web conversations throughout the day.

## Features

- 🔍 **Automatic Topic Extraction**: Uses AI to identify important topics from WhatsApp conversations
- 📊 **Smart Categorization**: Organizes topics into categories (work, personal, urgent, reminders, etc.)
- ✅ **Action Item Tracking**: Automatically identifies and tracks tasks that need to be done
- 📅 **Daily Summaries**: Generates comprehensive daily summaries of your WhatsApp activity
- 🔎 **Search Functionality**: Search through all extracted topics
- 🚨 **Urgent Topic Alerts**: Highlights topics that need immediate attention
- 💾 **Persistent Storage**: Stores topics and summaries for future reference

## How It Works

1. **Screen Capture**: The pipe monitors WhatsApp Web through screenpipe's OCR capabilities
2. **Message Extraction**: Parses the captured text to extract individual messages
3. **AI Analysis**: Uses AI (Ollama, OpenAI, or other providers) to analyze messages and extract important topics
4. **Categorization**: Automatically categorizes topics and assigns importance scores
5. **Storage**: Saves topics, action items, and summaries for easy access

## Configuration

The pipe can be configured through screenpipe settings:

- **Update Interval**: How often to analyze WhatsApp conversations (default: 30 minutes)
- **AI Model**: Choose between llama3.2, phi4, gpt-4o, or claude-3-sonnet
- **Categories**: Customize topic categories
- **Minimum Importance Score**: Set threshold for topic importance (1-10)
- **Auto Summarize**: Enable daily summaries at a specific time
- **Sender Filters**: Include or exclude specific contacts

## API Endpoints

### Extract Topics
```
GET /api/whatsapp-topics?action=extract
```
Manually trigger topic extraction from recent WhatsApp data.

### Generate Daily Summary
```
GET /api/whatsapp-topics?action=summary
```
Generate a comprehensive daily summary.

### Get Topics
```
GET /api/whatsapp-topics?action=topics&date=2024-01-01
```
Get topics for a specific date.

### Search Topics
```
GET /api/whatsapp-topics?action=search&q=meeting
```
Search through all stored topics.

### Update Action Item
```
POST /api/whatsapp-topics
{
  "action": "updateActionItem",
  "id": "item-id",
  "updates": { "completed": true }
}
```

## Installation

1. Install the pipe through screenpipe UI by adding the pipe URL
2. Configure your preferred AI model and settings
3. Make sure WhatsApp Web is open in your browser
4. The pipe will automatically start extracting topics based on your update interval

## Requirements

- screenpipe must be running with screen capture enabled
- WhatsApp Web must be accessible in your browser
- An AI provider (Ollama, OpenAI, etc.) must be configured

## Privacy

All data is processed locally on your machine. Topics and summaries are stored in screenpipe's local storage. No data is sent to external servers unless you explicitly configure an external AI provider.

## Troubleshooting

- **No topics found**: Ensure WhatsApp Web is open and visible on screen
- **AI errors**: Check that your AI provider is properly configured and running
- **Missing messages**: Increase the update interval or check OCR quality settings

## License

This pipe is part of the screenpipe ecosystem and follows the same license terms.