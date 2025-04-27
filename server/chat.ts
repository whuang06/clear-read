import { Request, Response } from "express";

/**
 * Generates a reading hint using Gemini API
 * @param chunkText - The text content of a reading chunk
 * @returns - A hint about important sentences or concepts to focus on
 */
export async function generateReadingHint(chunkText: string): Promise<string> {
  try {
    // Format the request to get specific hints that don't reveal answers
    const prompt = `
      As a helpful reading assistant, analyze the following text and give the reader ONE brief hint about what to pay attention to.
      
      DO NOT summarize or explain the entire text.
      DO NOT give away answers to potential questions.
      DO NOT write more than 2-3 short sentences.
      
      Instead:
      - Identify 1-2 key sentences or phrases that are important for understanding the text
      - Or suggest a specific concept, term or relationship to pay attention to
      - Or point out a subtle detail that might be easily missed
      
      Text to analyze:
      "${chunkText}"
      
      Hint (make it brief and helpful without giving away too much):
    `;

    // Check if GEMINI_API_KEY exists
    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return "I can't provide a hint right now. Please try again later.";
    }
    
    // Updated to use the correct model name as per the error message
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.4,
          maxOutputTokens: 80,
        }
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      console.error("Gemini API error:", data);
      return "I couldn't analyze this text right now. Please try again later.";
    }
    
    // Extract the hint from the response
    const hint = data.candidates[0]?.content?.parts[0]?.text || "I couldn't generate a hint for this text.";
    
    return hint.trim();
  } catch (error) {
    console.error("Error generating reading hint:", error);
    return "I encountered an error while analyzing this text. Please try again later.";
  }
}

/**
 * Handle chat API request
 */
export async function handleChatRequest(req: Request, res: Response) {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: "Text is required" });
    }

    const hint = await generateReadingHint(text);
    
    return res.json({ hint });
  } catch (error) {
    console.error("Chat request error:", error);
    return res.status(500).json({ 
      error: "Failed to process chat request", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}