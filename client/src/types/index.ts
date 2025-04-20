export interface Sentence {
  text: string;
  start_index: number;
  end_index: number;
  token_count: number;
  embedding?: number[];
}

export interface Chunk {
  id: number;
  text: string;
  start_index: number;
  end_index: number;
  token_count: number;
  difficulty?: number;
  sentences: Sentence[];
  isSimplified?: boolean;
  simplificationLevel?: number;
  isCombined?: boolean;
  isCombinedInto?: number;
  status: "pending" | "active" | "completed" | "combined";
}

export interface Question {
  id: number;
  text: string;
  chunkId: number;
}

export interface UserResponse {
  questionId: number;
  text: string;
}

export interface ReviewFeedback {
  review: string;
  rating: number;
}

export interface PerformanceData {
  chunkId: number;
  rating: number;
  review: string;
}

export type ReadingStatus = "input" | "processing" | "reading" | "complete";

export interface ReadingSession {
  id?: string;
  originalText: string;
  chunks: Chunk[];
  questions: Record<number, Question[]>;
  responses: Record<number, UserResponse[]>;
  feedback: Record<number, ReviewFeedback>;
  performance: number;
  activeChunkIndex: number;
  status: ReadingStatus;
}
