# WhatsApp Topics Pipe - Usage Guide

## Quick Start

1. **Install Dependencies**
   ```bash
   cd whatsapp-topics-pipe
   npm install
   ```

2. **Run the Pipe**
   ```bash
   npm run dev
   ```
   The UI will be available at `http://localhost:3030`

3. **Configure AI Provider**
   - Make sure you have Ollama running with a model like `llama3.2`
   - Or configure OpenAI/Anthropic API keys in screenpipe settings

## How to Use

### Automatic Topic Extraction

1. Open WhatsApp Web in your browser
2. The pipe will automatically capture and analyze conversations every 30 minutes (configurable)
3. Topics are extracted based on importance and categorized automatically

### Manual Actions

**Extract Topics Now**
- Click the "Extract Topics" button to manually trigger analysis
- Useful when you want immediate results

**Generate Daily Summary**
- Click "Generate Daily Summary" to create a comprehensive overview
- Best used at the end of your workday

**Search Topics**
- Use the search bar to find specific topics across all stored data
- Search by keywords, participants, or content

### Understanding the UI

**Topics Tab**
- Shows all topics for the selected date
- Color-coded badges indicate categories
- Importance scores help prioritize
- Archive topics you've addressed

**Action Items Tab**
- Lists all tasks extracted from conversations
- Priority indicators (🔴 High, 🟡 Medium, 🟢 Low)
- Mark items as complete when done

**Summaries Tab**
- Daily overviews of your WhatsApp activity
- Key statistics and highlights
- Urgent topics are highlighted

**Search Results Tab**
- Shows results from your searches
- Includes context and timestamps

## Best Practices

1. **Keep WhatsApp Web Visible**: Ensure the WhatsApp Web tab is not minimized for better OCR accuracy

2. **Regular Reviews**: Check the extracted topics at least twice a day to stay on top of important items

3. **Customize Categories**: Adjust categories in settings to match your workflow

4. **Set Importance Threshold**: Adjust the minimum importance score based on your needs

5. **Use Sender Filters**: Configure include/exclude lists to focus on relevant conversations

## Troubleshooting

**"No WhatsApp data found"**
- Ensure WhatsApp Web is open and logged in
- Check that screenpipe is capturing your screen
- Try increasing the capture time window

**"Topics not being extracted"**
- Verify your AI model is running (e.g., `ollama list`)
- Check the browser URL includes "web.whatsapp.com"
- Ensure messages are visible on screen during capture

**"Missing important topics"**
- Lower the minimum importance score in settings
- Add specific keywords to your search
- Check if sender filters are too restrictive

## Advanced Features

### API Integration
You can integrate the pipe with other tools using the API endpoints:

```javascript
// Extract topics programmatically
fetch('http://localhost:3030/api/whatsapp-topics?action=extract')
  .then(res => res.json())
  .then(data => console.log(data.topics));

// Get today's summary
fetch('http://localhost:3030/api/whatsapp-topics?action=summary')
  .then(res => res.json())
  .then(data => console.log(data.formatted));
```

### Custom Categories
Edit the categories in screenpipe settings to match your needs:
- Add project-specific categories
- Create categories for different teams
- Set up personal vs professional categories

### Automation
- Set up the pipe to run at specific intervals
- Configure daily summary generation time
- Enable urgent topic notifications

## Data Management

- Topics are stored for 30 days by default (configurable)
- Export data using the API for backup
- Archive completed topics to reduce clutter
- Use search to find historical topics