import { createContext, useState, useContext, ReactNode } from "react";
import { Chunk, Question, UserResponse, ReviewFeedback, ReadingSession, ReadingStatus } from "@/types";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ReadingContextType {
  session: ReadingSession;
  processText: (text: string) => Promise<void>;
  submitAnswers: (chunkId: number, responses: UserResponse[]) => Promise<void>;
  moveToNextChunk: () => void;
  moveToPreviousChunk: () => void;
  setActiveChunkIndex: (index: number) => void;
  resetSession: (preserveText?: boolean) => void;
}

const ReadingContext = createContext<ReadingContextType | undefined>(undefined);

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

export function ReadingProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ReadingSession>(initialSession);
  const { toast } = useToast();

  // Reset session to initial state
  const resetSession = (preserveText: boolean = false) => {
    console.log("Resetting reading session state", preserveText ? "while preserving text" : "completely");
    
    if (preserveText) {
      const originalText = session.originalText;
      // Reset but keep the original text
      setSession({
        ...initialSession,
        originalText
      });
    } else {
      setSession(initialSession);
    }
  };

  const processText = async (text: string): Promise<void> => {
    try {
      // Clear previous state and set to processing
      console.log("Starting text processing...");
      
      // Just set to processing state with the new text (without old chunks)
      setSession({ 
        ...initialSession, 
        originalText: text,
        status: "processing" 
      });
      
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
      
      console.log("Successfully received chunks:", data.chunks.length);
      
      // Only fetch questions for the first chunk immediately
      // Other questions will be loaded on-demand when the user navigates to each chunk
      const firstChunk = data.chunks[0];
      let firstChunkQuestions: Question[] = [];
      let questionErrorEncountered = false;
      
      try {
        const questionsResponse = await apiRequest(
          "POST", 
          "/api/generate-questions", 
          { chunkId: firstChunk.id, text: firstChunk.text }
        );
        
        if (!questionsResponse.ok) {
          console.error("Question generation error for first chunk:", firstChunk.id);
          questionErrorEncountered = true;
          // Use default questions if API fails
          firstChunkQuestions = [
            { id: firstChunk.id * 100, text: "What is the main idea of this passage?", chunkId: firstChunk.id },
            { id: firstChunk.id * 100 + 1, text: "What did you find most interesting about this text?", chunkId: firstChunk.id }
          ];
        } else {
          const questionData = await questionsResponse.json();
          console.log("Got questions for first chunk:", questionData);
          
          if (!questionData.questions || questionData.questions.length === 0) {
            // If we didn't get any questions, add default ones
            firstChunkQuestions = [
              { id: firstChunk.id * 100, text: "What is the main idea of this passage?", chunkId: firstChunk.id },
              { id: firstChunk.id * 100 + 1, text: "What did you find most interesting about this text?", chunkId: firstChunk.id }
            ];
          } else {
            firstChunkQuestions = questionData.questions;
          }
        }
      } catch (error) {
        console.error("Error fetching questions for first chunk:", error);
        questionErrorEncountered = true;
        // Add default questions for this chunk
        firstChunkQuestions = [
          { id: firstChunk.id * 100, text: "What is the main idea of this passage?", chunkId: firstChunk.id },
          { id: firstChunk.id * 100 + 1, text: "What did you find most interesting about this text?", chunkId: firstChunk.id }
        ];
      }
      
      // Update session with chunks and questions for first chunk only
      // Explicitly set the status to reading to ensure proper UI transition
      console.log("Setting final session state to reading with", data.chunks.length, "chunks");
      
      // Use a direct state set rather than a function to avoid potential state closure issues
      setSession({
        originalText: text,
        chunks: data.chunks,
        questions: { [firstChunk.id]: firstChunkQuestions },
        activeChunkIndex: 0,
        responses: {},
        feedback: {},
        performance: 0,
        status: "reading" // This triggers the reading interface to display
      });
      
      if (questionErrorEncountered) {
        toast({
          title: "Limited Questions",
          description: "We encountered some issues generating questions for your text. Basic questions have been provided instead.",
          variant: "default"
        });
      }
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
        
        // Update the current chunk status to completed
        updatedSession.chunks = prev.chunks.map((chunk, index) => {
          if (index === prev.activeChunkIndex) {
            return { ...chunk, status: "completed" };
          }
          return chunk;
        });
        
        // If this is the last chunk, mark the session as complete
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
            
            // Handle the case where the current chunk is too short
            if (adaptData.tooShort && adaptData.nextChunkNeeded) {
              console.log(`Chunk ${nextChunk.id} is too short (${nextChunk.text.length} chars), combining with next chunk`);
              
              // Check if there's another chunk after this one
              if (nextChunkIndex + 1 < session.chunks.length) {
                const followingChunk = session.chunks[nextChunkIndex + 1];
                
                // Combine the text of the current chunk with the next chunk
                const combinedText = `${nextChunk.text}\n\n${followingChunk.text}`;
                console.log(`Combined chunk length: ${combinedText.length} chars`);
                
                // Call adapt API again with the combined chunks
                const combinedResponse = await apiRequest("POST", "/api/adapt-chunk", {
                  chunkId: nextChunk.id,
                  text: combinedText,
                  rating: feedback.rating
                });
                
                if (combinedResponse.ok) {
                  const combinedData = await combinedResponse.json();
                  
                  // Update the session state to reflect the combined chunks
                  setSession(prev => {
                    const updatedChunks = [...prev.chunks];
                    
                    // Update the next chunk with combined text and metadata
                    updatedChunks[nextChunkIndex] = {
                      ...updatedChunks[nextChunkIndex],
                      text: combinedData.text,
                      difficulty: combinedData.isSimplified ? combinedData.newDifficulty : combinedData.originalDifficulty,
                      isSimplified: combinedData.isSimplified,
                      simplificationLevel: combinedData.simplificationLevel || 0,
                      isCombined: true
                    };
                    
                    // Mark the following chunk as combined so we can skip it
                    if (updatedChunks[nextChunkIndex + 1]) {
                      updatedChunks[nextChunkIndex + 1] = {
                        ...updatedChunks[nextChunkIndex + 1],
                        status: "combined",
                        isCombinedInto: nextChunk.id
                      };
                    }
                    
                    return { ...prev, chunks: updatedChunks };
                  });
                  
                  console.log("Chunks combined successfully");
                  return; // We're done with adaptation
                }
              }
            }
            
            // Normal case - just update the chunk with difficulty and simplification data
            setSession(prev => {
              const updatedChunks = [...prev.chunks];
              updatedChunks[nextChunkIndex] = {
                ...updatedChunks[nextChunkIndex],
                text: adaptData.text,
                difficulty: adaptData.isSimplified ? adaptData.newDifficulty : adaptData.originalDifficulty,
                isSimplified: adaptData.isSimplified,
                simplificationLevel: adaptData.simplificationLevel || 0
              };
              
              return { ...prev, chunks: updatedChunks };
            });
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

  // Helper function to load questions for a chunk if they're not already loaded
  // Also assess difficulty if not already set
  const loadQuestionsForChunk = async (chunkId: number, chunkText: string) => {
    // Get the chunk index
    const chunkIndex = session.chunks.findIndex(c => c.id === chunkId);
    if (chunkIndex === -1) return;
    
    // Determine if we need to load questions and/or assess difficulty
    const needQuestions = !session.questions[chunkId] || session.questions[chunkId].length === 0;
    const needDifficulty = session.chunks[chunkIndex].difficulty === undefined;
    
    // Skip if neither is needed
    if (!needQuestions && !needDifficulty) {
      return;
    }
    
    console.log(`Dynamically loading data for chunk ${chunkId} (questions: ${needQuestions}, difficulty: ${needDifficulty})`);
    try {
      const response = await apiRequest(
        "POST", 
        "/api/generate-questions", 
        { 
          chunkId, 
          text: chunkText,
          assessDifficultyNeeded: needDifficulty 
        }
      );
      
      if (!response.ok) {
        console.error("API error for chunk:", chunkId);
        // Use default questions if API fails
        if (needQuestions) {
          setSession(prev => ({
            ...prev,
            questions: {
              ...prev.questions,
              [chunkId]: [
                { id: chunkId * 100, text: "What is the main idea of this passage?", chunkId },
                { id: chunkId * 100 + 1, text: "What did you find most interesting about this text?", chunkId }
              ]
            }
          }));
        }
      } else {
        const data = await response.json();
        
        // Process both questions and difficulty in one session update
        setSession(prev => {
          const updates: Partial<ReadingSession> = { ...prev };
          
          // Update questions if needed and available
          if (needQuestions) {
            if (!data.questions || data.questions.length === 0) {
              // If we didn't get any questions, add default ones
              updates.questions = {
                ...prev.questions,
                [chunkId]: [
                  { id: chunkId * 100, text: "What is the main idea of this passage?", chunkId },
                  { id: chunkId * 100 + 1, text: "What did you find most interesting about this text?", chunkId }
                ]
              };
            } else {
              updates.questions = {
                ...prev.questions,
                [chunkId]: data.questions
              };
            }
          }
          
          // Update difficulty if needed and available
          if (needDifficulty && data.difficulty !== undefined) {
            const updatedChunks = [...prev.chunks];
            updatedChunks[chunkIndex] = {
              ...updatedChunks[chunkIndex],
              difficulty: data.difficulty
            };
            updates.chunks = updatedChunks;
          }
          
          return { ...prev, ...updates };
        });
      }
    } catch (error) {
      console.error("Error loading data for chunk:", error);
      // Add default questions if we couldn't load from API
      if (needQuestions) {
        setSession(prev => ({
          ...prev,
          questions: {
            ...prev.questions,
            [chunkId]: [
              { id: chunkId * 100, text: "What is the main idea of this passage?", chunkId },
              { id: chunkId * 100 + 1, text: "What did you find most interesting about this text?", chunkId }
            ]
          }
        }));
      }
    }
  };
  
  const moveToNextChunk = async () => {
    let nextIndex = session.activeChunkIndex + 1;
    if (nextIndex >= session.chunks.length) return;
    
    // Skip over any chunks that have been combined with others
    while (nextIndex < session.chunks.length && 
           session.chunks[nextIndex].status === "combined") {
      console.log(`Skipping combined chunk at index ${nextIndex}`);
      nextIndex++;
    }
    
    // Check again if we've gone past the end
    if (nextIndex >= session.chunks.length) return;
    
    // Set the active index first for immediate UI feedback
    setSession(prev => ({ ...prev, activeChunkIndex: nextIndex }));
    
    // Then load questions for the next chunk if needed
    const nextChunk = session.chunks[nextIndex];
    await loadQuestionsForChunk(nextChunk.id, nextChunk.text);
  };
  
  const moveToPreviousChunk = async () => {
    let prevIndex = session.activeChunkIndex - 1;
    if (prevIndex < 0) return;
    
    // Skip over any chunks that have been combined with others
    while (prevIndex >= 0 && 
           (session.chunks[prevIndex].status === "combined" || 
            session.chunks[prevIndex].status === "completed")) {
      
      // Log why we're skipping this chunk
      if (session.chunks[prevIndex].status === "combined") {
        console.log(`Skipping combined chunk at index ${prevIndex}`);
      } else {
        console.log(`Skipping completed chunk at index ${prevIndex}`);
      }
      
      prevIndex--;
    }
    
    // Check again if we've gone past the beginning
    if (prevIndex < 0) {
      console.log("No previous valid chunks found");
      return;
    }
    
    // Set the active index
    setSession(prev => ({ ...prev, activeChunkIndex: prevIndex }));
    
    // Then load questions for the previous chunk if needed
    const prevChunk = session.chunks[prevIndex];
    await loadQuestionsForChunk(prevChunk.id, prevChunk.text);
  };
  
  const setActiveChunkIndex = async (index: number) => {
    if (index < 0 || index >= session.chunks.length) return;
    
    // Check if the selected chunk is valid
    const selectedChunk = session.chunks[index];
    
    // Don't allow navigating to completed chunks
    if (selectedChunk.status === "completed") {
      console.log("Cannot navigate to completed chunk:", index);
      toast({
        title: "Navigation Restricted",
        description: "You cannot return to completed chunks. Please continue with your current chunk.",
        variant: "destructive"
      });
      return;
    }
    
    // Don't allow navigating to combined chunks
    if (selectedChunk.status === "combined") {
      console.log("Cannot navigate to combined chunk:", index);
      toast({
        title: "Combined Chunk",
        description: "This chunk has been combined with another. Please select a different chunk.",
        variant: "destructive"
      });
      return;
    }
    
    // Set the active index
    setSession(prev => ({ ...prev, activeChunkIndex: index }));
    
    // Then load questions for the selected chunk if needed
    await loadQuestionsForChunk(selectedChunk.id, selectedChunk.text);
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