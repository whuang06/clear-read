import { useReading } from "@/context/ReadingContext";

export function ChunkNavigation() {
  const { session, setActiveChunkIndex } = useReading();
  const { chunks, activeChunkIndex, performance } = session;
  
  // Calculate progress percentage
  const progressPercentage = chunks.length > 0 
    ? ((activeChunkIndex + 1) / chunks.length) * 100 
    : 0;
    
  // Estimate time left (assuming about 2 minutes per chunk)
  const chunksLeft = chunks.length - (activeChunkIndex + 1);
  const minutesLeft = chunksLeft * 2;
  
  return (
    <aside className="lg:col-span-1">
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Reading Progress</h2>
          <div className="mt-2 w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-primary-500 h-2.5 rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
          <div className="mt-2 flex justify-between text-sm text-gray-500">
            <span>
              Chunk {activeChunkIndex + 1} of {chunks.length}
            </span>
            <span>
              {minutesLeft > 0 ? `${minutesLeft} minutes left` : "Almost done"}
            </span>
          </div>
        </div>
        
        <div className="p-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-900">Performance</h3>
          <div className="mt-2 flex items-center">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="bg-secondary-500 h-2" 
                style={{ width: `${normalizePerformance(performance)}%` }}
              ></div>
            </div>
            <span className="ml-2 text-sm font-medium text-secondary-700">
              {Math.round(normalizePerformance(performance))}
            </span>
          </div>
        </div>
        
        <nav className="divide-y divide-gray-200 overflow-y-auto max-h-96">
          {chunks.map((chunk, index) => {
            const isActive = index === activeChunkIndex;
            const isCompleted = index < activeChunkIndex;
            const isPending = index > activeChunkIndex;
            
            return (
              <button 
                key={chunk.id}
                onClick={() => chunk.status !== "completed" ? setActiveChunkIndex(index) : null}
                className={`block w-full text-left ${chunk.status !== "completed" ? "hover:bg-gray-50" : "opacity-75 cursor-not-allowed"} transition-colors ${
                  isActive ? "bg-gray-50 hover:bg-gray-100" : ""
                }`}
              >
                <div className="p-4 flex items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center">
                      <div 
                        className={`h-6 w-6 flex items-center justify-center rounded-full mr-3 text-sm font-medium ${
                          isActive
                            ? "bg-primary-500 text-white"
                            : isCompleted
                              ? "bg-primary-100 text-primary-700"
                              : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {index + 1}
                      </div>
                      <p className="truncate text-sm font-medium text-gray-900">
                        {getChunkTitle(chunk.text)}
                      </p>
                    </div>
                    <div className="mt-1 flex items-center">
                      <span 
                        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                          isActive
                            ? "bg-yellow-100 text-yellow-800"
                            : isCompleted
                              ? "bg-green-100 text-green-800"
                              : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        <svg className="mr-1.5 h-2 w-2 text-gray-400" fill="currentColor" viewBox="0 0 8 8">
                          <circle cx="4" cy="4" r="3" />
                        </svg>
                        {isActive ? "In Progress" : isCompleted ? "Completed" : "Pending"}
                      </span>
                      <span className="inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        Difficulty: {chunk.difficulty !== undefined 
                          ? getDifficultyLabel(chunk.difficulty)
                          : "Unknown"}
                      </span>
                      
                      {/* Simplification level badge */}
                      {index === 0 || chunk.simplificationLevel !== undefined ? (
                        <span className={`inline-flex items-center ml-2 px-2 py-0.5 rounded text-xs font-medium ${
                          !chunk.simplificationLevel ? "bg-green-50 text-green-700" :
                          chunk.simplificationLevel <= 20 ? "bg-blue-50 text-blue-700" :
                          chunk.simplificationLevel <= 40 ? "bg-indigo-50 text-indigo-700" :
                          chunk.simplificationLevel <= 60 ? "bg-purple-50 text-purple-700" :
                          "bg-fuchsia-50 text-fuchsia-700"
                        }`}>
                          {chunk.simplificationLevel 
                            ? `${Math.round(chunk.simplificationLevel / 10) * 10}%` 
                            : "0%"
                          }
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <svg className="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
                    <path 
                      fillRule="evenodd" 
                      d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" 
                      clipRule="evenodd" 
                    />
                  </svg>
                </div>
              </button>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

// Helper functions
function getChunkTitle(text: string): string {
  // Get first few words as title, up to 30 chars
  const title = text.split(/\s+/).slice(0, 5).join(" ");
  return title.length > 30 ? title.substring(0, 30) + "..." : title;
}

function getDifficultyLabel(difficulty: number): string {
  if (difficulty >= 1500) return "Very High";
  if (difficulty >= 1200) return "High";
  if (difficulty >= 800) return "Medium";
  if (difficulty >= 400) return "Low";
  return "Very Low";
}

function normalizePerformance(rating: number): number {
  // Convert from -200 to 200 scale to 0 to 100 scale
  return ((rating + 200) / 400) * 100;
}
