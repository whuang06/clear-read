import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  chunkText,
  generateQuestions,
  assessDifficulty,
  reviewResponses,
  adaptChunk
} from "./python";

export async function registerRoutes(app: Express): Promise<Server> {
  // Process text route - chunks the input text
  app.post("/api/process-text", async (req, res) => {
    try {
      const { text } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (text.trim().length === 0) {
        return res.status(400).json({ message: "Text cannot be empty" });
      }
      
      // First, try to chunk the text
      let chunks;
      try {
        chunks = await chunkText(text);
        if (!chunks || chunks.length === 0) {
          return res.status(500).json({ message: "Failed to chunk text. Please try again with different content." });
        }
      } catch (chunkError: any) {
        console.error("Chunking error:", chunkError);
        return res.status(500).json({ 
          message: "Failed to chunk text. There might be an issue with the Chonkie API or the text format.", 
          error: chunkError.message 
        });
      }
      
      // Assess difficulty for each chunk
      for (let i = 0; i < chunks.length; i++) {
        try {
          const difficulty = await assessDifficulty(chunks[i].text);
          chunks[i].difficulty = difficulty;
        } catch (error) {
          console.error(`Failed to assess difficulty for chunk ${i}:`, error);
          // Set a default difficulty value
          chunks[i].difficulty = 1000; // Medium difficulty as fallback
        }
      }
      
      // Add ID and status to each chunk
      const processedChunks = chunks.map((chunk, index) => ({
        ...chunk,
        id: index + 1,
        status: index === 0 ? "active" : "pending"
      }));
      
      return res.json({ chunks: processedChunks });
    } catch (error: any) {
      console.error("Error processing text:", error);
      return res.status(500).json({ 
        message: "Failed to process your text. Please try again with different content.", 
        error: error.message 
      });
    }
  });
  
  // Generate questions for a chunk
  app.post("/api/generate-questions", async (req, res) => {
    try {
      const { chunkId, text } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (!chunkId) {
        return res.status(400).json({ message: "Chunk ID is required" });
      }
      
      const questionTexts = await generateQuestions(text);
      
      // Create question objects with IDs
      const questions = questionTexts.map((q, index) => ({
        id: (chunkId * 100) + index, // Create unique IDs by combining chunkId and question index
        text: q,
        chunkId
      }));
      
      return res.json({ questions });
    } catch (error: any) {
      console.error("Error generating questions:", error);
      return res.status(500).json({ 
        message: "Failed to generate questions", 
        error: error.message 
      });
    }
  });
  
  // Review user responses
  app.post("/api/review-responses", async (req, res) => {
    try {
      const { chunkId, text, questions, responses } = req.body;
      
      if (!chunkId || !text || !questions || !responses) {
        return res.status(400).json({ 
          message: "Missing required fields: chunkId, text, questions, responses" 
        });
      }
      
      if (!Array.isArray(questions) || !Array.isArray(responses)) {
        return res.status(400).json({ 
          message: "Questions and responses must be arrays" 
        });
      }
      
      // Format as expected by Python script
      const questionTexts = questions.map(q => typeof q === 'string' ? q : q.text);
      const responseTexts = responses.map(r => typeof r === 'string' ? r : r.response);
      
      const feedback = await reviewResponses(text, questionTexts, responseTexts);
      
      return res.json({ feedback });
    } catch (error: any) {
      console.error("Error reviewing responses:", error);
      return res.status(500).json({ 
        message: "Failed to review responses", 
        error: error.message 
      });
    }
  });
  
  // Adapt chunk based on performance
  app.post("/api/adapt-chunk", async (req, res) => {
    try {
      const { chunkId, text, rating } = req.body;
      
      if (!chunkId || !text || rating === undefined) {
        return res.status(400).json({ 
          message: "Missing required fields: chunkId, text, rating" 
        });
      }
      
      const { simplifiedText, factor } = await adaptChunk(text, rating);
      
      // If factor is 0, text wasn't simplified
      const isSimplified = factor > 0;
      
      return res.json({
        text: isSimplified ? simplifiedText : text,
        isSimplified,
        simplificationLevel: Math.round(factor * 100)
      });
    } catch (error: any) {
      console.error("Error adapting chunk:", error);
      return res.status(500).json({ 
        message: "Failed to adapt chunk", 
        error: error.message 
      });
    }
  });

  const httpServer = createServer(app);

  return httpServer;
}
