import { useState, useRef, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { sendChatMessage } from '../../api/ai';
import ChatMessage from './ChatMessage';
import LoadingSpinner from '../common/LoadingSpinner';
import './ChatWindow.css';

function ChatWindow() {
  const {
    isOpen,
    messages,
    currentDog,
    currentDogId,
    allDogsContext,
    contextMode,
    isLoading,
    setIsLoading,
    closeChat,
    addMessage,
    clearChat,
  } = useChat();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = { role: 'user', content: input.trim() };
    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      // Pass dogIds for multi-dog context, or dogId for single dog
      const dogIds = allDogsContext?.dogIds || null;
      const dogId = !dogIds ? currentDogId : null;

      const response = await sendChatMessage(userMessage.content, dogId, dogIds, messages);

      addMessage({
        role: 'assistant',
        content: response.response,
        sources: response.sources,
      });
    } catch (error) {
      addMessage({
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        isError: true,
      });
    } finally {
      setIsLoading(false);
    }
  }

  // Render context badge in header
  function renderContextBadge() {
    if (contextMode === 'all_dogs' && allDogsContext) {
      const count = allDogsContext.dogs.length;
      const names = allDogsContext.dogs.slice(0, 2).map((d) => d.name).join(', ');
      const extra = count > 2 ? ` +${count - 2} more` : '';
      return (
        <span className="chat-dog-context chat-dog-context--multi">
          All dogs: {names}{extra}
        </span>
      );
    } else if (contextMode === 'single_dog' && currentDog) {
      return <span className="chat-dog-context">Discussing: {currentDog.name}</span>;
    }
    return null;
  }

  // Render welcome message based on context
  function renderWelcome() {
    if (contextMode === 'all_dogs' && allDogsContext) {
      return (
        <div className="chat-welcome">
          <p>Hi! I can help answer questions about your dogs&apos; vaccinations.</p>
          <p>
            I have context about <strong>all {allDogsContext.dogs.length} of your dogs</strong>.
            You can ask questions like:
          </p>
          <ul className="chat-suggestions">
            <li>&quot;Which of my dogs needs vaccines soon?&quot;</li>
            <li>&quot;Compare my dogs&apos; vaccination status&quot;</li>
            <li>&quot;Are any of my dogs overdue for rabies?&quot;</li>
          </ul>
        </div>
      );
    } else if (contextMode === 'single_dog' && currentDog) {
      return (
        <div className="chat-welcome">
          <p>Hi! I can help answer questions about dog vaccinations.</p>
          <p>
            I have context about <strong>{currentDog.name}</strong> - feel free to ask specific
            questions about their vaccination needs.
          </p>
        </div>
      );
    }
    return (
      <div className="chat-welcome">
        <p>Hi! I can help answer questions about dog vaccinations.</p>
        <p>Navigate to a dog&apos;s page for personalized advice, or the dashboard to ask about all your dogs.</p>
      </div>
    );
  }

  if (!isOpen) return null;

  return (
    <div className="chat-window">
      <div className="chat-window-header">
        <div className="chat-window-title">
          <h4>AI Vaccine Assistant</h4>
          {renderContextBadge()}
        </div>
        <div className="chat-window-actions">
          <button onClick={clearChat} title="Clear chat" className="chat-action-btn">
            Clear
          </button>
          <button onClick={closeChat} title="Close" className="chat-action-btn chat-close-btn">
            &times;
          </button>
        </div>
      </div>

      <div className="chat-window-messages">
        {messages.length === 0 && renderWelcome()}

        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}

        {isLoading && (
          <div className="chat-loading">
            <LoadingSpinner size="small" />
            <span>Thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <form className="chat-window-input" onSubmit={handleSubmit}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about vaccinations..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default ChatWindow;
