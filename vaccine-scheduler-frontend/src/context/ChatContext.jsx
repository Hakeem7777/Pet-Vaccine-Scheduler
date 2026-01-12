import { createContext, useContext, useState, useCallback, useRef } from 'react';

const ChatContext = createContext(null);

export function ChatProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [currentDogId, setCurrentDogId] = useState(null);
  const [currentDog, setCurrentDog] = useState(null);
  const [allDogsContext, setAllDogsContextState] = useState(null); // { dogIds: [], dogs: [] }
  const [isLoading, setIsLoading] = useState(false);

  // Track previous context to detect changes
  const prevContextRef = useRef({ dogId: null, allDogs: null });

  const openChat = useCallback(() => setIsOpen(true), []);
  const closeChat = useCallback(() => setIsOpen(false), []);
  const toggleChat = useCallback(() => setIsOpen((prev) => !prev), []);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  // Set single dog context (clears multi-dog context)
  const setDogContext = useCallback((dogId, dogData) => {
    const prevDogId = prevContextRef.current.dogId;
    const prevAllDogs = prevContextRef.current.allDogs;

    // Clear chat if context is changing
    if (prevDogId !== dogId || prevAllDogs !== null) {
      setMessages([]);
    }

    setCurrentDogId(dogId);
    setCurrentDog(dogData);
    setAllDogsContextState(null);

    prevContextRef.current = { dogId, allDogs: null };
  }, []);

  // Set multi-dog context (clears single dog context)
  const setAllDogsContext = useCallback((dogs) => {
    const prevDogId = prevContextRef.current.dogId;
    const prevAllDogs = prevContextRef.current.allDogs;

    if (dogs && dogs.length > 0) {
      const newDogIds = dogs.map((d) => d.id).join(',');
      const prevDogIds = prevAllDogs?.dogIds?.join(',');

      // Clear chat if context is changing
      if (prevDogId !== null || prevDogIds !== newDogIds) {
        setMessages([]);
      }

      const newContext = {
        dogIds: dogs.map((d) => d.id),
        dogs: dogs,
      };
      setAllDogsContextState(newContext);
      setCurrentDogId(null);
      setCurrentDog(null);

      prevContextRef.current = { dogId: null, allDogs: newContext };
    } else {
      // Clearing context
      if (prevAllDogs !== null) {
        setMessages([]);
      }
      setAllDogsContextState(null);
      prevContextRef.current = { dogId: null, allDogs: null };
    }
  }, []);

  // Helper to check context mode
  const contextMode = allDogsContext ? 'all_dogs' : currentDogId ? 'single_dog' : 'none';

  const addMessage = useCallback((message) => {
    setMessages((prev) => [...prev, message]);
  }, []);

  const value = {
    isOpen,
    messages,
    currentDogId,
    currentDog,
    allDogsContext,
    contextMode,
    isLoading,
    setIsLoading,
    openChat,
    closeChat,
    toggleChat,
    setDogContext,
    setAllDogsContext,
    clearChat,
    addMessage,
    setMessages,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
}
