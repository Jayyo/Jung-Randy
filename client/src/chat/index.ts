// 채팅 모듈의 메인 export 파일
// 다른 프로젝트에서 이 폴더를 복사해서 사용할 때
// import ChatBox from './chat' 형태로 간단하게 사용 가능

export { default as ChatBox } from './ChatBox';
export { default as WarcraftChatBox } from './WarcraftChatBox';
export { useChat } from './useChat';
export { useWarcraftChat } from './useWarcraftChat';
export type { Message, ChatBoxProps } from './types';
export { initialMessages, createSystemMessage, createUserMessage } from './messages';
export { formatTime } from './utils';


