import './ChatBox.css';
import { ChatBoxProps } from './types';
import { useChat } from './useChat';
import { formatTime } from './utils';
import { useRef, useEffect } from 'react';

export default function ChatBox({ onSendMessage }: ChatBoxProps) {
  const {
    messages,
    inputValue,
    isActive,
    opacity,
    messagesEndRef,
    inputRef,
    handleSend,
    handleKeyDown,
    handleInputChange,
    closeChat,
  } = useChat({ onSendMessage });

  const chatBoxRef = useRef<HTMLDivElement>(null);

  // 채팅창 밖 클릭 시 닫기
  useEffect(() => {
    if (!isActive) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (chatBoxRef.current && !chatBoxRef.current.contains(e.target as Node)) {
        closeChat();
      }
    };

    // 약간의 지연을 두어 현재 클릭 이벤트가 처리된 후 실행
    setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 0);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isActive, closeChat]);

  return (
    <div 
      ref={chatBoxRef}
      className={`chat-box ${isActive ? 'chat-box-active' : 'chat-box-inactive'}`}
      style={{ opacity }}
    >
      <div className="chat-header">
        <span className="chat-title">채팅 (Enter로 입력)</span>
      </div>

      <div className="chat-messages">
        {messages.map((message) => (
          <div key={message.id} className="chat-message">
            <div className="message-header">
              <span className="message-username">{message.username}</span>
              <span className="message-time">{formatTime(message.timestamp)}</span>
            </div>
            <div className="message-text">{message.text}</div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          ref={inputRef}
          type="text"
          className="chat-input"
          placeholder="메시지를 입력하세요 (Enter로 전송)"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
        />
        <button className="chat-send-btn" onClick={handleSend}>
          전송
        </button>
      </div>
    </div>
  );
}


