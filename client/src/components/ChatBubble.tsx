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

    // Get the current active chunk text
    const activeChunk = session.chunks.find(chunk => chunk.status === "active");
    if (!activeChunk) {
      toast({
        title: "No active reading",
        description: "Please start a reading session to get hints.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsLoading(true);
      
      const response = await apiRequest(
        "POST",
        "/api/chat",
        { text: activeChunk.text }
      );

      const data = await response.json();
      if (data.hint) {
        setHint(data.hint);
        setMessage("");
      } else {
        throw new Error("No hint received from the server");
      }
    } catch (error) {
      console.error("Error getting hint:", error);
      toast({
        title: "Couldn't get a hint",
        description: "Sorry, I couldn't analyze this text right now. Please try again later.",
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
        className="h-14 w-14 rounded-full shadow-lg bg-primary-600 hover:bg-primary-700"
      >
        {isOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <MessageCircle className="h-6 w-6" />
        )}
        <span className="sr-only">Toggle chat</span>
      </Button>

      {/* Chat panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 sm:w-96 bg-white rounded-lg shadow-xl overflow-hidden flex flex-col">
          <div className="bg-primary-600 p-3 text-white font-medium flex justify-between items-center">
            <h3>Reading Assistant</h3>
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
                <MessageCircle className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                <p className="text-gray-600 mb-1">Ask for a hint on the current passage</p>
                <p className="text-gray-500 text-sm">I can help identify important sentences to focus on.</p>
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
                placeholder="Ask for a hint on this passage..."
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
              Hints will only guide you to important parts without giving answers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}