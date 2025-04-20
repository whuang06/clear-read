import { Button } from "@/components/ui/button";
import { ChevronRight, PlusCircle, AlertCircle } from "lucide-react";
import { ReviewFeedback } from "@/types";
import { useReading } from "@/context/ReadingContext";

interface FeedbackPanelProps {
  feedback: ReviewFeedback;
  onContinue: () => void;
}

export function FeedbackPanel({ feedback, onContinue }: FeedbackPanelProps) {
  const { session } = useReading();
  const { performance, chunks, activeChunkIndex } = session;
  
  // Check if this is the last chunk
  const isLastChunk = activeChunkIndex === chunks.length - 1;
  
  // Convert rating from -200 to 200 scale to 0 to 100 scale
  const normalizedRating = ((feedback.rating + 200) / 400) * 100;
  const normalizedPerformance = ((performance + 200) / 400) * 100;
  
  // Determine performance change direction
  const isImproved = normalizedRating > normalizedPerformance;
  
  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Progress</h2>
        
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <AlertCircle className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="ml-3 flex-1">
              <h3 className="text-sm font-medium text-gray-900">Performance Analysis</h3>
              
              {/* Lexile Score Summary */}
              {feedback.elo_update && (
                <div className="mt-4 mb-3 py-3 px-4 bg-primary-50 rounded-lg border border-primary-100">
                  <h4 className="text-sm font-semibold text-gray-800 mb-2">Lexile Score Summary</h4>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <span className="text-xs text-gray-600">Previous:</span>
                      <span className="ml-1 font-medium text-gray-800">{feedback.elo_update.previousRating}L</span>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                      feedback.elo_update.change > 0 
                        ? 'bg-green-100 text-green-800' 
                        : feedback.elo_update.change < 0 
                          ? 'bg-red-100 text-red-800' 
                          : 'bg-gray-100 text-gray-800'
                    }`}>
                      {feedback.elo_update.change > 0 ? '+' : ''}{feedback.elo_update.change}L
                    </div>
                    <div>
                      <span className="text-xs text-gray-600">New:</span>
                      <span className="ml-1 font-medium text-gray-800">{feedback.elo_update.newRating}L</span>
                    </div>
                  </div>
                  <div className="mt-2 text-center">
                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
                      Reading Level: {feedback.elo_update.readingLevel}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="mt-2 text-sm text-gray-500">
                <p>{feedback.review}</p>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center">
                  <div className="text-xs font-medium text-gray-500 w-24">Previous score:</div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="bg-yellow-500 h-2" 
                          style={{ width: `${Math.round(normalizedPerformance)}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-gray-500">
                        {Math.round(normalizedPerformance)}
                      </span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center mt-1">
                  <div className="text-xs font-medium text-gray-500 w-24">Current score:</div>
                  <div className="flex-1">
                    <div className="flex items-center">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`${isImproved ? 'bg-secondary-500' : 'bg-red-500'} h-2`}
                          style={{ width: `${Math.round(normalizedRating)}%` }}
                        ></div>
                      </div>
                      <span className="ml-2 text-xs font-medium text-gray-500">
                        {Math.round(normalizedRating)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-between mt-4">
          <Button variant="outline" className="flex items-center">
            <PlusCircle className="mr-2 h-4 w-4" />
            Additional Resources
          </Button>
          <Button 
            onClick={onContinue} 
            className="flex items-center"
            variant={isLastChunk ? "default" : "default"}
          >
            {isLastChunk ? (
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
        </div>
      </div>
    </div>
  );
}
