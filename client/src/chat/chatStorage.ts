import { Message } from './types';
import { initialMessages } from './messages';

const CHAT_HISTORY_KEY = 'game_chat_history';
const MAX_HISTORY_MESSAGES = 100;

// localStorage에서 채팅 히스토리 로드
export const loadChatHistory = (): Message[] => {
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      return parsed.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp),
      }));
    }
  } catch (error) {
    console.error('Failed to load chat history:', error);
  }
  return initialMessages;
};

// localStorage에 채팅 히스토리 저장
export const saveChatHistory = (messages: Message[]) => {
  try {
    // 최근 N개만 저장
    const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(recentMessages));
  } catch (error) {
    console.error('Failed to save chat history:', error);
  }
};

