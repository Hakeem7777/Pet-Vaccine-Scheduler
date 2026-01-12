function ChatMessage({ message }) {
  const { role, content, sources, isError } = message;

  return (
    <div
      className={`chat-message chat-message--${role} ${isError ? 'chat-message--error' : ''}`}
    >
      <div className="chat-message-content">{content}</div>

      {sources && sources.length > 0 && (
        <details className="chat-message-sources">
          <summary>Sources ({sources.length})</summary>
          <ul>
            {sources.map((source, idx) => (
              <li key={idx}>
                <strong>{source.document}</strong>
                {source.excerpt && <p>{source.excerpt}</p>}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

export default ChatMessage;
