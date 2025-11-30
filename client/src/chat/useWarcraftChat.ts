import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ChangeEvent,
} from 'react';
import { Message } from './types';
import { loadChatHistory, saveChatHistory } from './chatStorage';
import { createUserMessage } from './messages';

interface UseWarcraftChatOptions {
  onSendMessage?: (message: string) => void;
}

export function useWarcraftChat({ onSendMessage }: UseWarcraftChatOptions = {}) {
  const [messages, setMessages] = useState<Message[]>(loadChatHistory());
  const [inputValue, setInputValue] = useState('');
  const [isActive, setIsActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const isInputFocusedRef = useRef(false);
  const enterHeldRef = useRef(false);

  // 채팅 기록을 저장
  useEffect(() => {
    saveChatHistory(messages);
  }, [messages]);

  // 전역 키 리스너: Enter로 채팅 활성화, ESC로 채팅 비활성화
  useEffect(() => {
    const handleGlobalKeyDown = (e: globalThis.KeyboardEvent) => {
      // ESC 키로 채팅창 닫기
      if (e.key === 'Escape' && isActive) {
        e.preventDefault();
        setIsActive(false);
        setInputValue('');
        inputRef.current?.blur();
        return;
      }

      // 입력이 없을 때 Enter를 다시 누르면 닫기
      if (e.key === 'Enter' && isActive && inputValue.trim() === '') {
        e.preventDefault();
        setIsActive(false);
        setInputValue('');
        inputRef.current?.blur();
        return;
      }

      if (isInputFocusedRef.current) return;

      if (document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA') {
        return;
      }

      if (e.key === 'Enter') {
        if (enterHeldRef.current) {
          e.preventDefault();
          return;
        }
        enterHeldRef.current = true;
        e.preventDefault();
        setIsActive(true);
        setTimeout(() => {
          inputRef.current?.focus();
        }, 0);
      }
    };

    const handleGlobalKeyUp = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Enter') {
        enterHeldRef.current = false;
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    window.addEventListener('keyup', handleGlobalKeyUp);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
      window.removeEventListener('keyup', handleGlobalKeyUp);
    };
  }, [isActive]);

  // 입력창 포커스 상태 추적
  useEffect(() => {
    const handleFocus = () => {
      isInputFocusedRef.current = true;
      setIsActive(true);
    };
    const handleBlur = () => {
      isInputFocusedRef.current = false;
      // 입력값이 없으면 채팅창 닫기
      if (inputValue.trim() === '') {
        setIsActive(false);
      }
    };

    const input = inputRef.current;
    if (input) {
      input.addEventListener('focus', handleFocus);
      input.addEventListener('blur', handleBlur);
      return () => {
        input.removeEventListener('focus', handleFocus);
        input.removeEventListener('blur', handleBlur);
      };
    }
  }, [inputValue]);

  const handleSend = useCallback(() => {
    if (inputValue.trim() === '') {
      setIsActive(false);
      inputRef.current?.blur();
      return;
    }

    const messageText = inputValue.trim();
    // 입력값을 즉시 비움
    setInputValue('');

    const newMessage = createUserMessage(messageText);
    setMessages((prev) => [...prev, newMessage]);

    setIsActive(false);
    inputRef.current?.blur();

    if (onSendMessage) {
      onSendMessage(newMessage.text);
    }
  }, [inputValue, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      enterHeldRef.current = true;
      handleSend();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setIsActive(false);
      setInputValue('');
      inputRef.current?.blur();
    }
  }, [handleSend]);

  const handleInputChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
    if (!isActive) {
      setIsActive(true);
    }
  }, [isActive]);

  const closeChat = useCallback(() => {
    setIsActive(false);
    setInputValue('');
    inputRef.current?.blur();
  }, []);

  return {
    messages,
    inputValue,
    isActive,
    inputRef,
    handleSend,
    handleKeyDown,
    handleInputChange,
    closeChat,
  };
}
