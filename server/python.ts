import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { Chunk, Sentence } from "@/types";

// Store adaptive reader state between calls
// Using a singleton to persist across requests
class AdaptiveReaderState {
  private static instance: AdaptiveReaderState;
  public performance: number = 0.0;
  public chunksSeen: number = 0;
  public lastSimplified: boolean = false;
  public lastFactor: number = 0.0;
  
  private constructor() {}
  
  public static getInstance(): AdaptiveReaderState {
    if (!AdaptiveReaderState.instance) {
      AdaptiveReaderState.instance = new AdaptiveReaderState();
    }
    return AdaptiveReaderState.instance;
  }
  
  public updatePerformance(rating: number): void {
    this.chunksSeen += 1;
    // Calculate running average
    this.performance = ((this.performance * (this.chunksSeen - 1)) + rating) / this.chunksSeen;
  }
  
  public reset(): void {
    this.performance = 0.0;
    this.chunksSeen = 0;
    this.lastSimplified = false;
    this.lastFactor = 0.0;
  }
}

const execPromise = promisify(exec);

// Path to Python scripts
const SCRIPTS_DIR = path.join(process.cwd(), "attached_assets");

// Helper function to execute Python scripts
async function execPythonScript(scriptPath: string, args: object): Promise<string> {
  try {
    // Create a temporary JSON file to pass the arguments
    // This avoids shell escaping issues completely
    const tempArgsPath = `${scriptPath}.args.json`;
    fs.writeFileSync(tempArgsPath, JSON.stringify(args, null, 2));
    
    try {
      // Execute Python script with the args file path instead of command line arguments
      const command = `python3 ${scriptPath} "${tempArgsPath}"`;
      
      try {
        const { stdout, stderr } = await execPromise(command);
        if (stderr) {
          console.error(`Python script stderr: ${stderr}`);
        }
        return stdout;
      } catch (error: any) {
        console.error(`Error executing Python script: ${error.message}`);
        if (error.stdout) {
          console.error(`Python stdout: ${error.stdout}`);
        }
        if (error.stderr) {
          console.error(`Python stderr: ${error.stderr}`);
        }
        throw error;
      }
    } finally {
      // Clean up the temporary args file
      try {
        if (fs.existsSync(tempArgsPath)) {
          fs.unlinkSync(tempArgsPath);
        }
      } catch (unlinkError) {
        console.error("Failed to delete temporary args file:", unlinkError);
      }
    }
  } catch (error) {
    console.error("Error executing Python script:", error);
    throw error;
  }
}

// Chunk text using chunker.py
export async function chunkText(text: string): Promise<Chunk[]> {
  try {
    // Create a direct temporary script file that includes error handling
    const tempScriptPath = path.join(SCRIPTS_DIR, "temp_chunker.py");
    const scriptContent = `
import json
import sys
import os
import traceback
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("chunker")

try:
    # Ensure the current directory is in the Python path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    
    from chunker import chunk_text

    # Parse arguments from JSON file
    with open(sys.argv[1], 'r') as f:
        args = json.loads(f.read())
    text = args.get("text", "")
    
    if not text or len(text.strip()) == 0:
        raise ValueError("Text cannot be empty")
    
    logger.info(f"Processing text of length: {len(text)}")
    
    # Process using chunker with better error handling
    try:
        chunks = chunk_text(text)
        logger.info(f"Successfully generated {len(chunks)} chunks")
    except Exception as chunk_error:
        logger.error(f"Chunking error: {chunk_error}")
        raise ValueError(f"Failed to chunk text: {str(chunk_error)}")

    # Validate we actually got chunks
    if not chunks or len(chunks) == 0:
        raise ValueError("No chunks produced from the input text")

    # Convert to format needed by JavaScript
    result = []
    for i, chunk in enumerate(chunks):
        sentences = []
        for s in chunk.sentences:
            sentences.append({
                "text": s.text,
                "start_index": s.start_index,
                "end_index": s.end_index,
                "token_count": s.token_count,
            })
        
        result.append({
            "text": chunk.text,
            "start_index": chunk.start_index,
            "end_index": chunk.end_index,
            "token_count": chunk.token_count,
            "sentences": sentences
        })

    # Output JSON
    print(json.dumps(result))
except Exception as e:
    error_type = type(e).__name__
    error_msg = str(e)
    traceback_str = traceback.format_exc()
    print(json.dumps({
        "error": f"{error_type}: {error_msg}",
        "traceback": traceback_str
    }))
    sys.exit(1)
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    try {
      // Execute the script
      const stdout = await execPythonScript(tempScriptPath, { text });
      
      // Parse the result
      try {
        const parsedOutput = JSON.parse(stdout);
        
        // Check if we received an error message
        if (parsedOutput && typeof parsedOutput === 'object' && parsedOutput.error) {
          console.error("Python error:", parsedOutput.error);
          console.error("Traceback:", parsedOutput.traceback);
          
          // Check for specific API errors
          if (parsedOutput.error.includes('Request to') && parsedOutput.error.includes('failed')) {
            throw new Error("Failed to connect to the Chonkie API. Please check your API key or try again later.");
          }
          
          throw new Error(parsedOutput.error);
        }
        
        // Check if we got an array of chunks
        if (!Array.isArray(parsedOutput)) {
          throw new Error("Invalid response format from Python: expected array of chunks");
        }
        
        // Post-process: Combine chunks that are too short (less than a paragraph)
        const MIN_CHUNK_LENGTH = 150; // Roughly 2-3 sentences
        const MIN_SENTENCES = 2;
        
        const combinedChunks: any[] = [];
        let currentChunk: any | null = null;
        
        console.log(`Original chunk count from API: ${parsedOutput.length}`);
        
        for (const chunk of parsedOutput) {
          // Skip empty chunks
          if (!chunk.text || chunk.text.trim().length === 0) {
            continue;
          }
          
          // If this is the first chunk, or the current chunk is already large enough
          if (!currentChunk) {
            currentChunk = { ...chunk };
            
            // If the first chunk is large enough, add it directly
            if (chunk.text.length >= MIN_CHUNK_LENGTH && chunk.sentences.length >= MIN_SENTENCES) {
              combinedChunks.push(currentChunk);
              currentChunk = null;
            }
            continue;
          }
          
          // If we have a current chunk but it's too small, combine with this one
          if (currentChunk.text.length < MIN_CHUNK_LENGTH || currentChunk.sentences.length < MIN_SENTENCES) {
            // Combine text with proper spacing
            currentChunk.text = `${currentChunk.text}\n\n${chunk.text}`;
            
            // Expand the token count and range
            currentChunk.token_count += chunk.token_count;
            currentChunk.end_index = chunk.end_index;
            
            // Combine sentences arrays
            currentChunk.sentences = [...currentChunk.sentences, ...chunk.sentences];
            
            // If the combined chunk is now large enough, add it
            if (currentChunk.text.length >= MIN_CHUNK_LENGTH && currentChunk.sentences.length >= MIN_SENTENCES) {
              combinedChunks.push(currentChunk);
              currentChunk = null;
            }
          } else {
            // Current chunk is already large enough, add it and start a new one
            combinedChunks.push(currentChunk);
            currentChunk = { ...chunk };
            
            // If the new chunk is also large enough, add it directly
            if (chunk.text.length >= MIN_CHUNK_LENGTH && chunk.sentences.length >= MIN_SENTENCES) {
              combinedChunks.push(currentChunk);
              currentChunk = null;
            }
          }
        }
        
        // Don't forget the last chunk if there is one
        if (currentChunk) {
          combinedChunks.push(currentChunk);
        }
        
        console.log(`After combining: ${combinedChunks.length} chunks (reduced from ${parsedOutput.length})`);
        
        // Now the regular processing continues with our combined chunks
        
        // Get difficulty for the first chunk only
        let firstChunkDifficulty: number | undefined;
        try {
          if (combinedChunks.length > 0) {
            firstChunkDifficulty = await assessDifficulty(combinedChunks[0].text);
            console.log(`First chunk difficulty: ${firstChunkDifficulty}`);
          }
        } catch (difficultyError) {
          console.error("Failed to assess difficulty for first chunk:", difficultyError);
          // Continue without setting difficulty
        }
        
        const chunks: Chunk[] = combinedChunks.map((chunk: any, index: number) => ({
          ...chunk,
          id: index + 1,
          status: index === 0 ? "active" : "pending",
          // Only set difficulty for the first chunk
          difficulty: index === 0 ? firstChunkDifficulty : undefined
        }));
        
        return chunks;
      } catch (parseError) {
        console.error("Error parsing Python output:", parseError);
        console.error("Raw output:", stdout);
        
        if (stdout.includes("API_KEY") && stdout.includes("CHONKIE")) {
          throw new Error("Chonkie API authentication failed. Please check your API key.");
        }
        
        throw new Error("Failed to parse chunker output: " + (parseError instanceof Error ? parseError.message : String(parseError)));
      }
    } finally {
      // Clean up - using try/catch to prevent unlink errors
      try {
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
      } catch (unlinkError) {
        console.error("Failed to delete temporary script:", unlinkError);
      }
    }
  } catch (error) {
    console.error("Error in chunkText:", error);
    throw error;
  }
}

// Generate questions using question_generator.py
export async function generateQuestions(text: string): Promise<string[]> {
  try {
    // Create a temporary script to call the question generator
    const tempScriptPath = path.join(SCRIPTS_DIR, "temp_question_gen.py");
    const scriptContent = `
import json
import sys
import os
import traceback

try:
    # Ensure the current directory is in the Python path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    
    from question_generator import generate_questions_from_chunk

    # Parse arguments from JSON file
    with open(sys.argv[1], 'r') as f:
        args = json.loads(f.read())
    text = args.get("text", "")

    # Generate questions
    questions = generate_questions_from_chunk(text)

    # Output JSON
    print(json.dumps(questions))
except Exception as e:
    print(json.dumps({
        "error": str(e),
        "traceback": traceback.format_exc()
    }))
    sys.exit(1)
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    try {
      // Execute the script
      const stdout = await execPythonScript(tempScriptPath, { text });
      
      // Parse the result
      try {
        const parsedOutput = JSON.parse(stdout);
        
        // Check if we received an error message
        if (parsedOutput.error) {
          console.error("Python error:", parsedOutput.error);
          console.error("Traceback:", parsedOutput.traceback);
          throw new Error(parsedOutput.error);
        }
        
        return parsedOutput;
      } catch (parseError) {
        // Check if this is an error object
        if (parseError instanceof Error && 'error' in (parseError as any)) {
          throw parseError;
        }
        
        console.error("Error parsing Python output:", parseError);
        console.error("Raw output:", stdout);
        
        // If we can't parse as JSON, return an empty array
        return [];
      }
    } finally {
      // Clean up - using try/catch to prevent unlink errors
      try {
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
      } catch (unlinkError) {
        console.error("Failed to delete temporary script:", unlinkError);
      }
    }
  } catch (error) {
    console.error("Error in generateQuestions:", error);
    throw error;
  }
}

// Assess difficulty using difficulty_assessor.py
export async function assessDifficulty(text: string): Promise<number> {
  try {
    // Create a temporary script to call the difficulty assessor
    const tempScriptPath = path.join(SCRIPTS_DIR, "temp_difficulty.py");
    const scriptContent = `
import json
import sys
import os
import traceback

try:
    # Ensure the current directory is in the Python path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    
    from difficulty_assessor import rate_chunk_difficulty

    # Parse arguments from JSON file
    with open(sys.argv[1], 'r') as f:
        args = json.loads(f.read())
    text = args.get("text", "")

    # Rate difficulty
    score = rate_chunk_difficulty(text)

    # Output JSON
    print(json.dumps(score))
except Exception as e:
    print(json.dumps({
        "error": str(e),
        "traceback": traceback.format_exc()
    }))
    sys.exit(1)
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    try {
      // Execute the script
      const stdout = await execPythonScript(tempScriptPath, { text });
      
      // Parse the result
      try {
        const parsedOutput = JSON.parse(stdout);
        
        // Check if we received an error message
        if (parsedOutput && typeof parsedOutput === 'object' && parsedOutput.error) {
          console.error("Python error:", parsedOutput.error);
          console.error("Traceback:", parsedOutput.traceback);
          // Return a default difficulty value instead of throwing
          return 1000; // Medium difficulty as default
        }
        
        return parsedOutput;
      } catch (parseError) {
        console.error("Error parsing Python output:", parseError);
        console.error("Raw output:", stdout);
        
        // If we can't parse, return a default difficulty
        return 1000;
      }
    } finally {
      // Clean up - using try/catch to prevent unlink errors
      try {
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
      } catch (unlinkError) {
        console.error("Failed to delete temporary script:", unlinkError);
      }
    }
  } catch (error) {
    console.error("Error in assessDifficulty:", error);
    return 1000; // Return a default value on error
  }
}

// Generate a summary of a chunk for display in navigation
export async function generateSummary(text: string): Promise<string> {
  try {
    // Create a temporary script for summary generation
    const tempScriptPath = path.join(SCRIPTS_DIR, "temp_summary.py");
    const scriptContent = `
import json
import sys
import os
import traceback
import logging
import requests

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("summary_generator")

try:
    # Parse arguments from JSON file
    with open(sys.argv[1], 'r') as f:
        args = json.loads(f.read())
    
    text = args.get("text", "")
    if not text:
        raise ValueError("Text cannot be empty")
    
    # Use Gemini API to generate a summary
    gemini_api_key = os.environ.get("GEMINI_API_KEY", "")
    if not gemini_api_key:
        raise ValueError("GEMINI_API_KEY environment variable not set")
    
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={gemini_api_key}"
    
    prompt = "Write a unique, specific headline (4-6 words) that precisely captures the main topic of this particular text excerpt. Don't use generic descriptions or complete sentences. Focus on the key idea that makes this specific passage different from others. Use crisp, newspaper-style headline formatting.\\n\\nText: " + text
    
    payload = {
        "contents": [{"parts": [{"text": prompt}]}],
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 25,
            "topK": 40,
            "topP": 0.95
        }
    }
    
    logger.info(f"Sending summary request to Gemini API for text of length {len(text)}")
    resp = requests.post(api_url, headers={"Content-Type": "application/json"}, json=payload)
    resp.raise_for_status()
    
    data = resp.json()
    logger.info(f"Received API response")
    
    if "candidates" in data and len(data["candidates"]) > 0:
        candidate = data["candidates"][0]
        if "content" in candidate:
            parts = candidate["content"].get("parts", [])
            summary = "".join(p.get("text", "") for p in parts)
            
            # Clean up any formatting artifacts
            summary = summary.strip()
            
            # Remove quotes if present
            if summary.startswith('"') and summary.endswith('"'):
                summary = summary[1:-1].strip()
            
            # Clean up potential artifacts and ensure proper headline format
            # Remove trailing punctuation
            summary = summary.rstrip('.,;:!?')
            
            # Capitalize words properly for a headline (AP style)
            words = summary.split()
            if words:
                # Function to determine if a word should be lowercase in a title
                def should_be_lowercase(word):
                    lowercase_words = {'a', 'an', 'and', 'at', 'but', 'by', 'for', 'in', 
                                      'nor', 'of', 'on', 'or', 'so', 'the', 'to', 'up', 'yet'}
                    return word.lower() in lowercase_words and len(word) < 5
                
                # Always capitalize first and last word
                words[0] = words[0].capitalize()
                if len(words) > 1:
                    words[-1] = words[-1].capitalize()
                
                # Apply title case rules to the rest
                for i in range(1, len(words) - 1):
                    if should_be_lowercase(words[i]):
                        words[i] = words[i].lower()
                    else:
                        words[i] = words[i].capitalize()
                
                # Recombine
                summary = ' '.join(words)
                
            # Limit length
            if len(summary) > 50:
                summary = summary[:47] + '...'
            
            logger.info(f"Successfully generated summary: {summary}")
            print(json.dumps(summary))
        else:
            logger.error("No content in API response")
            print(json.dumps(""))
    else:
        logger.error("No candidates in API response")
        print(json.dumps(""))
except Exception as e:
    error_type = type(e).__name__
    error_msg = str(e)
    traceback_str = traceback.format_exc()
    logger.error(f"Error: {error_type} - {error_msg}")
    logger.error(f"Traceback: {traceback_str}")
    print(json.dumps(""))
    sys.exit(1)
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);
    
    try {
      // Execute the script
      const stdout = await execPythonScript(tempScriptPath, { text });
      
      // Parse the result
      try {
        const summary = JSON.parse(stdout);
        if (summary && typeof summary === 'string' && summary.length > 0) {
          console.log(`Generated summary: "${summary}"`);
          return summary;
        } else {
          console.log("Failed to generate summary, returning empty string");
          return "";
        }
      } catch (parseError) {
        console.error("Error parsing summary output:", parseError);
        return "";
      }
    } finally {
      // Clean up
      try {
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
      } catch (unlinkError) {
        console.error("Failed to delete temporary script:", unlinkError);
      }
    }
  } catch (error) {
    console.error("Error generating summary:", error);
    return "";
  }
}

// Review responses using response_reviewer.py
export async function reviewResponses(
  chunk: string, 
  questions: string[], 
  responses: string[]
): Promise<{ review: string; rating: number }> {
  try {
    // Create a temporary script to call the response reviewer
    const tempScriptPath = path.join(SCRIPTS_DIR, "temp_reviewer.py");
    const scriptContent = `
import json
import sys
import os
import traceback
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reviewer")

try:
    # Ensure the current directory is in the Python path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    
    from response_reviewer import review_responses

    # Parse arguments from JSON file
    with open(sys.argv[1], 'r') as f:
        file_content = f.read()
        logger.info(f"Reading JSON args from: {sys.argv[1]}")
        args = json.loads(file_content)
    
    chunk = args.get("chunk", "")
    questions = args.get("questions", [])
    responses = args.get("responses", [])
    
    logger.info(f"Processing chunk of length: {len(chunk)}")
    logger.info(f"Questions count: {len(questions)}")
    logger.info(f"Responses count: {len(responses)}")
    
    # Log the first parts of each for debug
    if chunk:
        logger.info(f"Chunk preview: {chunk[:50]}...")
    if questions and len(questions) > 0:
        logger.info(f"First question: {questions[0]}")
    if responses and len(responses) > 0:
        logger.info(f"First response: {responses[0]}")

    # Review responses
    logger.info("Calling review_responses function...")
    feedback = review_responses(chunk, questions, responses)
    logger.info(f"Got feedback with rating: {feedback.get('rating')}")

    # Output JSON
    result = json.dumps(feedback)
    logger.info(f"Returning result length: {len(result)}")
    print(result)
except Exception as e:
    error_type = type(e).__name__
    error_msg = str(e)
    traceback_str = traceback.format_exc()
    logger.error(f"Error: {error_type} - {error_msg}")
    logger.error(f"Traceback: {traceback_str}")
    print(json.dumps({
        "error": f"{error_type}: {error_msg}",
        "traceback": traceback_str
    }))
    sys.exit(1)
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    try {
      // Execute the script
      const stdout = await execPythonScript(tempScriptPath, { chunk, questions, responses });
      
      // Parse the result
      try {
        const parsedOutput = JSON.parse(stdout);
        
        // Check if we received an error message
        if (parsedOutput && typeof parsedOutput === 'object' && parsedOutput.error) {
          console.error("Python error:", parsedOutput.error);
          console.error("Traceback:", parsedOutput.traceback);
          // Return a default feedback instead of throwing
          return {
            review: "I couldn't fully analyze your responses due to a technical issue, but they demonstrate a basic understanding of the material. Try providing more detailed answers next time.",
            rating: 50 // Neutral rating
          };
        }
        
        return parsedOutput;
      } catch (parseError) {
        console.error("Error parsing Python output:", parseError);
        console.error("Raw output:", stdout);
        
        // If we can't parse, return a default feedback
        return {
          review: "I couldn't analyze your responses due to a technical issue. Please try again later.",
          rating: 0 // Neutral rating
        };
      }
    } finally {
      // Clean up - using try/catch to prevent unlink errors
      try {
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
      } catch (unlinkError) {
        console.error("Failed to delete temporary script:", unlinkError);
      }
    }
  } catch (error) {
    console.error("Error in reviewResponses:", error);
    // Return default feedback instead of throwing
    return {
      review: "I encountered an error while analyzing your responses. Please try again with different answers.",
      rating: 0
    };
  }
}

// Adapt chunk using adaptive_reader.py with persistent state
export async function adaptChunk(
  text: string, 
  rating: number,
  isFirstChunk: boolean = false
): Promise<{ simplifiedText: string; factor: number }> {
  try {
    // Get the singleton instance to maintain state between calls
    const readerState = AdaptiveReaderState.getInstance();
    
    // For the first chunk, we don't adapt but still update performance
    if (isFirstChunk) {
      readerState.updatePerformance(rating);
      console.log(`First chunk - using original text. Performance: ${readerState.performance.toFixed(2)}`);
      return { 
        simplifiedText: text, 
        factor: 0 // 0% simplification for first chunk
      };
    }
    
    // DIRECT APPROACH: If rating is negative, force simplification immediately
    // Skip the Python script entirely for this condition to eliminate all possible errors
    if (rating < 0) {
      console.log(`*** DIRECT SIMPLIFICATION: Negative rating (${rating}) detected, forcing 20% simplification ***`);
      
      // Calculate simplification level based on how negative the rating is
      let simplificationFactor = 0.2; // Default to 20% for negative ratings
      
      if (rating <= -150) {
        simplificationFactor = 0.4; // 40% for very negative ratings
      } else if (rating <= -100) {
        simplificationFactor = 0.3; // 30% for quite negative ratings
      }
      
      // Only use Python for the actual text simplification
      try {
        const tempScriptPath = path.join(SCRIPTS_DIR, "temp_simplifier.py");
        const simplifierScript = `
import json
import sys
import os
import traceback

try:
    # Ensure the current directory is in the Python path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    
    from adaptive_reader import AdaptiveReader
    
    # Parse arguments from JSON file
    with open(sys.argv[1], 'r') as f:
        args = json.loads(f.read())
    text = args.get("text", "")
    factor = args.get("factor", 0.2)
    
    print(f"*** SIMPLIFIER: Text length {len(text)}, factor {factor} ***")
    
    # Create reader and simplify directly
    reader = AdaptiveReader()
    simplified = reader.simplify_chunk(text, factor)
    
    # Output simplified text
    result = {"simplified_text": simplified}
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({
        "error": str(e),
        "traceback": traceback.format_exc()
    }))
    sys.exit(1)
`;

        // Write the temp script
        fs.writeFileSync(tempScriptPath, simplifierScript);
        
        try {
          // Call the simple script
          const simplifyOutput = await execPythonScript(tempScriptPath, {
            text,
            factor: simplificationFactor
          });
          
          // Parse the simplified text
          const simplifyResult = JSON.parse(simplifyOutput);
          
          if (simplifyResult.error) {
            throw new Error(simplifyResult.error);
          }
          
          // Update reader state with our forced values
          readerState.lastSimplified = true;
          readerState.lastFactor = simplificationFactor;
          readerState.updatePerformance(rating);
          
          // Show debug info
          console.log(`*** DIRECT SIMPLIFICATION: Done with factor ${simplificationFactor} ***`);
          console.log(`*** ORIGINAL: "${text.substring(0, 30)}..." ***`);
          console.log(`*** SIMPLIFIED: "${simplifyResult.simplified_text.substring(0, 30)}..." ***`);
          
          // Return the result with our direct values
          return {
            simplifiedText: simplifyResult.simplified_text,
            factor: simplificationFactor
          };
        } finally {
          // Clean up
          if (fs.existsSync(tempScriptPath)) {
            fs.unlinkSync(tempScriptPath);
          }
        }
      } catch (simplifierError) {
        console.error("Error in direct simplification:", simplifierError);
        // If simplification fails, return original text
        return {
          simplifiedText: text,
          factor: 0
        };
      }
    }
    
    // Update performance with the user's rating from previous chunk
    readerState.updatePerformance(rating);
    console.log(`AdaptiveReader state - Performance: ${readerState.performance.toFixed(2)}, ChunksSeen: ${readerState.chunksSeen}`);
    
    // Create a temporary script to call the adaptive reader
    const tempScriptPath = path.join(SCRIPTS_DIR, "temp_adapter.py");
    const scriptContent = `
import json
import sys
import os
import traceback

try:
    # Ensure the current directory is in the Python path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    
    from adaptive_reader import AdaptiveReader
    from difficulty_assessor import rate_chunk_difficulty

    # Parse arguments from JSON file
    with open(sys.argv[1], 'r') as f:
        args = json.loads(f.read())
    text = args.get("text", "")
    rating = args.get("rating", 0)
    performance = args.get("performance", 0)
    last_simplified = args.get("last_simplified", False)
    last_factor = args.get("last_factor", 0.0)
    
    # Create adaptive reader with persisted state
    reader = AdaptiveReader(performance)
    reader.last_simplified = last_simplified
    reader.last_factor = last_factor
    
    # Assess difficulty of the current chunk
    difficulty = rate_chunk_difficulty(text)
    
    # Compare performance to difficulty
    if difficulty is not None and (performance < difficulty or last_simplified):
        # Determine the appropriate simplification level based on performance
        current_level = last_factor if last_simplified else 0.0
        target_level = reader.get_simplification_level(current_level, performance)
        
        # Fixed limit to prevent over-simplification
        factor = min(0.7, target_level)
        factor = max(0.0, factor)
        
        # Round to nearest 10%
        factor = round(factor * 10) / 10
        
        # Apply simplification if needed
        if factor > 0:
            simplified_text = reader.simplify_chunk(text, factor)
            is_simplified = True
        else:
            simplified_text = text
            is_simplified = False
    else:
        # No simplification needed
        simplified_text = text
        factor = 0.0
        is_simplified = False
    
    # Output JSON with results
    result = {
        "simplified_text": simplified_text,
        "factor": factor,
        "is_simplified": is_simplified,
        "difficulty": difficulty
    }
    print(json.dumps(result))
except Exception as e:
    print(json.dumps({
        "error": str(e),
        "traceback": traceback.format_exc()
    }))
    sys.exit(1)
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    try {
      // Execute the script with current state
      const stdout = await execPythonScript(tempScriptPath, { 
        text, 
        rating,
        performance: readerState.performance,
        last_simplified: readerState.lastSimplified,
        last_factor: readerState.lastFactor
      });
      
      // Parse the result
      try {
        const parsedOutput = JSON.parse(stdout);
        
        // Check if we received an error message
        if (parsedOutput && typeof parsedOutput === 'object' && parsedOutput.error) {
          console.error("Python error:", parsedOutput.error);
          console.error("Traceback:", parsedOutput.traceback);
          // Return original text with zero factor
          return {
            simplifiedText: text,
            factor: 0
          };
        }
        
        // Update our persistent state with results
        readerState.lastSimplified = parsedOutput.is_simplified;
        readerState.lastFactor = parsedOutput.factor;
        
        console.log(`[ADAPT DEBUG] Chunk difficulty: ${parsedOutput.difficulty}, Performance: ${readerState.performance}, Simplification: ${parsedOutput.is_simplified ? 'yes' : 'no'} (factor: ${parsedOutput.factor.toFixed(2)})`);
        console.log(`[ADAPT DEBUG] Original text preview: "${text.substring(0, 30)}..."`);
        console.log(`[ADAPT DEBUG] Simplified text preview: "${parsedOutput.simplified_text.substring(0, 30)}..."`);
        
        return {
          simplifiedText: parsedOutput.simplified_text,
          factor: parsedOutput.factor
        };
      } catch (parseError) {
        console.error("Error parsing Python output:", parseError);
        console.error("Raw output:", stdout);
        
        // If we can't parse, return original text
        return {
          simplifiedText: text,
          factor: 0
        };
      }
    } finally {
      // Clean up - using try/catch to prevent unlink errors
      try {
        if (fs.existsSync(tempScriptPath)) {
          fs.unlinkSync(tempScriptPath);
        }
      } catch (unlinkError) {
        console.error("Failed to delete temporary script:", unlinkError);
      }
    }
  } catch (error) {
    console.error("Error in adaptChunk:", error);
    // Return original text instead of throwing
    return {
      simplifiedText: text,
      factor: 0
    };
  }
}
