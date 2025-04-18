import { createContext, useContext, useState, ReactNode } from "react";
import { ReadingSession, Chunk, Question, UserResponse, ReviewFeedback } from "@/types";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReadingContextType {
  session: ReadingSession;
  processText: (text: string) => Promise<void>;
  submitAnswers: (chunkId: number, responses: UserResponse[]) => Promise<void>;
  moveToNextChunk: () => void;
  moveToPreviousChunk: () => void;
  setActiveChunkIndex: (index: number) => void;
  resetSession: () => void;
}

const initialSession: ReadingSession = {
  originalText: "",
  chunks: [],
  questions: {},
  responses: {},
  feedback: {},
  performance: 0,
  activeChunkIndex: 0,
  status: "input"
};

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ReadingSession>(initialSession);
  const { toast } = useToast();

  const processText = async (text: string): Promise<void> => {
    try {
      setSession(prev => ({ 
        ...prev, 
        originalText: text,
        status: "processing" 
      }));
      
      // Call API to process text and get chunks
      const response = await apiRequest("POST", "/api/process-text", { text });
      const data = await response.json();
      
      // For each chunk, fetch questions
      const questions: Record<number, Question[]> = {};
      for (const chunk of data.chunks) {
        const questionsResponse = await apiRequest(
          "POST", 
          "/api/generate-questions", 
          { chunkId: chunk.id, text: chunk.text }
        );
        const questionData = await questionsResponse.json();
        questions[chunk.id] = questionData.questions;
      }
      
      setSession(prev => ({
        ...prev,
        chunks: data.chunks,
        questions,
        activeChunkIndex: 0,
        status: "reading"
      }));
    } catch (error) {
      console.error("Error processing text:", error);
      toast({
        title: "Processing Failed",
        description: "There was an error processing your text. Please try again.",
        variant: "destructive"
      });
      setSession(prev => ({ ...prev, status: "input" }));
      throw error;
    }
  };

  const submitAnswers = async (chunkId: number, responses: UserResponse[]): Promise<void> => {
    try {
      const chunk = session.chunks.find(c => c.id === chunkId);
      if (!chunk) throw new Error("Chunk not found");
      
      const response = await apiRequest("POST", "/api/review-responses", {
        chunkId,
        text: chunk.text,
        questions: session.questions[chunkId].map(q => q.text),
        responses: responses.map(r => {
          const question = session.questions[chunkId].find(q => q.id === r.questionId);
          return {
            question: question?.text || "",
            response: r.text
          };
        })
      });
      
      const data = await response.json();
      const { review, rating } = data.feedback;
      
      // Update the session with responses and feedback
      setSession(prev => {
        const updatedSession = { 
          ...prev,
          responses: { 
            ...prev.responses, 
            [chunkId]: responses 
          },
          feedback: { 
            ...prev.feedback, 
            [chunkId]: { review, rating } 
          },
          // Update overall performance as running average
          performance: calculatePerformance(prev.performance, rating, Object.keys(prev.feedback).length)
        };
        
        // If this is the last chunk, mark as complete
        if (prev.activeChunkIndex === prev.chunks.length - 1) {
          updatedSession.status = "complete";
        }
        
        return updatedSession;
      });
      
      // If there's another chunk, pre-process it
      const nextChunkIndex = session.activeChunkIndex + 1;
      if (nextChunkIndex < session.chunks.length) {
        const nextChunk = session.chunks[nextChunkIndex];
        
        // Call API to potentially adapt next chunk based on performance
        const adaptResponse = await apiRequest("POST", "/api/adapt-chunk", {
          chunkId: nextChunk.id,
          text: nextChunk.text,
          rating
        });
        
        const adaptData = await adaptResponse.json();
        
        // Update the adapted chunk if it was modified
        if (adaptData.isSimplified) {
          setSession(prev => {
            const updatedChunks = [...prev.chunks];
            updatedChunks[nextChunkIndex] = {
              ...updatedChunks[nextChunkIndex],
              text: adaptData.text,
              isSimplified: true,
              simplificationLevel: adaptData.simplificationLevel
            };
            
            return { ...prev, chunks: updatedChunks };
          });
        }
      }
      
    } catch (error) {
      console.error("Error submitting answers:", error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your answers. Please try again.",
        variant: "destructive"
      });
      throw error;
    }
  };

  const moveToNextChunk = () => {
    setSession(prev => {
      const nextIndex = prev.activeChunkIndex + 1;
      if (nextIndex >= prev.chunks.length) return prev;
      
      return { ...prev, activeChunkIndex: nextIndex };
    });
  };

  const moveToPreviousChunk = () => {
    setSession(prev => {
      const prevIndex = prev.activeChunkIndex - 1;
      if (prevIndex < 0) return prev;
      
      return { ...prev, activeChunkIndex: prevIndex };
    });
  };

  const setActiveChunkIndex = (index: number) => {
    setSession(prev => {
      if (index < 0 || index >= prev.chunks.length) return prev;
      return { ...prev, activeChunkIndex: index };
    });
  };

  const resetSession = () => {
    setSession(initialSession);
  };

  return (
    <ReadingContext.Provider value={{
      session,
      processText,
      submitAnswers,
      moveToNextChunk,
      moveToPreviousChunk,
      setActiveChunkIndex,
      resetSession
    }}>
      {children}
    </ReadingContext.Provider>
  );
}

export function useReading() {
  const context = useContext(ReadingContext);
  if (context === undefined) {
    throw new Error("useReading must be used within a ReadingProvider");
  }
  return context;
}

// Helper function to calculate running average performance
function calculatePerformance(currentPerformance: number, newRating: number, feedbackCount: number): number {
  // For first rating, just return it
  if (feedbackCount === 0) return newRating;
  
  // Otherwise calculate running average
  return ((currentPerformance * feedbackCount) + newRating) / (feedbackCount + 1);
}
