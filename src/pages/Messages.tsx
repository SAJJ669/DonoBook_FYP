import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Send, Edit2, Trash2, X, Check, PlusCircle, Package, BookOpen } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMessageNotifications } from "@/hooks/useMessageNotifications";
import { useTypingIndicator } from "@/hooks/useTypingIndicator";
import SafetyBanner from "@/components/SafetyBanner"
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

  // These are used when user wants to send offer for an item/book
  const [isOfferModalOpen, setIsOfferModalOpen] = useState(false);
  const [userBooks, setUserBooks] = useState<any[]>([]);
  const [userItems, setUserItems] = useState<any[]>([]);
  const [offerTab, setOfferTab] = useState<'books' | 'items'>('books');

  // For handling bundled offers
  const [selectedBooks, setSelectedBooks] = useState<string[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // For loading chat from last conversation
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // To scroll chat at bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  };

  useEffect(() => {
    setTimeout(() => {
      scrollToBottom();
    }, 100);
  }, [messages, currentUserId]);

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

  // const sendOffer = async (id: string, title: string, type: 'book' | 'item') => {
  //   if (!currentUserId || !otherUserId) return;

  //   const table = type === 'book' ? 'books' : 'items';

  //   // 1. Update the item status to 'pending' in the DB
  //   const { error: statusError } = await supabase
  //     .from(table)
  //     .update({ status: 'pending', is_available: false })
  //     .eq('id', id);

  //   if (statusError) {
  //     toast({ title: "Error", description: "This item is no longer available", variant: "destructive" });
  //     return;
  //   }

  //   // 2. Insert the message (your existing code)
  //   const offerData = {
  //     sender_id: currentUserId,
  //     receiver_id: otherUserId,
  //     is_transaction_offer: true,
  //     text: `I would like to give/exchange my ${type}: "${title}". Do you accept?`,
  //     transaction_status: 'pending',
  //     [type === 'book' ? 'book_id' : 'item_id']: id
  //   };

  //   await supabase.from("user_messages").insert([offerData]);

  //   // Refresh inventory so the book disappears from the "Offer" list immediately
  //   fetchUserInventory();
  //   toast({ title: "Offer Sent!", description: `${title} is now pending.` });
  // };

  const handleToggleSelection = (id: string, type: 'book' | 'item') => {
    if (type === 'book') {
      setSelectedBooks(prev => prev.includes(id) ? prev.filter(bid => bid !== id) : [...prev, id]);
    } else {
      setSelectedItems(prev => prev.includes(id) ? prev.filter(iid => iid !== id) : [...prev, id]);
    }
  };


  // Sending Offer for multiple items 
  const sendOffer = async () => {
    if (!currentUserId || !otherUserId || (selectedBooks.length === 0 && selectedItems.length === 0)) return;

    try {
      if (selectedBooks.length > 0) {
        await supabase.from("books").update({ status: 'pending', is_available: false }).in('id', selectedBooks);
      }
      if (selectedItems.length > 0) {
        await supabase.from("items").update({ status: 'pending', is_available: false }).in('id', selectedItems);
      }

      const bookTitles = userBooks.filter(b => selectedBooks.includes(b.id)).map(b => b.title);
      const itemNames = userItems.filter(i => selectedItems.includes(i.id)).map(i => i.name);
      const totalItems = [...bookTitles, ...itemNames];

      const bundleText = totalItems.length > 1
        ? `I have a bundle offer for you: ${totalItems.join(", ")}. Would you like to accept?`
        : `I would like to offer my ${bookTitles.length ? 'book' : 'item'}: "${totalItems[0]}". Do you accept?`;

      const { error } = await supabase.from("user_messages").insert([{
        sender_id: currentUserId,
        receiver_id: otherUserId,
        is_transaction_offer: true,
        text: bundleText,
        transaction_status: 'pending',
        book_id: selectedBooks[0] || null,
        item_id: selectedItems[0] || null,
        book_ids: selectedBooks,
        item_ids: selectedItems,
      }]);

      if (error) throw error;

      toast({ title: "Bundle Offer Sent!", description: `Offered ${totalItems.length} items.` });
      setIsOfferModalOpen(false);
      setSelectedBooks([]);
      setSelectedItems([]);
      fetchUserInventory();
    } catch (err) {
      console.error(err);
      toast({ title: "Error", description: "Failed to send offer", variant: "destructive" });
    }
  };

  // Handle Accept/Decline Logic
  // It should only handle arrays of items/books so we might need to remove book_id and item_id from messages table in future
  const handleTransaction = async (message: any, accept: boolean) => {
    try {

      // 1. Update Message Status
      await supabase
        .from("user_messages")
        .update({ transaction_status: accept ? "accepted" : "declined" })
        .eq("id", message.id);

      // 2. Collect all book/item IDs (support both old single-ID and new array format)
      const bookIds: string[] = message.book_ids?.length
        ? message.book_ids
        : message.book_id ? [message.book_id] : [];

      const itemIds: string[] = message.item_ids?.length
        ? message.item_ids
        : message.item_id ? [message.item_id] : [];

      // 3. Update all books
      if (bookIds.length > 0) {
        const { error } = await supabase
          .from("books")
          .update({
            status: accept ? "claimed" : "available",
            is_available: !accept,
            receiver_id: accept ? message.receiver_id : null,
          })
          .in("id", bookIds);  // .in() updates ALL matching rows at once

        if (error) throw error;
      }

      // 4. Update all items
      if (itemIds.length > 0) {
        const { error } = await supabase
          .from("items")
          .update({
            status: accept ? "claimed" : "available",
            is_available: !accept,
            receiver_id: accept ? message.receiver_id : null,
          })
          .in("id", itemIds);

        if (error) throw error;
      }

      toast({
        title: accept ? "Transaction Accepted" : "Offer Declined",
        description: accept ? "Item marked as claimed." : "Item is now available for others again.",
      });

      fetchMessages();
    } catch (error) {
      console.error(error);
    }
  };

  // For Fetching User Uploads when user wants to offer books/items
  const fetchUserInventory = async () => {
    if (!currentUserId) return;

    // Fetch available books
    const { data: books } = await supabase
      .from("books")
      .select("id, title")
      .eq("owner_id", currentUserId)
      .eq("is_available", true);

    // Fetch available items
    const { data: items } = await supabase
      .from("items")
      .select("id, name")
      .eq("owner_id", currentUserId)
      .eq("is_available", true);

    setUserBooks(books || []);
    setUserItems(items || []);
  };

  // Update existing useEffect to include this
  useEffect(() => {
    if (currentUserId) {
      fetchAllUsers();
      fetchUserInventory(); // Load inventory for offers
    }
  }, [currentUserId]);

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
                            {message.is_transaction_offer && (
                              <div className="mt-3 p-3 border rounded-md bg-background/20 text-foreground space-y-3">
                                <p className="font-semibold text-sm">Transaction Proposal</p>

                                {message.transaction_status === 'pending' ? (
                                  !isSentByUser ? (
                                    <div className="flex gap-2">
                                      <Button
                                        size="sm"
                                        className="bg-green-600 hover:bg-green-700 h-8 text-white"
                                        onClick={() => handleTransaction(message, true)}
                                      >
                                        Accept
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="destructive"
                                        className="h-8"
                                        onClick={() => handleTransaction(message, false)}
                                      >
                                        Decline
                                      </Button>
                                    </div>
                                  ) : (
                                    <p className="text-xs italic opacity-70">Waiting for response...</p>
                                  )
                                ) : (
                                  <p className={`text-sm font-bold ${message.transaction_status === 'accepted' ? 'text-green-500' : 'text-red-500'}`}>
                                    Offer {message.transaction_status.toUpperCase()}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </>
                      )}

                      {/* Edit/Delete buttons - only show for sent messages */}
                      {isSentByUser && !isEditing && (
                        <div className="absolute -left-20 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => startEditMessage(message)}
                            className="h-8 w-8 p-0 bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-200 hover:text-blue-700"
                          >
                            <Edit2 className="h-3 w-3" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDeletingMessageId(message.id)}
                            className="h-8 w-8 p-0 text-destructive bg-red-50 hover:bg-red-200 hover:text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />

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
            <form onSubmit={handleSendMessage} className="border-t p-4 flex gap-2 items-center">
              {/* Unified Offer Button */}
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setIsOfferModalOpen(true)}
                className="text-primary hover:bg-primary/10"
              >
                <PlusCircle className="h-6 w-6" />
              </Button>

              <Input
                type="text"
                value={newMessage}
                onChange={(e) => handleTyping(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
              />
              <Button type="submit">
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </CardContent>
        </Card>
        <div>
          <SafetyBanner/>
        </div>
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

        <AlertDialog open={isOfferModalOpen} onOpenChange={setIsOfferModalOpen}>
          <AlertDialogContent className="max-w-md">
            <AlertDialogHeader>
              <AlertDialogTitle>Offer an Item or Book</AlertDialogTitle>
              <AlertDialogDescription>
                Select something from your collection to offer for exchange.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <div className="flex gap-4 border-b mb-4">
              <button
                onClick={() => setOfferTab('books')}
                className={`pb-2 px-2 ${offerTab === 'books' ? 'border-b-2 border-primary font-bold' : 'opacity-50'}`}
              >
                Books ({userBooks.length})
              </button>
              <button
                onClick={() => setOfferTab('items')}
                className={`pb-2 px-2 ${offerTab === 'items' ? 'border-b-2 border-primary font-bold' : 'opacity-50'}`}
              >
                Items ({userItems.length})
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {offerTab === 'books' ? (
                userBooks.map(b => (
                  <div key={b.id} onClick={() => handleToggleSelection(b.id, 'book')} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedBooks.includes(b.id) ? "bg-primary/5 border-primary shadow-sm" : "hover:bg-slate-50"}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedBooks.includes(b.id) ? "bg-primary border-primary text-white" : "bg-white"}`}>
                      {selectedBooks.includes(b.id) && <Check className="h-3 w-3" />}
                    </div>
                    <BookOpen className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium flex-1">{b.title}</span>
                  </div>
                ))
              ) : (
                userItems.map(i => (
                  <div key={i.id} onClick={() => handleToggleSelection(i.id, 'item')} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedItems.includes(i.id) ? "bg-primary/5 border-primary shadow-sm" : "hover:bg-slate-50"}`}>
                    <div className={`w-5 h-5 rounded flex items-center justify-center border ${selectedItems.includes(i.id) ? "bg-primary border-primary text-white" : "bg-white"}`}>
                      {selectedItems.includes(i.id) && <Check className="h-3 w-3" />}
                    </div>
                    <Package className="h-4 w-4 text-slate-400" />
                    <span className="text-sm font-medium flex-1">{i.name}</span>
                  </div>
                ))
              )}

              {(offerTab === 'books' ? userBooks : userItems).length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  No available {offerTab} found.
                </p>
              )}
            </div>

            <span className="text-xs">Selected: {selectedBooks.length + selectedItems.length}</span>
            <AlertDialogFooter>
              <Button size="sm" onClick={sendOffer} disabled={selectedBooks.length === 0 && selectedItems.length === 0}>Send Offer</Button>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};

export default Messages;
