import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Bot, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp?: string;
}

const Assistant = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeChat = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Authentication Required",
          description: "Please log in to use the assistant",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      setUserId(user.id);

      // Load chat history
      const { data: chatHistory, error } = await supabase
        .from("chat_messages")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error loading chat history:", error);
        toast({
          title: "Error",
          description: "Failed to load chat history",
          variant: "destructive",
        });
      }

      if (chatHistory && chatHistory.length > 0) {
        setMessages(chatHistory.map(msg => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
          timestamp: msg.created_at,
        })));
      } else {
        // Show welcome message only if no history
        const welcomeMessage: Message = {
          role: "assistant",
          content: "Hi! I'm the BookShare Assistant. I can help you with:\n• How to use the app\n• Finding or requesting books\n• Donating or exchanging textbooks\n\nWhat would you like to know?",
        };
        setMessages([welcomeMessage]);
        
        // Save welcome message to database
        await supabase.from("chat_messages").insert({
          user_id: user.id,
          role: "assistant",
          content: welcomeMessage.content,
        });
      }

      setLoadingHistory(false);
    };

    initializeChat();
  }, [navigate, toast]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const saveMessage = async (message: Message) => {
    if (!userId) return;

    const { error } = await supabase.from("chat_messages").insert({
      user_id: userId,
      role: message.role,
      content: message.content,
    });

    if (error) {
      console.error("Error saving message:", error);
    }
  };

  const handleClearHistory = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("chat_messages")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to clear chat history",
        variant: "destructive",
      });
      return;
    }

    // Reset to welcome message
    const welcomeMessage: Message = {
      role: "assistant",
      content: "Hi! I'm the BookShare Assistant. I can help you with:\n• How to use the app\n• Finding or requesting books\n• Donating or exchanging textbooks\n\nWhat would you like to know?",
      timestamp: new Date().toISOString()
    };
    setMessages([welcomeMessage]);
    
    // Save welcome message to database
    await supabase.from("chat_messages").insert({
      user_id: userId,
      role: "assistant",
      content: welcomeMessage.content,
    });

    toast({
      title: "Success",
      description: "Chat history cleared",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading || !userId) return;

    const userMessage: Message = { 
      role: "user", 
      content: input,
      timestamp: new Date().toISOString()
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);

    // Save user message
    await saveMessage(userMessage);

    try {
      const { data, error } = await supabase.functions.invoke("chat", {
        body: {
          messages: [...messages, userMessage],
        },
      });

      if (error) throw error;

      const assistantMessage: Message = {
        role: "assistant",
        content: data.message || "I apologize, but I couldn't process your request. Please try again.",
        timestamp: new Date().toISOString()
      };
      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save assistant message
      await saveMessage(assistantMessage);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to get response",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loadingHistory) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="shadow-card max-w-4xl mx-auto">
            <CardContent className="p-8 flex items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading chat history...</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-card max-w-4xl mx-auto">
          <CardHeader className="border-b bg-gradient-primary">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Bot className="h-8 w-8 text-white" />
                <div>
                  <CardTitle className="text-black font-heading">BookShare Assistant</CardTitle>
                  <CardDescription className="text-white/80">
                    Your AI-powered guide to using BookShare
                  </CardDescription>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearHistory}
                className="bg-blue-600 text-white hover:bg-blue-700"
                title="Clear chat history"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${
                    message.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-3 rounded-lg ${
                      message.role === "user"
                        ? "bg-primary text-white"
                        : "bg-muted"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{message.content}</p>
                    {message.timestamp && (
                      <p className={`text-xs mt-1 ${
                        message.role === "user" 
                          ? "text-white/70" 
                          : "text-muted-foreground"
                      }`}>
                        {new Date(message.timestamp).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-muted px-4 py-3 rounded-lg">
                    <p className="text-muted-foreground">Thinking...</p>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
              <Input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me anything about BookShare..."
                className="flex-1"
                disabled={loading}
              />
              <Button
                type="submit"
                className="bg-primary hover:bg-primary-hover"
                disabled={loading}
              >
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Assistant;
