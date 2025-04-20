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
      
      // Only assess difficulty for the first chunk and mark it with simplification data
      try {
        if (chunks.length > 0) {
          const firstChunkDifficulty = await assessDifficulty(chunks[0].text);
          chunks[0].difficulty = firstChunkDifficulty;
          console.log(`First chunk difficulty: ${firstChunkDifficulty}`);
          
          // Add simplification data to first chunk (0% simplified)
          chunks[0].isSimplified = false;
          chunks[0].simplificationLevel = 0;
        }
      } catch (error) {
        console.error(`Failed to assess difficulty for first chunk:`, error);
        // Continue without setting difficulty
      }
      
      // Add ID, status, and simplified data to each chunk
      const processedChunks = chunks.map((chunk, index) => ({
        ...chunk,
        id: index + 1,
        status: index === 0 ? "active" : "pending",
        // Ensure that only the first chunk has a difficulty value
        difficulty: index === 0 ? chunk.difficulty : undefined,
        // Add simplification data to all chunks
        isSimplified: index === 0 ? false : undefined,
        simplificationLevel: index === 0 ? 0 : undefined
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
  
  // Generate questions for a chunk and assess difficulty if needed
  app.post("/api/generate-questions", async (req, res) => {
    try {
      const { chunkId, text, assessDifficultyNeeded = true } = req.body;
      
      if (!text || typeof text !== "string") {
        return res.status(400).json({ message: "Text is required" });
      }
      
      if (!chunkId) {
        return res.status(400).json({ message: "Chunk ID is required" });
      }
      
      // Initialize variables for questions and difficulty
      let questions;
      let difficulty;
      
      // Start the difficulty assessment in parallel if needed
      const difficultyPromise = assessDifficultyNeeded 
        ? assessDifficulty(text).catch(err => {
            console.error(`Error assessing difficulty for chunk ${chunkId}:`, err);
            return undefined; // Continue even if difficulty assessment fails
          })
        : Promise.resolve(undefined);
      
      // Generate questions
      try {
        // Try to generate questions via the API
        const questionTexts = await generateQuestions(text);
        
        // Check if we got valid questions back
        if (Array.isArray(questionTexts) && questionTexts.length > 0) {
          // Clean up question texts to remove JSON formatting, backticks, and brackets
          const cleanedQuestions = questionTexts.map(q => {
            // Remove any backticks, brackets, and "json" text
            let cleaned = q.replace(/```json|```|^\[|\]$/g, '').trim();
            
            // Remove any quotes at the beginning and end
            cleaned = cleaned.replace(/^["']|["'],?$/g, '').trim();
            
            return cleaned;
          }).filter(q => q.length > 0); // Remove any empty questions
          
          // Use cleaned questions if we have any, otherwise throw
          if (cleanedQuestions.length > 0) {
            // Create question objects with IDs
            questions = cleanedQuestions.map((q, index) => ({
              id: (chunkId * 100) + index, // Create unique IDs by combining chunkId and question index
              text: q,
              chunkId
            }));
          } else {
            throw new Error("No valid questions after cleaning");
          }
        } else {
          throw new Error("Generated questions array is empty");
        }
      } catch (apiError) {
        console.warn(`API error or empty results when generating questions for chunk ${chunkId}:`, apiError);
        
        // Default questions if the API fails or returns empty results
        questions = [
          { id: chunkId * 100, text: "What is the main idea of this passage?", chunkId },
          { id: chunkId * 100 + 1, text: "What did you find most interesting about this text?", chunkId },
          { id: chunkId * 100 + 2, text: "How does this information connect to other knowledge you have?", chunkId }
        ];
        
        console.log(`Using default questions for chunk ${chunkId}`);
      }
      
      // Wait for difficulty assessment to complete
      if (assessDifficultyNeeded) {
        difficulty = await difficultyPromise;
        if (difficulty !== undefined) {
          console.log(`Assessed difficulty for chunk ${chunkId}: ${difficulty}`);
        }
      }
      
      return res.json({ 
        questions,
        difficulty
      });
    } catch (error: any) {
      console.error("Error in question generation route:", error);
      
      const { chunkId } = req.body; // Extract chunkId again from request body
      
      // Even if there's an error, send back default questions to prevent the frontend from hanging
      const defaultQuestions = [
        { id: chunkId * 100, text: "What is the main idea of this passage?", chunkId },
        { id: chunkId * 100 + 1, text: "What did you find most interesting about this text?", chunkId }
      ];
      
      return res.json({ 
        questions: defaultQuestions,
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
      
      console.log(`Adaptive reader processing chunk ${chunkId} with user performance rating: ${rating}`);
      
      // Get difficulty of original chunk first to record it
      let originalDifficulty;
      try {
        originalDifficulty = await assessDifficulty(text);
        console.log(`Original chunk difficulty: ${originalDifficulty}`);
      } catch (difficultyError) {
        console.error("Error assessing original difficulty:", difficultyError);
        // Continue with adaptation even if difficulty assessment fails
      }
      
      // Check if this is the first chunk
      const isFirstChunk = chunkId === 1;
      
      // DIRECT APPROACH FOR NEGATIVE RATINGS
      if (!isFirstChunk && rating < 0) {
        console.log(`*** DIRECT APPROACH FOR NEGATIVE RATINGS (${rating}) ***`);
        
        // Bypass all the complex logic and directly determine simplification level based on rating
        let simplificationFactor;
        if (rating <= -150) {
          simplificationFactor = 0.4; // 40% for very negative
          console.log(`*** Very negative rating (${rating}): Using 40% simplification ***`);
        } else if (rating <= -100) {
          simplificationFactor = 0.3; // 30% for moderately negative
          console.log(`*** Moderately negative rating (${rating}): Using 30% simplification ***`);
        } else {
          simplificationFactor = 0.2; // 20% for slightly negative
          console.log(`*** Slightly negative rating (${rating}): Using 20% simplification ***`);
        }
        
        // Use the Python script to do the text simplification directly
        const adaptiveReader = new AdaptiveReader();
        const simplifiedText = await adaptiveReader.simplifyText(text, simplificationFactor);
        
        // Log what happened
        console.log(`Direct simplification: Factor=${simplificationFactor}, Simplified=${simplifiedText !== text}`);
        console.log(`Original preview: "${text.substring(0, 30)}..."`);
        console.log(`Simplified preview: "${simplifiedText.substring(0, 30)}..."`);
        
        // Assess difficulty of simplified text
        let newDifficulty = originalDifficulty;
        try {
          newDifficulty = await assessDifficulty(simplifiedText);
          console.log(`Simplified difficulty: ${newDifficulty}`);
        } catch (error) {
          console.error("Error assessing simplified difficulty:", error);
        }
        
        // Return the simplified version with correct metadata 
        return res.json({
          text: simplifiedText,
          isSimplified: true,
          simplificationLevel: Math.round(simplificationFactor * 100), 
          originalDifficulty,
          newDifficulty
        });
      } 
      
      // Normal processing for first chunk or positive ratings
      console.log(`Standard adaptation for chunk ${chunkId} (${isFirstChunk ? 'first chunk' : 'positive rating'})`);
      const { simplifiedText, factor } = await adaptChunk(text, rating, isFirstChunk);
      const isSimplified = factor > 0;
      
      console.log(`[ROUTE DEBUG] Simplification factor: ${factor}, isSimplified: ${isSimplified}`);
      console.log(`[ROUTE DEBUG] Original text preview: "${text.substring(0, 30)}..."`);
      console.log(`[ROUTE DEBUG] Text after adaptation: "${simplifiedText.substring(0, 30)}..."`);
      
      // Assess difficulty of simplified text if it was changed
      let newDifficulty = originalDifficulty;
      if (isSimplified && simplifiedText !== text) {
        try {
          newDifficulty = await assessDifficulty(simplifiedText);
          console.log(`Simplified chunk difficulty: ${newDifficulty} (reduction: ${
            originalDifficulty ? Math.round((originalDifficulty - newDifficulty) / originalDifficulty * 100) : "unknown"
          }%)`);
        } catch (newDifficultyError) {
          console.error("Error assessing simplified difficulty:", newDifficultyError);
          // Continue even if new difficulty assessment fails
        }
      }
      
      // Normal response
      return res.json({
        text: isSimplified ? simplifiedText : text,
        isSimplified,
        simplificationLevel: Math.round(factor * 100),
        originalDifficulty,
        newDifficulty
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
