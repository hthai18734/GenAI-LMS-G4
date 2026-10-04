import { useMemo, useState } from 'react';
import { ChatContext } from './useChatContext';
export function ChatProvider({ children }) {
  const [lesson, setLesson] = useState(null);
  const value = useMemo(() => ({ lesson, setLesson }), [lesson]);
  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}
