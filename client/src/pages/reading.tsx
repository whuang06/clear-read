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
  
  // Show input modal if no content
  useEffect(() => {
    if (!hasContent) {
      setTextInputOpen(true);
    }
  }, [hasContent]);
  
  // Handle modal close without input
  const handleModalOpenChange = (open: boolean) => {
    setTextInputOpen(open);
    if (!open && !hasContent) {
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
