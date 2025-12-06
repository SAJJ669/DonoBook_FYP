import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Edit2, Trash2, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

type Message = Database['public']['Tables']['user_messages']['Row'];
type Profile = Database['public']['Tables']['profiles']['Row'];

const Messages = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [otherUser, setOtherUser] = useState<Profile | null>(null);
  const [users, setUsers] = useState<Profile[]>([]); // all users list
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editedText, setEditedText] = useState("");
  const [deletingMessageId, setDeletingMessageId] = useState<string | null>(null);
  const otherUserId = searchParams.get("userId");

  // Enable notifications for this chat
  useMessageNotifications({
    currentUserId,
    onNewMessage: () => {
      // Messages will be updated via realtime subscription
      markMessagesAsRead();
    },
  });

  // Typing indicator
  const conversationId = currentUserId && otherUserId
    ? [currentUserId, otherUserId].sort().join("-")
    : null;
  const { otherUserTyping, setTyping } = useTypingIndicator(conversationId, currentUserId);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUserId) {
      fetchAllUsers();
    }
  }, [currentUserId]);

  useEffect(() => {
    if (currentUserId && otherUserId) {
      fetchMessages();
      fetchOtherUser();
      markMessagesAsRead();
      const cleanup = subscribeToMessages();
      return cleanup;
    }
    return () => { };
  }, [currentUserId, otherUserId]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }
    setCurrentUserId(session.user.id);
  };

  const fetchAllUsers = async () => {
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .neq("id", currentUserId); // exclude self

    if (error) {
      console.error("Error fetching users:", error);
      return;
    }
    setUsers(data || []);
  };

  const fetchOtherUser = async () => {
    if (!otherUserId) return;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", otherUserId)
      .single();

    if (error) {
      toast({
        title: "Error",
        description: "Could not load user profile",
        variant: "destructive",
      });
      return;
    }
    setOtherUser(data);
  };

  const fetchMessages = async () => {
    if (!currentUserId || !otherUserId) return;

    const { data, error } = await supabase
      .from("user_messages")
      .select("*")
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error fetching messages:", error);
      return;
    }
    setMessages(data || []);
  };

  const markMessagesAsRead = async () => {
    if (!currentUserId || !otherUserId) return;

    // Mark all unread messages from the other user as read
    const { error } = await supabase
      .from("user_messages")
      .update({ read: true })
      .eq("sender_id", otherUserId)
      .eq("receiver_id", currentUserId)
      .eq("read", false);

    if (error) {
      console.error("Error marking messages as read:", error);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`user_messages-${currentUserId}-${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
        },
        (payload) => {
          const newMsg = payload.new as Message;
          if (
            (newMsg.sender_id === currentUserId && newMsg.receiver_id === otherUserId) ||
            (newMsg.sender_id === otherUserId && newMsg.receiver_id === currentUserId)
          ) {
            setMessages((prev) => [...prev, newMsg]);
          }
        }
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !currentUserId || !otherUserId) return;

    const { error } = await supabase.from("user_messages").insert([
      {
        sender_id: currentUserId,
        receiver_id: otherUserId,
        text: newMessage.trim(),
      },
    ]);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
      return;
    }

    setNewMessage("");
    setTyping(false); // Stop typing indicator when message is sent
  };

  const handleTyping = (value: string) => {
    setNewMessage(value);
    if (value.trim()) {
      setTyping(true);
    } else {
      setTyping(false);
    }
  };

  const startEditMessage = (message: Message) => {
    setEditingMessageId(message.id);
    setEditedText(message.text);
  };

  const cancelEdit = () => {
    setEditingMessageId(null);
    setEditedText("");
  };

  const saveEdit = async (messageId: string, originalText: string) => {
    if (!editedText.trim() || editedText === originalText) {
      cancelEdit();
      return;
    }

    try {
      // Fetch current message to get edit history
      const { data: currentMessage, error: fetchError } = await supabase
        .from("user_messages")
        .select("edit_history")
        .eq("id", messageId)
        .single();

      if (fetchError) throw fetchError;

      // Build new edit history
      const existingHistory = Array.isArray(currentMessage?.edit_history)
        ? currentMessage.edit_history
        : [];
      const newHistory = [
        ...existingHistory,
        {
          text: originalText,
          edited_at: new Date().toISOString(),
        },
      ];

      // Update message
      const { error } = await supabase
        .from("user_messages")
        .update({
          text: editedText.trim(),
          edited_at: new Date().toISOString(),
          edit_history: newHistory as any,
        })
        .eq("id", messageId);

      if (error) throw error;

      // Update local state
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
              ...msg,
              text: editedText.trim(),
              edited_at: new Date().toISOString(),
              edit_history: newHistory as any,
            }
            : msg
        )
      );

      toast({
        title: "Success",
        description: "Message updated",
      });
      cancelEdit();
    } catch (error) {
      console.error("Error editing message:", error);
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive",
      });
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from("user_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;

      // Update local state
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

      toast({
        title: "Success",
        description: "Message deleted",
      });
    } catch (error) {
      console.error("Error deleting message:", error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    } finally {
      setDeletingMessageId(null);
    }
  };

  // --- IF NO USER SELECTED, SHOW USER LIST ---
  if (!otherUserId) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="container mx-auto px-4 py-8">
          <Card className="shadow-card max-w-2xl mx-auto">
            <CardHeader>
              <CardTitle>Start a chat</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-2">
              {users.length > 0 ? (
                users.map((user) => (
                  <Button
                    key={user.id}
                    onClick={() => navigate(`/messages?userId=${user.id}`)}
                    className="w-full text-left"
                  >
                    {user.name || "Unnamed User"}
                  </Button>
                ))
              ) : (
                <p className="text-center text-muted-foreground">
                  No users available to chat with.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // --- SHOW CHAT IF USER SELECTED ---
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Card className="shadow-card max-w-4xl mx-auto">
          <CardHeader className="border-b">
            <CardTitle className="font-heading">
              Chat with {otherUser?.name || "User"}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-96 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isSentByUser = message.sender_id === currentUserId;
                const isEditing = editingMessageId === message.id;

                return (
                  <div
                    key={message.id}
                    className={`flex ${isSentByUser ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-xs group relative ${isSentByUser
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                        } px-4 py-2 rounded-lg`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <Input
                            value={editedText}
                            onChange={(e) => setEditedText(e.target.value)}
                            className="text-sm"
                            autoFocus
                          />
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={cancelEdit}
                              className="h-6 px-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => saveEdit(message.id, message.text)}
                              className="h-6 px-2"
                            >
                              <Check className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p>{message.text}</p>
                          {message.edited_at && (
                            <p className="text-xs opacity-60 italic mt-1">
                              (edited)
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-1">
                            <p className="text-xs opacity-70">
                              {new Date(message.created_at || "").toLocaleTimeString()}
                            </p>
                            {isSentByUser && (
                              <p className="text-xs opacity-70 ml-2">
                                {message.read ? "✓✓" : "✓"}
                              </p>
                            )}
                          </div>
                        </>
                      )}

                      {/* Edit/Delete buttons - only show for sent messages */}
                      {isSentByUser && !isEditing && (
                        <div className="absolute -right-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditMessage(message)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingMessageId(message.id)}
                            className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Move Typing Indicator Below Messages */}
              {otherUserTyping && (
                <div className="flex justify-start mt-2">
                  <div className="bg-muted px-4 py-2 rounded-lg">
                    <p className="text-sm text-muted-foreground italic">
                      {otherUser?.name || "User"} is typing...
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Message input area */}
            <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2">
              <Input
                type="text"
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                onBlur={() => setTyping(false)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button type="submit" className="bg-primary hover:bg-primary-hover">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Delete confirmation dialog */}
        <AlertDialog
          open={!!deletingMessageId}
          onOpenChange={() => setDeletingMessageId(null)}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete message?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. The message will be permanently
                deleted.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deletingMessageId && deleteMessage(deletingMessageId)}
                className="bg-destructive hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Messages;
