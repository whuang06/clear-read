import React from 'react';
import { ReviewFeedback } from '@/types';

interface LexileDisplayProps {
  feedback?: ReviewFeedback;
}

// This component will display the Lexile score at the bottom of passages
export function LexileDisplay({ feedback }: LexileDisplayProps) {
  if (!feedback) return null;
  
  return (
    <div className="mt-4 border-t pt-3 text-right">
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium bg-primary-100 text-primary-800">
        Score: {Math.round(((feedback.rating + 200) / 400) * 100)}%
      </span>
      
      {feedback.elo_update && (
        <span className={`ml-2 inline-flex items-center px-2.5 py-1 rounded-full text-sm font-medium ${
          feedback.elo_update.change > 0 
            ? 'bg-green-100 text-green-800' 
            : feedback.elo_update.change < 0 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-800'
        }`}>
          Lexile: {feedback.elo_update.change > 0 ? '+' : ''}{feedback.elo_update.change}L
        </span>
      )}
    </div>
  );
}

// This component will display a more detailed Lexile score summary in feedback panel
export function LexileSummary({ feedback }: LexileDisplayProps) {
  if (!feedback?.elo_update) return null;
  
  return (
    <div className="mt-4 mb-3 py-3 px-4 bg-primary-50 rounded-lg border border-primary-100">
      <h4 className="text-sm font-semibold text-gray-800 mb-2">Lexile Score Summary</h4>
      <div className="flex items-center justify-between mb-2">
        <div>
          <span className="text-xs text-gray-600">Previous:</span>
          <span className="ml-1 font-medium text-gray-800">{feedback.elo_update.previousRating}L</span>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
          feedback.elo_update.change > 0 
            ? 'bg-green-100 text-green-800' 
            : feedback.elo_update.change < 0 
              ? 'bg-red-100 text-red-800' 
              : 'bg-gray-100 text-gray-800'
        }`}>
          {feedback.elo_update.change > 0 ? '+' : ''}{feedback.elo_update.change}L
        </div>
        <div>
          <span className="text-xs text-gray-600">New:</span>
          <span className="ml-1 font-medium text-gray-800">{feedback.elo_update.newRating}L</span>
        </div>
      </div>
      <div className="mt-2 text-center">
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-700">
          Reading Level: {feedback.elo_update.readingLevel}
        </span>
      </div>
    </div>
  );
}