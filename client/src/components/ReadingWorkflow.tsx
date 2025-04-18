import { useReading } from "@/context/ReadingContext";
import { CheckCircle2, Award } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const steps = [
  { id: "input", name: "Input Text" },
  { id: "processing", name: "Processing" },
  { id: "reading", name: "Reading" },
  { id: "complete", name: "Complete" }
];

export function ReadingWorkflow() {
  const { session } = useReading();
  const currentStep = session.status;
  
  // Calculate reading progress for progress bar
  const totalChunks = session.chunks.length;
  const completedChunks = session.chunks.filter(chunk => chunk.status === "completed").length;
  const activeChunks = session.chunks.filter(chunk => chunk.status === "active").length;
  
  // Calculate progress percentage (completed chunks + half credit for active chunks)
  const progressPercentage = totalChunks > 0 
    ? Math.min(100, Math.round(((completedChunks + (activeChunks * 0.5)) / totalChunks) * 100)) 
    : 0;
  
  // Calculate average performance score 
  const feedbackEntries = Object.values(session.feedback);
  const averagePerformance = feedbackEntries.length > 0
    ? Math.round(feedbackEntries.reduce((sum, fb) => sum + fb.rating, 0) / feedbackEntries.length)
    : 0;
  
  // Normalize performance score to 0-100 range for display
  const normalizedPerformance = Math.max(0, Math.min(100, Math.round((averagePerformance + 200) / 4)));
  
  return (
    <div className="mb-8 space-y-6">
      {/* Main workflow steps */}
      <nav aria-label="Progress" className="hidden sm:block">
        <ol role="list" className="flex items-center">
          {steps.map((step, stepIdx) => {
            const isActive = step.id === currentStep;
            const isComplete = getStepStatus(step.id, currentStep) === "complete";
            const isUpcoming = getStepStatus(step.id, currentStep) === "upcoming";
            
            return (
              <li key={step.id} className={`relative ${stepIdx !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                {stepIdx !== steps.length - 1 && (
                  <div className="absolute inset-0 flex items-center" aria-hidden="true">
                    <div className={`h-0.5 w-full ${isComplete || isActive ? 'bg-primary-500' : 'bg-gray-200'}`}></div>
                  </div>
                )}
                
                <div className="relative flex">
                  {isComplete ? (
                    <a 
                      href="#" 
                      className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 hover:bg-primary-600"
                      onClick={(e) => e.preventDefault()}
                    >
                      <CheckCircle2 className="h-5 w-5 text-white" />
                      <span className="sr-only">{step.name}</span>
                    </a>
                  ) : isActive ? (
                    <a
                      href="#"
                      className="relative flex h-8 w-8 items-center justify-center rounded-full bg-primary-500 hover:bg-primary-600 ring-2 ring-primary-600"
                      aria-current="step"
                      onClick={(e) => e.preventDefault()}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-white" aria-hidden="true"></span>
                      <span className="sr-only">{step.name}</span>
                    </a>
                  ) : (
                    <a
                      href="#"
                      className="group relative flex h-8 w-8 items-center justify-center rounded-full border-2 border-gray-300 bg-white hover:border-gray-400"
                      onClick={(e) => e.preventDefault()}
                    >
                      <span 
                        className="h-2.5 w-2.5 rounded-full bg-transparent group-hover:bg-gray-300" 
                        aria-hidden="true"
                      ></span>
                      <span className="sr-only">{step.name}</span>
                    </a>
                  )}
                </div>
                
                <span 
                  className={`absolute top-10 left-0 text-sm ${
                    isActive 
                      ? 'font-medium text-primary-600' 
                      : isComplete 
                        ? 'text-gray-900' 
                        : 'text-gray-500'
                  }`}
                >
                  {step.name}
                </span>
              </li>
            );
          })}
        </ol>
      </nav>
      
      {/* Reading progress section - only visible during reading or completion */}
      {(currentStep === "reading" || currentStep === "complete") && totalChunks > 0 && (
        <div className="mt-6 space-y-3">
          <div className="flex justify-between items-center">
            <div className="text-sm font-medium">Reading Progress</div>
            <div className="text-sm font-medium">{progressPercentage}%</div>
          </div>
          <Progress value={progressPercentage} className="h-2" />
          
          {/* Live performance metrics */}
          {feedbackEntries.length > 0 && (
            <div className="flex justify-between items-center mt-4 pt-2 border-t">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-primary-500" />
                <span className="text-sm font-medium">Performance</span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  normalizedPerformance >= 70 ? 'bg-green-100 text-green-700' :
                  normalizedPerformance >= 40 ? 'bg-yellow-100 text-yellow-700' :
                  'bg-red-100 text-red-700'
                }`}>
                  {normalizedPerformance}/100
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function getStepStatus(stepId: string, currentStatus: string): "complete" | "active" | "upcoming" {
  const stepOrder = ["input", "processing", "reading", "complete"];
  const stepIndex = stepOrder.indexOf(stepId);
  const currentIndex = stepOrder.indexOf(currentStatus);
  
  if (stepIndex < currentIndex) return "complete";
  if (stepIndex === currentIndex) return "active";
  return "upcoming";
}
