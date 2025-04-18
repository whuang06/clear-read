import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ChevronLeft, ChevronRight, Zap, Loader2 } from "lucide-react";
import { useReading } from "@/context/ReadingContext";
import { FeedbackPanel } from "./FeedbackPanel";
import { Question, UserResponse, Chunk } from "@/types";
import { useToast } from "@/hooks/use-toast";

export function ChunkReader() {
  const { session, submitAnswers, moveToNextChunk, moveToPreviousChunk } = useReading();
  const { chunks, activeChunkIndex, questions, responses, feedback } = session;
  
  const [userResponses, setUserResponses] = useState<UserResponse[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const questionRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const activeChunk = chunks[activeChunkIndex];
  const activeQuestions = questions[activeChunk?.id] || [];
  const activeFeedback = feedback[activeChunk?.id];
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);
  
  // Initialize responses when chunk changes
  useEffect(() => {
    if (!activeChunk) return;
    
    const chunkId = activeChunk.id;
    
    // Check if questions need to be loaded for this chunk
    const existingQuestions = questions[chunkId];
    if (!existingQuestions || existingQuestions.length === 0) {
      // This will be handled by the dynamic question loading in ReadingContext
      setIsLoadingQuestions(true);
    } else {
      setIsLoadingQuestions(false);
    }
    
    // Initialize responses 
    if (activeQuestions.length > 0) {
      const existingResponses = responses[chunkId] || [];
      
      if (existingResponses.length > 0) {
        setUserResponses(existingResponses);
        setShowFeedback(!!activeFeedback);
      } else {
        // Initialize empty responses for each question
        setUserResponses(
          activeQuestions.map(q => ({ questionId: q.id, text: "" }))
        );
        setShowFeedback(false);
      }
    }
  }, [activeChunk?.id, activeQuestions, responses, feedback, questions]);
  
  // Update loading state when questions change
  useEffect(() => {
    if (activeChunk && questions[activeChunk.id]?.length > 0) {
      setIsLoadingQuestions(false);
    }
  }, [activeChunk, questions]);

  if (!activeChunk) return <div>No active chunk to display</div>;

  const handleResponseChange = (questionId: number, text: string) => {
    setUserResponses(prev => 
      prev.map(r => r.questionId === questionId ? { ...r, text } : r)
    );
  };
  
  const handleSubmitAnswers = async () => {
    // Check if all questions have answers
    const emptyResponses = userResponses.filter(r => !r.text.trim());
    if (emptyResponses.length > 0) {
      toast({
        title: "Missing Answers",
        description: "Please answer all questions before submitting.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await submitAnswers(activeChunk.id, userResponses);
      setShowFeedback(true);
      toast({
        title: "Answers Submitted",
        description: "Your answers have been processed successfully.",
      });
    } catch (error) {
      toast({
        title: "Submission Error",
        description: "Failed to submit your answers. Please try again.",
        variant: "destructive",
      });
    }
  };
  
  const handleMoveToQuestions = () => {
    questionRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="lg:col-span-2 space-y-6">
      {/* Current chunk reading area */}
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Current Passage</h2>
            <div className="flex items-center space-x-2">
              <>
                <span className="text-sm text-gray-500">Difficulty:</span>
                {activeChunk.difficulty !== undefined ? (
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    getDifficultyColor(activeChunk.difficulty)
                  }`}>
                    {getDifficultyLabel(activeChunk.difficulty)}
                  </span>
                ) : (
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                    Unknown
                  </span>
                )}
              </>
              
              {/* Simplified text indicator */}
              {activeChunk.isSimplified && (
                <div className="ml-2 bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-medium inline-flex items-center">
                  <Zap className="w-4 h-4 mr-1" />
                  Simplified ({Math.round(activeChunk.simplificationLevel || 0)}%)
                </div>
              )}
            </div>
          </div>
          
          <div className="prose prose-slate prose-lg max-w-none font-serif">
            <p className="leading-relaxed">
              {activeChunk.text}
            </p>
          </div>
          
          <div className="mt-4 flex justify-between">
            <Button 
              variant="outline" 
              size="sm"
              onClick={moveToPreviousChunk}
              disabled={activeChunkIndex === 0}
              className="flex items-center"
            >
              <ChevronLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            <Button 
              size="sm"
              onClick={handleMoveToQuestions}
              className="flex items-center"
            >
              Answer Questions
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      
      {/* Questions for current chunk */}
      <div className="bg-white shadow rounded-lg overflow-hidden" ref={questionRef}>
        <div className="p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Comprehension Questions</h2>
          
          {isLoadingQuestions ? (
            <div className="py-8 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
              <p className="text-sm text-muted-foreground">Generating questions based on your performance...</p>
            </div>
          ) : (
            <div className="space-y-6">
              {activeQuestions.length === 0 ? (
                <div className="border border-dashed border-gray-200 rounded-md p-6 text-center">
                  <p className="text-muted-foreground">No questions available for this chunk yet.</p>
                </div>
              ) : (
                <>
                  {activeQuestions.map((question, index) => (
                    <div key={question.id} className="border border-gray-200 rounded-md p-4">
                      <h3 className="text-base font-medium text-gray-900 mb-2">
                        {index + 1}. {question.text}
                      </h3>
                      <div className="mb-4">
                        <Textarea 
                          rows={3}
                          placeholder="Type your answer here..."
                          value={userResponses.find(r => r.questionId === question.id)?.text || ""}
                          onChange={(e) => handleResponseChange(question.id, e.target.value)}
                          disabled={showFeedback}
                          className="shadow-sm block w-full focus:ring-primary-500 focus:border-primary-500 sm:text-sm border border-gray-300 rounded-md"
                        />
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-end space-x-3 mt-6">
                    {!showFeedback ? (
                      <Button onClick={handleSubmitAnswers} disabled={activeQuestions.length === 0}>
                        Submit Answers
                      </Button>
                    ) : (
                      <Button onClick={moveToNextChunk}>
                        {activeChunkIndex === chunks.length - 1 ? (
                          <>
                            Finish Reading
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </>
                        ) : (
                          <>
                            Continue to Next Chunk
                            <ChevronRight className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Feedback from answers */}
      {showFeedback && activeFeedback && (
        <FeedbackPanel feedback={activeFeedback} onContinue={moveToNextChunk} />
      )}
    </div>
  );
}

// Helper functions
function getDifficultyColor(difficulty: number): string {
  if (difficulty >= 1500) return "bg-red-100 text-red-800";
  if (difficulty >= 1200) return "bg-yellow-100 text-yellow-800";
  if (difficulty >= 800) return "bg-blue-100 text-blue-800";
  if (difficulty >= 400) return "bg-green-100 text-green-800";
  return "bg-gray-100 text-gray-800";
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty >= 1500) return "Very High";
  if (difficulty >= 1200) return "High";
  if (difficulty >= 800) return "Medium";
  if (difficulty >= 400) return "Low";
  return "Very Low";
}
