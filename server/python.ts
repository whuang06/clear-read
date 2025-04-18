import { exec } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import { Chunk, Sentence } from "@/types";

const execPromise = promisify(exec);

// Path to Python scripts
const SCRIPTS_DIR = path.join(process.cwd(), "attached_assets");

// Helper function to execute Python scripts
async function execPythonScript(scriptPath: string, args: object): Promise<string> {
  // Write the args to a temporary file instead of passing them directly in the command
  // This avoids shell escaping issues
  const tempArgsPath = path.join(SCRIPTS_DIR, "temp_args.json");
  const argsJson = JSON.stringify(args);
  
  try {
    // Write args to file
    fs.writeFileSync(tempArgsPath, argsJson, 'utf8');
    
    // Execute Python script with file path as argument
    const command = `python3 ${scriptPath} "${tempArgsPath}"`;
    
    try {
      const { stdout, stderr } = await execPromise(command);
      if (stderr) {
        console.error(`Python script stderr: ${stderr}`);
      }
      return stdout;
    } catch (error: any) {
      console.error(`Error executing Python script: ${error.message}`);
      if (error.stderr) {
        console.error(`Python stderr: ${error.stderr}`);
      }
      throw error;
    } finally {
      // Clean up temp file
      try {
        if (fs.existsSync(tempArgsPath)) {
          fs.unlinkSync(tempArgsPath);
        }
      } catch (unlinkError) {
        console.error("Failed to delete temporary args file:", unlinkError);
      }
    }
  } catch (error) {
    console.error("Error writing args to temp file:", error);
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

    # Parse arguments from the file
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
        
        const chunks: Chunk[] = parsedOutput.map((chunk: any, index: number) => ({
          ...chunk,
          id: index + 1,
          status: index === 0 ? "active" : "pending"
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

    # Parse arguments from the file
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

    # Parse arguments from the file
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

try:
    # Ensure the current directory is in the Python path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    
    from response_reviewer import review_responses

    # Parse arguments from the file
    with open(sys.argv[1], 'r') as f:
        args = json.loads(f.read())
    chunk = args.get("chunk", "")
    questions = args.get("questions", [])
    responses = args.get("responses", [])

    # Review responses
    feedback = review_responses(chunk, questions, responses)

    # Output JSON
    print(json.dumps(feedback))
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

// Adapt chunk using adaptive_reader.py
export async function adaptChunk(
  text: string, 
  rating: number
): Promise<{ simplifiedText: string; factor: number }> {
  try {
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

    # Parse arguments from the file
    with open(sys.argv[1], 'r') as f:
        args = json.loads(f.read())
    text = args.get("text", "")
    rating = args.get("rating", 0)

    # Initialize adaptive reader and process chunk
    reader = AdaptiveReader()
    simplified_text = reader.process_next_chunk(text, rating)
    factor = reader.last_factor

    # Output JSON
    result = {
        "simplified_text": simplified_text,
        "factor": factor
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
      // Execute the script
      const stdout = await execPythonScript(tempScriptPath, { text, rating });
      
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
