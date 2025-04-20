import { ReviewFeedback } from '@/types';

interface LexileDisplayProps {
  feedback?: ReviewFeedback;
}

// Simple version that just displays the score
export function LexileDisplay({ feedback }: LexileDisplayProps) {
  if (!feedback) return null;
  
  return (
    <div className="mt-4 border-t pt-3 text-right">
      {feedback.elo_update && (
        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
          Lexile: {feedback.elo_update.newRating}L
        </span>
      )}
    </div>
  );
}

// Simple version that just displays the summary
export function LexileSummary({ feedback }: LexileDisplayProps) {
  if (!feedback?.elo_update) return null;
  
  return (
    <div className="mt-2 mb-2">
      <div className="text-sm">
        <strong>Lexile Score:</strong> {feedback.elo_update.previousRating}L → {feedback.elo_update.newRating}L 
        ({feedback.elo_update.change > 0 ? '+' : ''}{feedback.elo_update.change}L)
      </div>
      <div className="text-sm">
        <strong>Reading Level:</strong> {feedback.elo_update.readingLevel}
      </div>
    </div>
  );
}