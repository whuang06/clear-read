import { useState, useEffect } from "react";
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
  
  // Effect to monitor session changes and close dialog when in reading state
  useEffect(() => {
    if (isLoading && session.status === "reading" && session.chunks.length > 0) {
      console.log("Session transition detected via effect - closing dialog");
      setIsLoading(false);
      onOpenChange(false);
    }
  }, [session.status, session.chunks.length, isLoading, onOpenChange]);

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      setError("Please enter some text to process.");
      return;
    }
    
    // Reset error state and show loading
    setError(null);
    setIsLoading(true);
    
    try {
      await processText(inputText);
      
      // After successful processing, update UI and check state
      console.log("Process text complete, checking session status:", session.status, "with", session.chunks.length, "chunks");
      
      // For more reliable state checking, use a listener approach with multiple attempts
      let attempts = 0;
      const maxAttempts = 10;
      const checkInterval = 500; // ms
      
      const checkSessionState = () => {
        attempts++;
        console.log(`Check attempt ${attempts}:`, session.status, session.chunks.length);
        
        if (session.status === "reading" && session.chunks.length > 0) {
          // Success! Close the dialog
          console.log("Text processed successfully, now in reading state with chunks");
          setIsLoading(false);
          onOpenChange(false);
        } else if (attempts < maxAttempts) {
          // Try again after a short delay
          setTimeout(checkSessionState, checkInterval);
        } else {
          // Give up after max attempts
          console.error("Failed to transition to reading state after", attempts, "attempts");
          setIsLoading(false);
          setError("The text was processed but there was a problem displaying it. Please try again.");
          toast({
            title: "Display Error",
            description: "There was a problem displaying your processed text. Please try again.",
            variant: "destructive",
          });
        }
      };
      
      // Start checking
      checkSessionState();
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
