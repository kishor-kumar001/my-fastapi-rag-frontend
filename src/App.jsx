import { useState, useEffect } from "react";
import axios from "axios";
import ReactMarkdown from "react-markdown";

const API_URL = "https://my-fastapi-rag.onrender.com";

function App() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [currentConversationId, setCurrentConversationId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // =========================================================
  // LOAD CONVERSATIONS WHEN APP STARTS
  // =========================================================

  useEffect(() => {
    initializeChat();
  }, []);

  async function initializeChat() {
    try {
      setLoadingHistory(true);

      const response = await axios.get(
        `${API_URL}/conversations`
      );

      const existingConversations =
        response.data.conversations;

      setConversations(existingConversations);

      // If conversations already exist,
      // open the most recent one
      if (existingConversations.length > 0) {
        const latestConversation =
          existingConversations[0];

        await loadConversation(
          latestConversation.id
        );
      } else {
        // No conversations yet,
        // create the first one
        await createNewChat();
      }

    } catch (error) {
      console.error(
        "Failed to initialize chat:",
        error
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  // =========================================================
  // CREATE NEW CHAT
  // =========================================================

async function createNewChat() {
  try {
    const response = await axios.post(
      `${API_URL}/conversations`
    );

    const newConversation = {
      id: response.data.conversation_id,
      title: response.data.title,
    };

    setConversations((prev) => [
      newConversation,
      ...prev,
    ]);

    setCurrentConversationId(
      newConversation.id
    );

    setMessages([]);
    setQuestion("");

  } catch (error) {
    console.error(
      "Failed to create new chat:",
      error
    );
  }
}
  // =========================================================
  // LOAD A PARTICULAR CONVERSATION
  // =========================================================

  async function loadConversation(
    conversationId
  ) {
    try {
      setLoadingHistory(true);

      const response = await axios.get(
        `${API_URL}/conversations/${conversationId}/messages`
      );

      const dbMessages =
        response.data.messages;

      const formattedMessages = [];

      dbMessages.forEach((chat) => {
        formattedMessages.push({
          sender: "user",
          text: chat.question,
        });

        formattedMessages.push({
          sender: "ai",
          text: chat.answer,
        });
      });

      setMessages(formattedMessages);

      setCurrentConversationId(
        conversationId
      );

      setQuestion("");

    } catch (error) {
      console.error(
        "Failed to load conversation:",
        error
      );
    } finally {
      setLoadingHistory(false);
    }
  }

  // =========================================================
  // SEND QUESTION
  // =========================================================

  async function askQuestion() {
    if (
      !question.trim() ||
      loading ||
      !currentConversationId
    ) {
      return;
    }

    const currentQuestion = question;

    // Add user message immediately
    const userMessage = {
      sender: "user",
      text: currentQuestion,
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setQuestion("");
    setLoading(true);

    try {
      const response = await axios.post(
        `${API_URL}/chat`,
        {
          question: currentQuestion,
          conversation_id:
            currentConversationId,
        }
      );
      const newTitle = response.data.title;

        setConversations((prev) =>
        prev.map((conversation) =>
        conversation.id === currentConversationId
        ? {
                ...conversation,
                title: newTitle,
                }
        : conversation
        )
        );

      const aiMessage = {
        sender: "ai",
        text: response.data.answer,
      };

      setMessages((prev) => [
        ...prev,
        aiMessage,
      ]);

    } catch (error) {
      console.error(
        "Chat request failed:",
        error
      );

      let errorMessage =
        "Something went wrong. Please try again.";

      if (error.response?.data?.detail) {
        errorMessage =
          error.response.data.detail;
      }

      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: errorMessage,
        },
      ]);

    } finally {
      setLoading(false);
    }
  }


  async function deleteChat(conversationId) {
  try {
    await axios.delete(
      `${API_URL}/conversations/${conversationId}`
    );

    const remainingConversations =
      conversations.filter(
        (conversation) =>
          conversation.id !== conversationId
      );

    setConversations(remainingConversations);

    if (
      currentConversationId ===
      conversationId
    ) {
      if (remainingConversations.length > 0) {
        await loadConversation(
          remainingConversations[0].id
        );
      } else {
        setMessages([]);
        setCurrentConversationId(null);
        await createNewChat();
      }
    }

  } catch (error) {
    console.error(
      "Failed to delete chat:",
      error
    );
  }
}

  // =========================================================
  // UI
  // =========================================================

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "Arial",
        backgroundColor: "#f5f5f5",
      }}
    >

      {/* =================================================
          SIDEBAR
      ================================================= */}

      <div
        style={{
          width: "250px",
          backgroundColor: "#ffffff",
          borderRight: "1px solid #ddd",
          padding: "20px",
          boxSizing: "border-box",
        }}
      >

        <h2>📚 RAG Chatbot</h2>

        {/* New Chat Button */}

        <button
          onClick={createNewChat}
          style={{
            width: "100%",
            padding: "12px",
            marginBottom: "20px",
            border: "none",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "15px",
          }}
        >
          + New Chat
        </button>

        <h3>Chat History</h3>

        {/* Conversation List */}

        <div>
          {conversations.map(
  (conversation) => (
    <div
      key={conversation.id}
      style={{
        display: "flex",
        alignItems: "center",
        marginBottom: "8px",
        borderRadius: "8px",
        backgroundColor:
          currentConversationId ===
          conversation.id
            ? "#e8e8e8"
            : "transparent",
      }}
    >

      {/* Chat title */}
      <div
        onClick={() =>
          loadConversation(
            conversation.id
          )
        }
        style={{
          flex: 1,
          padding: "12px",
          cursor: "pointer",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        💬 {conversation.title}
      </div>

      {/* Delete button */}
      <button
        onClick={() =>
          deleteChat(conversation.id)
        }
        style={{
          border: "none",
          background: "transparent",
          cursor: "pointer",
          padding: "8px",
        }}
        title="Delete chat"
        >
                🗑️
        </button>

        </div>
        )
        )}
        </div>
      </div>

      {/* =================================================
          MAIN CHAT AREA
      ================================================= */}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "30px",
          boxSizing: "border-box",
        }}
      >

        <h1>RAG Assistant</h1>

        {/* Chat Messages */}

        <div
          style={{
            flex: 1,
            border: "1px solid #ddd",
            borderRadius: "10px",
            padding: "20px",
            backgroundColor: "#ffffff",
            overflowY: "auto",
            marginBottom: "20px",
          }}
        >

          {loadingHistory && (
            <p>Loading conversation...</p>
          )}

          {!loadingHistory &&
            messages.length === 0 && (
              <p>
                Start a new conversation by
                asking a question.
              </p>
            )}

          {messages.map(
            (msg, index) => (
              <div
                key={index}
                style={{
                  marginBottom: "20px",
                }}
              >
                <strong>
                  {msg.sender === "user"
                    ? "🙋 You"
                    : "🤖 AI"}
                </strong>

                <ReactMarkdown>
                  {msg.text}
                </ReactMarkdown>
              </div>
            )
          )}

          {/* Thinking */}

          {loading && (
            <p>
              <b>🤖 AI:</b> Thinking...
            </p>
          )}

        </div>

        {/* =================================================
            INPUT AREA
        ================================================= */}

        <div
          style={{
            display: "flex",
          }}
        >

          <input
            type="text"
            value={question}
            placeholder="Ask your question..."
            onChange={(e) =>
              setQuestion(e.target.value)
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                askQuestion();
              }
            }}
            disabled={
              loading ||
              loadingHistory
            }
            style={{
              flex: 1,
              padding: "12px",
              fontSize: "16px",
              border: "1px solid #ccc",
              borderRadius: "8px",
            }}
          />

          <button
            onClick={askQuestion}
            disabled={
              loading ||
              loadingHistory ||
              !question.trim() ||
              !currentConversationId
            }
            style={{
              padding: "12px 20px",
              marginLeft: "10px",
              fontSize: "16px",
              cursor:
                loading
                  ? "not-allowed"
                  : "pointer",
              border: "none",
              borderRadius: "8px",
            }}
          >
            {loading
              ? "Thinking..."
              : "Send"}
          </button>

        </div>

      </div>
    </div>
  );
}

export default App;