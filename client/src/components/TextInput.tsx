import { useState } from "react";
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

interface TextInputProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TextInput({ open, onOpenChange }: TextInputProps) {
  const [inputText, setInputText] = useState("");
  const { processText } = useReading();
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      toast({
        title: "Empty Text",
        description: "Please enter some text to process.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      await processText(inputText);
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Processing Error",
        description: "Failed to process your text. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>Start a New Reading</DialogTitle>
          <DialogDescription>
            Paste or type the text you want to analyze. Clear Read will break it into meaningful chunks and guide you through comprehension exercises.
          </DialogDescription>
        </DialogHeader>
        
        <Textarea
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Paste your text here..."
          className="min-h-[200px]"
        />
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit}>
            Process Text
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
