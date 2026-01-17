import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { ChatState, ChatAction, Conversation, Message, ConversationSettings, DEFAULT_SETTINGS } from '../types/chat';

const initialState: ChatState = {
  conversations: [],
  currentConversation: null,
  isLoading: false,
  isSending: false,
  error: null,
  settings: DEFAULT_SETTINGS,
};

function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case 'SET_CONVERSATIONS':
      return {
        ...state,
        conversations: action.payload,
      };

    case 'ADD_CONVERSATION':
      return {
        ...state,
        conversations: [action.payload, ...state.conversations],
      };

    case 'UPDATE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.map(conv =>
          conv.id === action.payload.id ? action.payload : conv
        ),
        currentConversation: state.currentConversation?.id === action.payload.id 
          ? action.payload 
          : state.currentConversation,
      };

    case 'DELETE_CONVERSATION':
      return {
        ...state,
        conversations: state.conversations.filter(conv => conv.id !== action.payload),
        currentConversation: state.currentConversation?.id === action.payload ? null : state.currentConversation,
      };

    case 'SET_CURRENT_CONVERSATION':
      return {
        ...state,
        currentConversation: action.payload,
      };

    case 'ADD_MESSAGE':
      const updatedConversation = state.currentConversation 
        ? {
            ...state.currentConversation,
            messages: [...state.currentConversation.messages, action.payload],
            updatedAt: new Date(),
          }
        : null;

      return {
        ...state,
        currentConversation: updatedConversation,
        conversations: updatedConversation 
          ? state.conversations.map(conv =>
              conv.id === updatedConversation.id ? updatedConversation : conv
            )
          : state.conversations,
      };

    case 'UPDATE_MESSAGE':
      if (!state.currentConversation) return state;

      const conversationWithUpdatedMessage = {
        ...state.currentConversation,
        messages: state.currentConversation.messages.map(msg =>
          msg.id === action.payload.id ? action.payload : msg
        ),
      };

      return {
        ...state,
        currentConversation: conversationWithUpdatedMessage,
        conversations: state.conversations.map(conv =>
          conv.id === conversationWithUpdatedMessage.id ? conversationWithUpdatedMessage : conv
        ),
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload,
      };

    case 'SET_SENDING':
      return {
        ...state,
        isSending: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'CLEAR_ERROR':
      return {
        ...state,
        error: null,
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: { ...state.settings, ...action.payload },
      };

    default:
      return state;
  }
}

interface ChatContextType {
  state: ChatState;
  dispatch: React.Dispatch<ChatAction>;
  actions: {
    setConversations: (conversations: Conversation[]) => void;
    addConversation: (conversation: Conversation) => void;
    updateConversation: (conversation: Conversation) => void;
    deleteConversation: (conversationId: string) => void;
    setCurrentConversation: (conversation: Conversation | null) => void;
    addMessage: (message: Message) => void;
    updateMessage: (message: Message) => void;
    setLoading: (loading: boolean) => void;
    setSending: (sending: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
    updateSettings: (settings: Partial<ConversationSettings>) => void;
  };
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export function ChatProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);

  const actions = {
    setConversations: (conversations: Conversation[]) => 
      dispatch({ type: 'SET_CONVERSATIONS', payload: conversations }),
    
    addConversation: (conversation: Conversation) => 
      dispatch({ type: 'ADD_CONVERSATION', payload: conversation }),
    
    updateConversation: (conversation: Conversation) => 
      dispatch({ type: 'UPDATE_CONVERSATION', payload: conversation }),
    
    deleteConversation: (conversationId: string) => 
      dispatch({ type: 'DELETE_CONVERSATION', payload: conversationId }),
    
    setCurrentConversation: (conversation: Conversation | null) => 
      dispatch({ type: 'SET_CURRENT_CONVERSATION', payload: conversation }),
    
    addMessage: (message: Message) => 
      dispatch({ type: 'ADD_MESSAGE', payload: message }),
    
    updateMessage: (message: Message) => 
      dispatch({ type: 'UPDATE_MESSAGE', payload: message }),
    
    setLoading: (loading: boolean) => 
      dispatch({ type: 'SET_LOADING', payload: loading }),
    
    setSending: (sending: boolean) => 
      dispatch({ type: 'SET_SENDING', payload: sending }),
    
    setError: (error: string | null) => 
      dispatch({ type: 'SET_ERROR', payload: error }),
    
    clearError: () => 
      dispatch({ type: 'CLEAR_ERROR' }),
    
    updateSettings: (settings: Partial<ConversationSettings>) => 
      dispatch({ type: 'UPDATE_SETTINGS', payload: settings }),
  };

  return (
    <ChatContext.Provider value={{ state, dispatch, actions }}>
      {children}
    </ChatContext.Provider>
  );
}

export function useChatContext() {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  return context;
}