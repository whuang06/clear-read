import { useReading } from "@/context/ReadingContext";
import { CheckCircle2 } from "lucide-react";

const steps = [
  { id: "input", name: "Input Text" },
  { id: "processing", name: "Processing" },
  { id: "reading", name: "Reading" },
  { id: "complete", name: "Complete" }
];

export function ReadingWorkflow() {
  const { session } = useReading();
  const currentStep = session.status;
  
  return (
    <div className="mb-8">
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
