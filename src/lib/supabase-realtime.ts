import { createClient, type RealtimeChannel } from "@supabase/supabase-js";

export const SUPABASE_REALTIME_URL = "https://ndrapphpcvvdndznrcuo.supabase.co";
export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "sb_publishable__W6CQZqr02Z5i8bx_BELPw_A6szUIKY";

export const supabaseRealtime = createClient(SUPABASE_REALTIME_URL, SUPABASE_ANON_KEY, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

/**
 * Subscribes to real-time chat broadcasts for a peer conversation or study group.
 */
export function subscribeToChatChannel(
  chatId: string,
  onMessage: (message: any) => void
): RealtimeChannel {
  const channel = supabaseRealtime.channel(`syllaboss-chat:${chatId}`, {
    config: {
      broadcast: { self: false },
    },
  });

  channel.on("broadcast", { event: "new_message" }, (event) => {
    if (event.payload) {
      onMessage(event.payload);
    }
  });

  channel.subscribe();
  return channel;
}

/**
 * Broadcasts an outgoing message to all active peers in the chat channel.
 */
export async function broadcastChatMessage(chatId: string, message: any): Promise<void> {
  try {
    const channel = supabaseRealtime.channel(`syllaboss-chat:${chatId}`, {
      config: {
        broadcast: { self: false },
      },
    });

    await channel.send({
      type: "broadcast",
      event: "new_message",
      payload: message,
    });
  } catch (err) {
    console.warn("Realtime broadcast error:", err);
  }
}
