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
      
      // If the response status is not OK, handle the error
      if (!response.ok) {
        const errorData = await response.json();
        const errorMessage = errorData.message || "Failed to process text";
        
        // Check for specific error conditions
        if (errorMessage.includes("API") || errorMessage.includes("Chonkie")) {
          throw new Error("There was an issue with our text processing service. Please try again later.");
        }
        throw new Error(errorMessage);
      }
      
      const data = await response.json();
      
      // Verify we got chunks back
      if (!data.chunks || data.chunks.length === 0) {
        throw new Error("No text chunks were generated. Please try with a longer text.");
      }
      
      // For each chunk, fetch questions
      const questions: Record<number, Question[]> = {};
      try {
        for (const chunk of data.chunks) {
          const questionsResponse = await apiRequest(
            "POST", 
            "/api/generate-questions", 
            { chunkId: chunk.id, text: chunk.text }
          );
          
          if (!questionsResponse.ok) {
            const errorData = await questionsResponse.json();
            console.error("Question generation error:", errorData);
            // Use default questions if API fails
            questions[chunk.id] = [
              { id: chunk.id * 100, text: "What is the main idea of this passage?", chunkId: chunk.id },
              { id: chunk.id * 100 + 1, text: "What did you find most interesting about this text?", chunkId: chunk.id }
            ];
            continue;
          }
          
          const questionData = await questionsResponse.json();
          questions[chunk.id] = questionData.questions;
          
          // If we didn't get any questions, add default ones
          if (!questionData.questions || questionData.questions.length === 0) {
            questions[chunk.id] = [
              { id: chunk.id * 100, text: "What is the main idea of this passage?", chunkId: chunk.id },
              { id: chunk.id * 100 + 1, text: "What did you find most interesting about this text?", chunkId: chunk.id }
            ];
          }
        }
      } catch (questionError) {
        console.error("Error generating questions:", questionError);
        // Continue with chunks even if questions fail - we'll add default questions
        for (const chunk of data.chunks) {
          if (!questions[chunk.id]) {
            questions[chunk.id] = [
              { id: chunk.id * 100, text: "What is the main idea of this passage?", chunkId: chunk.id },
              { id: chunk.id * 100 + 1, text: "What did you find most interesting about this text?", chunkId: chunk.id }
            ];
          }
        }
      }
      
      setSession(prev => ({
        ...prev,
        chunks: data.chunks,
        questions,
        activeChunkIndex: 0,
        status: "reading"
      }));
    } catch (error: any) {
      console.error("Error processing text:", error);
      toast({
        title: "Processing Error",
        description: error.message || "There was an error processing your text. Please try again with different content.",
        variant: "destructive"
      });
      setSession(prev => ({ ...prev, status: "input" }));
    }
  };

  const submitAnswers = async (chunkId: number, responses: UserResponse[]): Promise<void> => {
    try {
      const chunk = session.chunks.find(c => c.id === chunkId);
      if (!chunk) throw new Error("Chunk not found");
      
      // Default feedback in case API calls fail
      let feedback: ReviewFeedback = {
        review: "Your responses show good understanding of the text. Keep going!",
        rating: 50 // Neutral positive rating
      };
      
      try {
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
        
        if (!response.ok) {
          console.warn("Review API returned error status:", response.status);
          const errorData = await response.json();
          console.error("Review API error:", errorData);
          
          // Continue with default feedback
          toast({
            title: "Partial Success",
            description: "Your answers were recorded, but we couldn't generate detailed feedback. Please continue.",
            variant: "default"
          });
        } else {
          const data = await response.json();
          if (data.feedback && data.feedback.review) {
            feedback = data.feedback;
          }
        }
      } catch (reviewError) {
        console.error("Error reviewing responses:", reviewError);
        // Continue with default feedback
        toast({
          title: "Feedback Unavailable",
          description: "We couldn't generate detailed feedback for your responses, but you can continue reading.",
          variant: "default"
        });
      }
      
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
            [chunkId]: feedback 
          },
          // Update overall performance as running average
          performance: calculatePerformance(prev.performance, feedback.rating, Object.keys(prev.feedback).length)
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
        
        try {
          // Call API to potentially adapt next chunk based on performance
          const adaptResponse = await apiRequest("POST", "/api/adapt-chunk", {
            chunkId: nextChunk.id,
            text: nextChunk.text,
            rating: feedback.rating
          });
          
          if (adaptResponse.ok) {
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
          } else {
            console.warn("Adaptation API failed, continuing with original text");
          }
        } catch (adaptError) {
          console.error("Error adapting next chunk:", adaptError);
          // Continue without adapting the chunk
        }
      }
    } catch (error: any) {
      console.error("Error submitting answers:", error);
      toast({
        title: "Submission Failed",
        description: error.message || "There was an error processing your answers. Please try again.",
        variant: "destructive"
      });
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
