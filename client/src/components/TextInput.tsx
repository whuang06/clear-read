import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useReading } from "@/context/ReadingContext";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

interface TextInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TextInput({ open, onOpenChange }: TextInputProps) {
  const [inputText, setInputText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { processText, session } = useReading();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  
  // Effect to monitor session changes and navigate to reading page when processing is complete
  useEffect(() => {
    if (isLoading && session.status === "reading" && session.chunks.length > 0) {
      console.log("Session transition detected via effect - closing dialog and navigating to reading page");
      setIsLoading(false);
      onOpenChange(false);
      // Navigate directly to the reading page
      setLocation("/reading");
    }
  }, [session.status, session.chunks.length, isLoading, onOpenChange, setLocation]);

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to process.");
      return;
    }
    
    // Reset error state and show loading
    setError(null);
    setIsLoading(true);
    
    try {
      console.log("TextInput: Starting text processing with length:", inputText.length);
      
      // Clear the session first before processing
      try {
        await processText(inputText);
        console.log("TextInput: Successfully called processText API");
      } catch (processError: any) {
        console.error("TextInput: Error during processText:", processError);
        throw processError; // Re-throw to be caught by outer catch
      }
      
      // After calling processText, close the dialog as the text has been processed
      // The effect will handle the transition to reading state
      console.log("TextInput: Process text API call complete. Setting loading to false and continuing");
      
      // Give a short wait to ensure state is updated
      setTimeout(() => {
        if (session.status === "reading" && session.chunks.length > 0) {
          console.log("TextInput: Processing successful, closing dialog and navigating to reading page");
          setIsLoading(false);
          onOpenChange(false);
          // Navigate directly to the reading page
          setLocation("/reading");
        } else {
          console.log("TextInput: Processing appears complete but needs further verification");
          // State will be checked by the effect 
          // The state update in ReadingContext will eventually trigger the effect
        }
      }, 500);
    } catch (err: any) {
      console.error("Error in TextInput handleSubmit:", err);
      setIsLoading(false);
      setError(err.message || "Failed to process your text. Please try again.");
      toast({
        title: "Processing Error",
        description: "There was a problem processing your text. Please check the error message for details.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      // Only allow closing if not currently loading
      if (!isLoading || !newOpen) {
        setError(null); // Clear any previous errors
        onOpenChange(newOpen);
      }
    }}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Start a New Reading</DialogTitle>
          <DialogDescription>
            Paste or type the text you want to analyze. Clear Read will break it into meaningful chunks and guide you through comprehension exercises.
          </DialogDescription>
        </DialogHeader>
        
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste your text here... (Minimum 100 characters recommended for proper chunking)"
          className="min-h-[200px]"
          disabled={isLoading}
        />
        
        <DialogFooter className="flex items-center justify-between space-x-2">
          <div className="text-sm text-muted-foreground">
            {inputText.length > 0 && (
              <span>{inputText.length} characters</span>
            )}
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Process Text"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
