"use client";

import React, { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@radix-ui/react-tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { 
  MessageCircle, 
  Calendar, 
  CheckCircle2, 
  Search, 
  RefreshCw,
  Settings,
  Archive,
  AlertCircle,
  Clock,
  Users
} from "lucide-react";
import { format } from "date-fns";

interface Topic {
  id: string;
  title: string;
  summary: string;
  category: string;
  importance: number;
  participants: string[];
  timestamp: string;
  actionRequired: boolean;
  archived: boolean;
}

interface ActionItem {
  id: string;
  task: string;
  assignee: string;
  deadline?: string;
  priority: "high" | "medium" | "low";
  completed: boolean;
}

interface Summary {
  id: string;
  date: string;
  summary: {
    totalMessages: number;
    totalConversations: number;
    urgentTopics: Topic[];
    overallSummary: string;
  };
}

export default function WhatsAppTopicsPage() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [recentSummaries, setRecentSummaries] = useState<Summary[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Topic[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activeTab, setActiveTab] = useState("topics");

  useEffect(() => {
    loadData();
  }, [selectedDate]);

  const loadData = async () => {
    setLoading(true);
    try {
      // Load topics for selected date
      const topicsRes = await fetch(`/api/whatsapp-topics?action=topics&date=${selectedDate.toISOString()}`);
      const topicsData = await topicsRes.json();
      setTopics(topicsData.topics || []);

      // Load pending action items
      const actionsRes = await fetch("/api/whatsapp-topics?action=actions");
      const actionsData = await actionsRes.json();
      setActionItems(actionsData.actionItems || []);

      // Load recent summaries
      const summariesRes = await fetch("/api/whatsapp-topics?action=recent&days=7");
      const summariesData = await summariesRes.json();
      setRecentSummaries(summariesData.summaries || []);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  };

  const extractTopics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp-topics?action=extract");
      const data = await res.json();
      if (data.topics) {
        setTopics(data.topics);
        alert(`Extracted ${data.topicsFound} topics from ${data.messagesProcessed} messages`);
      }
    } catch (error) {
      console.error("Error extracting topics:", error);
      alert("Failed to extract topics");
    } finally {
      setLoading(false);
    }
  };

  const generateSummary = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/whatsapp-topics?action=summary");
      const data = await res.json();
      if (data.summary) {
        alert("Daily summary generated successfully!");
        loadData();
      }
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Failed to generate summary");
    } finally {
      setLoading(false);
    }
  };

  const searchTopics = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/whatsapp-topics?action=search&q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch (error) {
      console.error("Error searching topics:", error);
    } finally {
      setLoading(false);
    }
  };

  const updateActionItem = async (id: string, updates: Partial<ActionItem>) => {
    try {
      const res = await fetch("/api/whatsapp-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateActionItem", id, updates })
      });
      
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Error updating action item:", error);
    }
  };

  const archiveTopic = async (topicId: string) => {
    try {
      const res = await fetch("/api/whatsapp-topics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "archiveTopic", topicId })
      });
      
      if (res.ok) {
        loadData();
      }
    } catch (error) {
      console.error("Error archiving topic:", error);
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      work: "bg-blue-500",
      personal: "bg-green-500",
      urgent: "bg-red-500",
      reminders: "bg-yellow-500",
      links: "bg-purple-500",
      appointments: "bg-orange-500",
      tasks: "bg-indigo-500"
    };
    return colors[category] || "bg-gray-500";
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "high": return "🔴";
      case "medium": return "🟡";
      case "low": return "🟢";
      default: return "⚪";
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <MessageCircle className="w-8 h-8" />
          WhatsApp Topics Extractor
        </h1>
        <p className="text-gray-600">
          Automatically extract and categorize important topics from your WhatsApp conversations
        </p>
      </div>

      <div className="mb-6 flex gap-4 flex-wrap">
        <Button onClick={extractTopics} disabled={loading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Extract Topics
        </Button>
        <Button onClick={generateSummary} disabled={loading} variant="secondary" className="gap-2">
          <Calendar className="w-4 h-4" />
          Generate Daily Summary
        </Button>
        <div className="flex gap-2 flex-1 max-w-md">
          <Input
            placeholder="Search topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && searchTopics()}
          />
          <Button onClick={searchTopics} size="icon">
            <Search className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 gap-4 bg-gray-100 p-1 rounded-lg">
          <TabsTrigger value="topics" className="data-[state=active]:bg-white rounded">
            Topics
          </TabsTrigger>
          <TabsTrigger value="actions" className="data-[state=active]:bg-white rounded">
            Action Items
          </TabsTrigger>
          <TabsTrigger value="summaries" className="data-[state=active]:bg-white rounded">
            Summaries
          </TabsTrigger>
          <TabsTrigger value="search" className="data-[state=active]:bg-white rounded">
            Search Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="topics" className="space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Topics for {format(selectedDate, "MMMM d, yyyy")}</h2>
            <input
              type="date"
              value={format(selectedDate, "yyyy-MM-dd")}
              onChange={(e) => setSelectedDate(new Date(e.target.value))}
              className="px-3 py-2 border rounded-md"
            />
          </div>
          
          {topics.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No topics found for this date</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {topics.map((topic) => (
                <Card key={topic.id} className={topic.archived ? "opacity-50" : ""}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {topic.title}
                          {topic.actionRequired && (
                            <Badge variant="destructive" className="text-xs">
                              Action Required
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {topic.summary}
                        </CardDescription>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => archiveTopic(topic.id)}
                        disabled={topic.archived}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge className={getCategoryColor(topic.category)}>
                        {topic.category}
                      </Badge>
                      <Badge variant="outline">
                        Importance: {topic.importance}/10
                      </Badge>
                      <Badge variant="outline" className="gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(topic.timestamp), "HH:mm")}
                      </Badge>
                      {topic.participants.length > 0 && (
                        <Badge variant="outline" className="gap-1">
                          <Users className="w-3 h-3" />
                          {topic.participants.join(", ")}
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="actions" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Pending Action Items</h2>
          
          {actionItems.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No pending action items</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {actionItems.map((item) => (
                <Card key={item.id}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium flex items-center gap-2">
                          <span>{getPriorityIcon(item.priority)}</span>
                          {item.task}
                        </p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                          <span>Assignee: {item.assignee}</span>
                          {item.deadline && (
                            <span>Due: {format(new Date(item.deadline), "MMM d")}</span>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => updateActionItem(item.id, { completed: true })}
                        className="gap-2"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Mark Complete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="summaries" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Recent Daily Summaries</h2>
          
          {recentSummaries.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">No summaries available</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {recentSummaries.map((summary) => (
                <Card key={summary.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {format(new Date(summary.date), "MMMM d, yyyy")}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-4">{summary.summary.overallSummary}</p>
                    <div className="flex gap-4 text-sm">
                      <Badge variant="outline">
                        {summary.summary.totalMessages} messages
                      </Badge>
                      <Badge variant="outline">
                        {summary.summary.totalConversations} conversations
                      </Badge>
                      {summary.summary.urgentTopics.length > 0 && (
                        <Badge variant="destructive">
                          {summary.summary.urgentTopics.length} urgent topics
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Search Results</h2>
          
          {searchResults.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-gray-500">
                  {searchQuery ? "No results found" : "Enter a search query above"}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {searchResults.map((topic) => (
                <Card key={topic.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{topic.title}</CardTitle>
                    <CardDescription>
                      {format(new Date(topic.timestamp), "MMM d, yyyy HH:mm")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 mb-3">{topic.summary}</p>
                    <Badge className={getCategoryColor(topic.category)}>
                      {topic.category}
                    </Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}