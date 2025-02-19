/**
 * @fileoverview Redux slice for managing conversation and voice processing state
 * Handles message history, conversation status, voice processing, and real-time updates
 * @version 1.0.0
 */

import { createSlice, PayloadAction, createSelector } from '@reduxjs/toolkit'; // ^2.0.0
import { 
    Conversation, 
    Message, 
    ConversationStatus,
    ConversationEvent
} from '../../types/conversation.types';

// Voice processing status states
export enum VoiceProcessingStatus {
    IDLE = 'idle',
    LISTENING = 'listening',
    PROCESSING = 'processing',
    SPEAKING = 'speaking',
    ERROR = 'error'
}

// Interface for the conversation slice state
interface ConversationState {
    currentConversation: Conversation | null;
    loading: boolean;
    error: string | null;
    voiceProcessingStatus: VoiceProcessingStatus;
    audioLevel: number;
    voiceError: string | null;
    messageQueue: Message[];
}

// Initial state definition
const initialState: ConversationState = {
    currentConversation: null,
    loading: false,
    error: null,
    voiceProcessingStatus: VoiceProcessingStatus.IDLE,
    audioLevel: -60, // Initial audio level in dB
    voiceError: null,
    messageQueue: []
};

// Create the conversation slice
export const conversationSlice = createSlice({
    name: 'conversation',
    initialState,
    reducers: {
        setConversation: (state, action: PayloadAction<Conversation>) => {
            state.currentConversation = action.payload;
            state.error = null;
        },
        
        addMessage: (state, action: PayloadAction<Message>) => {
            if (state.currentConversation) {
                state.currentConversation.messages.push(action.payload);
                state.currentConversation.metadata.updatedAt = Date.now();
            }
        },
        
        updateStatus: (state, action: PayloadAction<ConversationStatus>) => {
            if (state.currentConversation) {
                state.currentConversation.status = action.payload;
                state.currentConversation.metadata.updatedAt = Date.now();
            }
        },
        
        setVoiceProcessingStatus: (state, action: PayloadAction<VoiceProcessingStatus>) => {
            state.voiceProcessingStatus = action.payload;
            if (action.payload === VoiceProcessingStatus.IDLE) {
                state.voiceError = null;
            }
        },
        
        setAudioLevel: (state, action: PayloadAction<number>) => {
            state.audioLevel = Math.max(-60, Math.min(0, action.payload));
        },
        
        setVoiceError: (state, action: PayloadAction<string>) => {
            state.voiceError = action.payload;
            state.voiceProcessingStatus = VoiceProcessingStatus.ERROR;
        },
        
        clearVoiceError: (state) => {
            state.voiceError = null;
            state.voiceProcessingStatus = VoiceProcessingStatus.IDLE;
        },
        
        addToMessageQueue: (state, action: PayloadAction<Message>) => {
            state.messageQueue.push(action.payload);
        },
        
        clearMessageQueue: (state) => {
            state.messageQueue = [];
        },
        
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.loading = action.payload;
        },
        
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.loading = false;
        },
        
        clearConversation: (state) => {
            state.currentConversation = null;
            state.messageQueue = [];
            state.voiceProcessingStatus = VoiceProcessingStatus.IDLE;
            state.voiceError = null;
            state.error = null;
        }
    }
});

// Memoized selectors
export const selectCurrentConversation = createSelector(
    [(state: { conversation: ConversationState }) => state.conversation],
    (conversationState) => conversationState.currentConversation
);

export const selectVoiceProcessingStatus = createSelector(
    [(state: { conversation: ConversationState }) => state.conversation],
    (conversationState) => conversationState.voiceProcessingStatus
);

export const selectAudioLevel = createSelector(
    [(state: { conversation: ConversationState }) => state.conversation],
    (conversationState) => conversationState.audioLevel
);

export const selectMessageQueue = createSelector(
    [(state: { conversation: ConversationState }) => state.conversation],
    (conversationState) => conversationState.messageQueue
);

export const selectVoiceError = createSelector(
    [(state: { conversation: ConversationState }) => state.conversation],
    (conversationState) => conversationState.voiceError
);

// Export actions and reducer
export const { 
    setConversation,
    addMessage,
    updateStatus,
    setVoiceProcessingStatus,
    setAudioLevel,
    setVoiceError,
    clearVoiceError,
    addToMessageQueue,
    clearMessageQueue,
    setLoading,
    setError,
    clearConversation
} = conversationSlice.actions;

export default conversationSlice.reducer;