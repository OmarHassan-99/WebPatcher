import { useState, useRef, useEffect } from "react";
import { motion as Motion, AnimatePresence } from "framer-motion";
import { MessageSquare, X, Send, Loader2, Bot } from "lucide-react";
import toast from "react-hot-toast";
import api from "../../api/axios";

export default function BotPatcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState([
    {
      role: "ai",
      content: "Hello! I am Webpatchy, your AI cybersecurity assistant. How can I help you today?",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = { role: "user", content: message.trim() };
    const history = messages.slice(-5); // Keep last 5 messages for context

    setMessages((prev) => [...prev, userMessage]);
    setMessage("");
    setIsLoading(true);

    try {
      const response = await api.post("/api/chat", {
        message: userMessage.content,
        history,
      });

      if (response.data.success) {
        setMessages((prev) => [
          ...prev,
          { role: "ai", content: response.data.reply },
        ]);
      } else {
        toast.error(response.data.message || "Failed to get a response");
      }
    } catch (error) {
      console.error(error);
      toast.error("An error occurred while talking to Webpatchy.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[100] font-sans hidden-print">
      <AnimatePresence>
        {isOpen && (
          <Motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="absolute bottom-16 left-0 w-80 sm:w-96 bg-[#0B0F19]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl shadow-primary-900/20 overflow-hidden flex flex-col"
            style={{ height: "450px", maxHeight: "80vh" }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-500/20 rounded-lg text-primary-300">
                  <Bot size={18} />
                </div>
                <h3 className="font-semibold text-white">Webpatchy AI</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 text-gray-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] px-4 py-2.5 rounded-2xl text-sm ${msg.role === "user"
                        ? "bg-primary-600 text-white rounded-br-sm"
                        : "bg-surface-800 text-gray-200 border border-white/10 rounded-bl-sm"
                      }`}
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-surface-800 border border-white/10 rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 size={16} className="text-primary-400 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-surface-950 border-t border-white/10">
              <form
                onSubmit={handleSend}
                className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-2 focus-within:border-primary-500/50 transition-colors"
              >
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Ask Webpatchy..."
                  className="flex-1 bg-transparent border-none outline-none text-white text-sm placeholder-gray-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!message.trim() || isLoading}
                  className="text-primary-400 hover:text-primary-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </Motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Button */}
      <Motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-900/30 flex items-center justify-center cursor-pointer transition-colors"
      >
        <AnimatePresence mode="wait">
          {isOpen ? (
            <Motion.div
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X size={24} />
            </Motion.div>
          ) : (
            <Motion.div
              key="open"
              initial={{ rotate: 90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: -90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageSquare size={24} />
            </Motion.div>
          )}
        </AnimatePresence>
      </Motion.button>
    </div>
  );
}
