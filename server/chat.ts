import { Request, Response } from "express";

/**
 * Generates a response using Gemini API for any type of query
 * @param query - The user's question or query
 * @returns - A helpful response from the assistant
 */
export async function generateResponse(query: string): Promise<string> {
  try {
    // Format the request for a general purpose assistant
    const prompt = `
      As ClearRead Assistant, a helpful AI assistant for the ClearRead platform, please provide a helpful response to the user's query.
      
      Keep responses informative but concise.
      Be friendly and conversational in your tone.
      If the query is about reading or text comprehension, provide specific guidance.
      For questions about the platform, explain features clearly.
      
      User query:
      "${query}"
      
      Your response:
    `;

    // Check if GEMINI_API_KEY exists
    if (!process.env.GEMINI_API_KEY) {
      console.error("Missing GEMINI_API_KEY environment variable");
      return "I can't assist you right now. Please try again later.";
    }
    
    // Updated to use the correct model name as per the error message
    const apiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro:generateContent?key=${process.env.GEMINI_API_KEY}`, {
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
          maxOutputTokens: 150, // Increased for more comprehensive answers
        }
      })
    });

    const data = await apiResponse.json();
    
    if (!apiResponse.ok) {
      console.error("Gemini API error:", data);
      return "I couldn't process your request right now. Please try again later.";
    }
    
    // Extract the response from the API
    const assistantResponse = data.candidates[0]?.content?.parts[0]?.text || "I couldn't answer that question at the moment.";
    
    return assistantResponse.trim();
  } catch (error) {
    console.error("Error generating response:", error);
    return "I encountered an error while processing your question. Please try again later.";
  }
}

/**
 * Handle chat API request
 */
export async function handleChatRequest(req: Request, res: Response) {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Query is required" });
    }

    const answer = await generateResponse(query);
    
    return res.json({ hint: answer }); // Keeping 'hint' key for backward compatibility
  } catch (error) {
    console.error("Chat request error:", error);
    return res.status(500).json({ 
      error: "Failed to process chat request", 
      message: error instanceof Error ? error.message : "Unknown error" 
    });
  }
}