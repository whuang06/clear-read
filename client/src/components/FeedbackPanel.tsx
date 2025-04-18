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
  const { performance } = session;
  
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
          <Button onClick={onContinue} className="flex items-center">
            Continue to Next Chunk
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
