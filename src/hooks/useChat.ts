import { useState, useCallback } from 'react';
import { sendChatMessage } from '@/lib/api';
import type { ChatMessage } from '@/types';

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const send = useCallback(async (message: string) => {
    const userMsg: ChatMessage = { role: 'user', content: message };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const history = messages.map(({ role, content }) => ({ role, content }));
      const { reply, sources } = await sendChatMessage(message, history);
      const assistantMsg: ChatMessage = { role: 'assistant', content: reply, sources };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      const errorMsg: ChatMessage = {
        role: 'assistant',
        content: '죄송합니다. 응답을 생성하는 중 오류가 발생했습니다. 다시 시도해 주세요.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setSending(false);
    }
  }, [messages]);

  const clear = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, sending, send, clear };
}
