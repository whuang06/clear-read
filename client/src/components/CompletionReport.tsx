import { useState } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useReading } from "@/context/ReadingContext";
import { ReadingSession, ReviewFeedback } from "@/types";
import { ChevronRight, RefreshCcw, Trophy, BookOpen, BarChart4, PieChart } from "lucide-react";

export function CompletionReport() {
  const { session, resetSession, processText } = useReading();
  const { chunks, feedback, performance } = session;
  const [showDetails, setShowDetails] = useState(false);
  
  // Calculate overall performance metrics
  const totalChunks = chunks.length;
  const completedChunks = Object.keys(feedback).length;
  const averageRating = performance || 0;
  const normalizedScore = Math.round(((averageRating + 200) / 400) * 100); // Convert from -200 to 200 scale to 0-100
  
  // Format as a letter grade
  const getGrade = (score: number): string => {
    if (score >= 90) return "A";
    if (score >= 80) return "B";
    if (score >= 70) return "C";
    if (score >= 60) return "D";
    return "F";
  };
  
  // Get a performance message based on score
  const getPerformanceMessage = (score: number): string => {
    if (score >= 90) return "Outstanding comprehension! You've mastered this text.";
    if (score >= 80) return "Great work! You've shown strong understanding of the material.";
    if (score >= 70) return "Good job! You've demonstrated good comprehension of the text.";
    if (score >= 60) return "You've shown basic understanding. With a bit more practice, you can improve.";
    return "You seem to be having some difficulty with this text. Try reading it again with our adaptive help.";
  };
  
  // Handle restart with the same text
  const handleTryAgain = async () => {
    const originalText = session.originalText;
    resetSession();
    
    // Check if original text exists before proceeding
    if (originalText && originalText.trim().length > 0) {
      // Small timeout to ensure state reset is complete
      setTimeout(async () => {
        await processText(originalText);
      }, 50);
    }
  };
  
  // Calculate performance trend (did they improve over time?)
  const calculateTrend = () => {
    const ratings = Object.values(feedback).map((f: ReviewFeedback) => f.rating);
    if (ratings.length < 2) return "stable"; // Not enough data
    
    const firstHalf = ratings.slice(0, Math.floor(ratings.length / 2));
    const secondHalf = ratings.slice(Math.floor(ratings.length / 2));
    
    const firstAvg = firstHalf.reduce((sum, val) => sum + val, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((sum, val) => sum + val, 0) / secondHalf.length;
    
    if (secondAvg - firstAvg > 20) return "improving";
    if (firstAvg - secondAvg > 20) return "declining";
    return "stable";
  };
  
  const trend = calculateTrend();
  
  // Get visualization data
  const chartData = Object.entries(feedback).map(([chunkId, f]) => ({
    chunkId: parseInt(chunkId),
    rating: f.rating,
    normalizedRating: Math.round(((f.rating + 200) / 400) * 100)
  })).sort((a, b) => a.chunkId - b.chunkId);
  
  console.log("Performance chart data:", chartData);
  
  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      <Card className="shadow-lg border-primary/20">
        <CardHeader className="text-center bg-gradient-to-r from-primary-50 to-primary-100 rounded-t-lg pb-6">
          <div className="flex justify-center mb-4">
            <Trophy className="h-16 w-16 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold text-primary">Reading Completed!</CardTitle>
          <CardDescription className="text-lg">
            You've finished reading all {totalChunks} chunks of the text
          </CardDescription>
        </CardHeader>
        
        <CardContent className="pt-6 px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Overall Score */}
            <div className="flex flex-col items-center p-4 bg-primary-50 rounded-lg">
              <span className="font-semibold text-gray-600 mb-1">Overall Score</span>
              <div className="text-4xl font-bold text-primary flex items-center">
                {normalizedScore}
                <span className="text-2xl ml-1 text-primary-700">/100</span>
              </div>
              <div className="mt-2 text-sm font-medium px-2 py-1 rounded-full bg-primary-100 text-primary-800">
                Grade: {getGrade(normalizedScore)}
              </div>
            </div>
            
            {/* Comprehension */}
            <div className="flex flex-col items-center p-4 bg-secondary-50 rounded-lg">
              <span className="font-semibold text-gray-600 mb-1">Comprehension</span>
              <div className="flex items-center">
                <BookOpen className="h-8 w-8 text-secondary-600" />
                <span className="ml-2 text-xl font-semibold text-secondary-700">
                  {normalizedScore >= 80 ? "Strong" : 
                   normalizedScore >= 60 ? "Moderate" : "Needs Work"}
                </span>
              </div>
              <div className="mt-2 text-sm font-medium px-2 py-1 rounded-full bg-secondary-100 text-secondary-800">
                {trend === "improving" ? "Improving" : 
                 trend === "declining" ? "Declining" : "Stable"}
              </div>
            </div>
            
            {/* Progression */}
            <div className="flex flex-col items-center p-4 bg-green-50 rounded-lg">
              <span className="font-semibold text-gray-600 mb-1">Progression</span>
              <div className="text-4xl font-bold text-green-600">
                {completedChunks}/{totalChunks}
              </div>
              <div className="mt-2 text-sm font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
                100% Complete
              </div>
            </div>
          </div>
          
          {/* Performance Message */}
          <div className="bg-white p-5 rounded-lg border mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Performance Analysis</h3>
            <p className="text-gray-700 mb-3">{getPerformanceMessage(normalizedScore)}</p>
            
            {normalizedScore < 100 && (
              <p className="text-gray-600 italic">
                To improve your comprehension, focus on reading more carefully and answering questions with specific details from the text.
              </p>
            )}
          </div>
          
          {/* Chart visualization (simplified for implementation) */}
          <div className="bg-white p-5 rounded-lg border mb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Performance Chart</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowDetails(!showDetails)}>
                {showDetails ? "Hide Details" : "Show Details"}
              </Button>
            </div>
            
            {/* Simple bar chart representation */}
            <div className="relative h-64 w-full mb-8 px-4">
              {/* Grid lines */}
              <div className="absolute top-0 left-4 right-4 border-t border-gray-200 text-xs text-gray-400 -ml-2">100%</div>
              <div className="absolute top-1/4 left-4 right-4 border-t border-gray-200 text-xs text-gray-400 -ml-2">75%</div>
              <div className="absolute top-1/2 left-4 right-4 border-t border-gray-200 text-xs text-gray-400 -ml-2">50%</div>
              <div className="absolute top-3/4 left-4 right-4 border-t border-gray-200 text-xs text-gray-400 -ml-2">25%</div>
              
              {/* Bar container */}
              <div className="absolute bottom-0 left-0 right-0 flex justify-evenly items-end h-full">
                {chartData.length > 0 ? (
                  <>
                    {chartData.map((item) => (
                      <div key={item.chunkId} className="flex flex-col items-center" style={{ width: `${100 / Math.max(1, chartData.length)}%` }}>
                        <div 
                          className="w-12 rounded-t shadow-md transition-all duration-500" 
                          style={{ 
                            height: `${Math.max(10, item.normalizedRating)}%`,
                            backgroundColor: item.normalizedRating >= 80 ? '#10b981' : 
                                        item.normalizedRating >= 60 ? '#6366f1' : 
                                        item.normalizedRating >= 40 ? '#f59e0b' : '#ef4444'
                          }}
                        ></div>
                        <div className="text-xs mt-2 font-medium">#{item.chunkId}</div>
                        <div className="text-xs text-gray-500">{item.normalizedRating}%</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="w-full flex items-center justify-center h-3/4 text-gray-400">
                    No performance data available
                  </div>
                )}
              </div>
            </div>
            <div className="flex justify-between text-sm text-gray-600 mt-4 border-t pt-4">
              <span className="font-medium">First Chunk</span>
              <span className="font-medium">Last Chunk</span>
            </div>
          </div>
          
          {/* Detailed feedback */}
          {showDetails && (
            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-medium text-gray-900">Detailed Feedback</h3>
              {Object.entries(feedback).map(([chunkId, f]) => (
                <div key={chunkId} className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium">Chunk {chunkId}</h4>
                    <span 
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        f.rating >= 100 ? "bg-green-100 text-green-800" :
                        f.rating >= 0 ? "bg-blue-100 text-blue-800" :
                        "bg-yellow-100 text-yellow-800"
                      }`}
                    >
                      Score: {Math.round(((f.rating + 200) / 400) * 100)}
                    </span>
                  </div>
                  <p className="text-gray-700 text-sm">{f.review}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        <CardFooter className="flex justify-between pt-2 pb-6 px-8">
          {normalizedScore < 100 && (
            <Button onClick={handleTryAgain} variant="outline" className="flex items-center">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Try Again
            </Button>
          )}
          
          <Button className="ml-auto flex items-center" onClick={resetSession}>
            Start New Text
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}