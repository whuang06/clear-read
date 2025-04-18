import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ReadingWorkflow } from "@/components/ReadingWorkflow";
import { ChunkNavigation } from "@/components/ChunkNavigation";
import { ChunkReader } from "@/components/ChunkReader";
import { useReading } from "@/context/ReadingContext";
import { TextInput } from "@/components/TextInput";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

export default function Reading() {
  const [textInputOpen, setTextInputOpen] = useState(false);
  const { session, resetSession } = useReading();
  const { toast } = useToast();
  const [_, setLocation] = useLocation();

  // Check if we have content to show
  const hasContent = session.chunks.length > 0;
  const isProcessing = session.status === "processing";
  const isReading = session.status === "reading";
  
  // Show input modal if no content and not currently processing
  useEffect(() => {
    if (!hasContent && !isProcessing) {
      setTextInputOpen(true);
    } else if (isReading && textInputOpen) {
      // If we're in reading state but modal is still open, close it
      setTextInputOpen(false);
    }
  }, [hasContent, isProcessing, isReading, textInputOpen]);
  
  // Handle modal close without input
  const handleModalOpenChange = (open: boolean) => {
    // If we're in processing state, don't allow closing the modal
    if (isProcessing && !open) {
      return;
    }
    
    // If we're already in reading state, allow closing the modal
    if (isReading) {
      setTextInputOpen(open);
      return;
    }
    
    setTextInputOpen(open);
    
    // Only redirect to home if the user explicitly closed the modal without content
    // AND we're not in processing or reading state
    if (!open && !hasContent && !isProcessing && !isReading) {
      toast({
        title: "No Content Provided",
        description: "Redirecting to home page.",
      });
      resetSession();
      setLocation("/");
    }
  };

  return (
    <>
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <ReadingWorkflow />
        
        {hasContent && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <ChunkNavigation />
            <ChunkReader />
          </div>
        )}
        
        <TextInput 
          open={textInputOpen} 
          onOpenChange={handleModalOpenChange} 
        />
      </main>
    </>
  );
}
