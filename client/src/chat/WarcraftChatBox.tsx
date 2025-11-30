import './WarcraftChatBox.css';
import { ChatBoxProps } from './types';
import { useWarcraftChat } from './useWarcraftChat';
import { useRef, useEffect, useState } from 'react';

const MESSAGE_FADE_DELAY = 5000; // 5초 후 페이드아웃
const MESSAGE_FADE_DURATION = 2000; // 2초 동안 페이드아웃

export default function WarcraftChatBox({ onSendMessage }: ChatBoxProps) {
  const {
    messages,
    inputValue,
    isActive,
    inputRef,
    handleKeyDown,
    handleInputChange,
    closeChat,
  } = useWarcraftChat({ onSendMessage });

  const inputContainerRef = useRef<HTMLDivElement>(null);
  const [messageOpacities, setMessageOpacities] = useState<Map<string, number>>(new Map());

  // 채팅창 밖 클릭 시 닫기
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (inputContainerRef.current && !inputContainerRef.current.contains(e.target as Node)) {
        closeChat();
      }
    };

    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActive, closeChat]);

  // 메시지 페이드아웃 관리
  useEffect(() => {
    const updateOpacities = () => {
      const now = Date.now();
      const newOpacities = new Map<string, number>();

      messages.slice(-5).forEach((message) => {
        const messageAge = now - message.timestamp.getTime();
        
        if (messageAge < MESSAGE_FADE_DELAY) {
          // 아직 페이드아웃 시작 전
          newOpacities.set(message.id, 1);
        } else if (messageAge < MESSAGE_FADE_DELAY + MESSAGE_FADE_DURATION) {
          // 페이드아웃 중
          const fadeProgress = (messageAge - MESSAGE_FADE_DELAY) / MESSAGE_FADE_DURATION;
          newOpacities.set(message.id, 1 - fadeProgress);
        } else {
          // 완전히 투명
          newOpacities.set(message.id, 0);
        }
      });

      setMessageOpacities(newOpacities);
    };

    updateOpacities();
    const interval = setInterval(updateOpacities, 100); // 100ms마다 업데이트

    return () => clearInterval(interval);
  }, [messages]);

  return (
    <>
      {/* 채팅 메시지 표시 영역 */}
      <div className="warcraft-chat-messages">
        {messages.slice(-5).map((message) => {
          const opacity = messageOpacities.get(message.id) ?? 1;
          return (
            <div 
              key={message.id} 
              className="warcraft-chat-message"
              style={{ opacity }}
            >
              <span className="warcraft-message-username">{message.username}:</span>
              <span className="warcraft-message-text">{message.text}</span>
            </div>
          );
        })}
      </div>

      {/* 입력창 - 활성화 시에만 표시 */}
      {isActive && (
        <div className="warcraft-chat-container">
          <div ref={inputContainerRef} className="warcraft-chat-input-wrapper">
            <input
              ref={inputRef}
              type="text"
              className="warcraft-chat-input"
              placeholder="메시지를 입력하세요 (Enter로 전송, ESC로 취소)"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>
      )}
    </>
  );
}

