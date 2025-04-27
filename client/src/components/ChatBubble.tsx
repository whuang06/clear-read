import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useReading } from "@/context/ReadingContext";
import { apiRequest } from "@/lib/queryClient";

interface ChatBubbleProps {
  className?: string;
}

export function ChatBubble({ className = "" }: ChatBubbleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hint, setHint] = useState<string | null>(null);
  const { toast } = useToast();
  const { session } = useReading();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messageEndRef = useRef<HTMLDivElement>(null);

  // Focus textarea when chat is opened
  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  // Scroll to bottom when new hint is received
  useEffect(() => {
    if (messageEndRef.current) {
      messageEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [hint]);

  const toggleChat = () => {
    setIsOpen(prev => !prev);
    if (hint) {
      setHint(null);
    }
  };

  const sendMessage = async () => {
    if (!message.trim()) return;

    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        "POST",
        "/api/chat",
        { query: message.trim() }
      );

      const data = await response.json();
      if (data.hint) {
        setHint(data.hint);
        setMessage("");
      } else {
        throw new Error("No hint received from the server");
      }
    } catch (error) {
      console.error("Error getting response:", error);
      toast({
        title: "Couldn't process your request",
        description: "Sorry, I couldn't answer your question right now. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className={`fixed bottom-6 right-6 z-50 ${className}`}>
      {/* Chat toggle button */}
      <Button
        onClick={toggleChat}
        size="icon"
        className="h-16 w-16 rounded-full shadow-xl bg-primary-600 hover:bg-primary-700 border-2 border-white flex items-center justify-center relative animate-pulse-slow"
      >
        {isOpen ? (
          <X className="h-7 w-7" />
        ) : (
          <>
            <MessageCircle className="h-8 w-8" />
            <span className="absolute -top-1 -right-1 bg-red-500 h-4 w-4 rounded-full border border-white"></span>
          </>
        )}
        <span className="sr-only">Toggle chat</span>
      </Button>

      {/* Chat panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          <div className="bg-primary-600 p-3 text-white font-medium flex justify-between items-center">
            <h3>ClearRead Assistant</h3>
            <Button variant="ghost" size="sm" onClick={toggleChat} className="h-8 w-8 p-0 text-white hover:bg-primary-700 rounded-full">
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
          
          <div className="p-4 flex-1 overflow-y-auto max-h-[320px] bg-gray-50">
            {hint ? (
              <div className="bg-white p-3 rounded-lg shadow-sm">
                <p className="text-sm text-gray-800">{hint}</p>
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="relative inline-block mx-auto mb-3">
                  <MessageCircle className="h-12 w-12 mx-auto text-primary-500 mb-2" />
                  <span className="absolute bottom-2 right-0 w-4 h-4 bg-primary-600 rounded-full border-2 border-white"></span>
                </div>
                <p className="text-gray-600 mb-1 font-medium">How can I help you today?</p>
                <p className="text-gray-500 text-sm">I'm here to provide general assistance with your questions.</p>
              </div>
            )}
            <div ref={messageEndRef} />
          </div>
          
          <div className="p-3 border-t">
            <div className="flex items-end gap-2">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question here..."
                className="min-h-[60px] resize-none"
                disabled={isLoading}
              />
              <Button 
                size="icon" 
                onClick={sendMessage} 
                disabled={isLoading || !message.trim()}
                className="h-10 w-10 shrink-0"
              >
                <Send className="h-4 w-4" />
                <span className="sr-only">Send</span>
              </Button>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              I'll provide helpful guidance on any questions you might have.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}