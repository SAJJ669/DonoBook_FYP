import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UseMessageNotificationsProps {
  currentUserId: string | null;
  onNewMessage?: () => void;
}

export const useMessageNotifications = ({ 
  currentUserId, 
  onNewMessage 
}: UseMessageNotificationsProps) => {
  const { toast } = useToast();
  const [permissionGranted, setPermissionGranted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Initialize audio for notification sound
    audioRef.current = new Audio();
    // Using a simple beep sound via data URL
    audioRef.current.src = 'data:audio/wav;base64,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';
    
    // Request notification permission
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then(permission => {
        setPermissionGranted(permission === 'granted');
      });
    } else if ('Notification' in window && Notification.permission === 'granted') {
      setPermissionGranted(true);
    }
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const channel = supabase
      .channel('message_notifications')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'user_messages',
          filter: `receiver_id=eq.${currentUserId}`,
        },
        async (payload) => {
          const newMessage = payload.new as any;
          
          // Fetch sender profile
          const { data: senderProfile } = await supabase
            .from('profiles')
            .select('name')
            .eq('id', newMessage.sender_id)
            .single();

          const senderName = senderProfile?.name || 'Someone';

          // Play notification sound
          if (audioRef.current) {
            try {
              audioRef.current.play().catch(err => console.log('Audio play failed:', err));
            } catch (error) {
              console.log('Audio error:', error);
            }
          }

          // Show browser notification
          if (permissionGranted && document.hidden) {
            try {
              const notification = new Notification(`New message from ${senderName}`, {
                body: newMessage.text,
                icon: '/favicon.ico',
                tag: 'message-notification',
                requireInteraction: false,
              });

              notification.onclick = () => {
                window.focus();
                notification.close();
              };
            } catch (error) {
              console.log('Notification error:', error);
            }
          }

          // Show toast notification if app is visible
          if (!document.hidden) {
            toast({
              title: `New message from ${senderName}`,
              description: newMessage.text,
            });
          }

          // Callback for additional actions
          if (onNewMessage) {
            onNewMessage();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId, permissionGranted, toast, onNewMessage]);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setPermissionGranted(permission === 'granted');
      
      if (permission === 'granted') {
        toast({
          title: 'Notifications enabled',
          description: 'You will receive notifications for new messages',
        });
      } else {
        toast({
          title: 'Notifications blocked',
          description: 'Enable notifications in your browser settings to receive alerts',
          variant: 'destructive',
        });
      }
    }
  };

  return { permissionGranted, requestPermission };
};
