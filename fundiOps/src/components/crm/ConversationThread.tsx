"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNow } from "date-fns";
import { Send, Bot } from "lucide-react";
import { cn } from "@/lib/utils/cn";
import type { WaMessage } from "@/types/crm";

export function ConversationThread({
  contactId,
  messages,
}: {
  contactId: string;
  messages: WaMessage[];
}) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [localMessages, setLocalMessages] = useState(messages);
  const bottomRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [localMessages]);

  async function send() {
    if (!body.trim() || sending) return;
    setSending(true);

    const optimistic: WaMessage = {
      id: crypto.randomUUID(),
      user_id: "",
      contact_id: contactId,
      wa_message_id: null,
      direction: "outbound",
      body: body.trim(),
      media_type: "text",
      media_url: null,
      is_ai_generated: false,
      processed: true,
      processing_error: null,
      received_at: new Date().toISOString(),
    };
    setLocalMessages((prev) => [...prev, optimistic]);
    setBody("");

    const res = await fetch(`/api/crm/contacts/${contactId}/reply`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: body.trim() }),
    });

    setSending(false);
    if (res.ok) router.refresh();
  }

  return (
    <div className="flex flex-col h-full">
      {/* Message list */}
      <div className="flex-1 overflow-y-auto space-y-3 px-1 pb-2">
        {localMessages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "flex",
              msg.direction === "outbound" ? "justify-end" : "justify-start"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                msg.direction === "outbound"
                  ? "bg-fundiops-accent text-black rounded-br-sm"
                  : "bg-fundiops-card border border-fundiops-border text-fundiops-text rounded-bl-sm"
              )}
            >
              <p className="whitespace-pre-wrap">{msg.body}</p>
              <div
                className={cn(
                  "flex items-center gap-1 mt-1 text-xs opacity-60",
                  msg.direction === "outbound" ? "justify-end" : "justify-start"
                )}
              >
                {msg.is_ai_generated && <Bot size={10} />}
                <span>
                  {formatDistanceToNow(new Date(msg.received_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          </div>
        ))}
        {localMessages.length === 0 && (
          <p className="text-fundiops-muted text-sm text-center py-12">
            No messages yet
          </p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Send box */}
      <div className="flex gap-2 pt-3 border-t border-fundiops-border">
        <textarea
          className="flex-1 bg-fundiops-card border border-fundiops-border rounded-xl px-3 py-2 text-sm text-fundiops-text placeholder:text-fundiops-muted resize-none focus:outline-none focus:border-fundiops-accent/50 transition-colors"
          rows={2}
          placeholder="Type a message..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button
          onClick={send}
          disabled={!body.trim() || sending}
          className="self-end p-2.5 bg-fundiops-accent text-black rounded-xl hover:bg-fundiops-accent-muted transition-colors disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
