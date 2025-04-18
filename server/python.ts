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
  const argsJson = JSON.stringify(args);
  const command = `python ${scriptPath} '${argsJson}'`;
  
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
  }
}

// Chunk text using chunker.py
export async function chunkText(text: string): Promise<Chunk[]> {
  try {
    // Create a temporary script to call the chunker
    const tempScriptPath = path.join(SCRIPTS_DIR, "temp_chunker.py");
    const scriptContent = `
import json
import sys
from chunker import chunk_text

# Parse arguments
args = json.loads(sys.argv[1])
text = args.get("text", "")

# Process using chunker
chunks = chunk_text(text)

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
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    // Execute the script
    const stdout = await execPythonScript(tempScriptPath, { text });
    
    // Clean up
    fs.unlinkSync(tempScriptPath);
    
    // Parse the result
    const chunks: Chunk[] = JSON.parse(stdout).map((chunk: any, index: number) => ({
      ...chunk,
      id: index + 1,
      status: index === 0 ? "active" : "pending"
    }));
    
    return chunks;
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
from question_generator import generate_questions_from_chunk

# Parse arguments
args = json.loads(sys.argv[1])
text = args.get("text", "")

# Generate questions
questions = generate_questions_from_chunk(text)

# Output JSON
print(json.dumps(questions))
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    // Execute the script
    const stdout = await execPythonScript(tempScriptPath, { text });
    
    // Clean up
    fs.unlinkSync(tempScriptPath);
    
    // Parse the result
    const questions: string[] = JSON.parse(stdout);
    
    return questions;
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
from difficulty_assessor import rate_chunk_difficulty

# Parse arguments
args = json.loads(sys.argv[1])
text = args.get("text", "")

# Rate difficulty
score = rate_chunk_difficulty(text)

# Output JSON
print(json.dumps(score))
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    // Execute the script
    const stdout = await execPythonScript(tempScriptPath, { text });
    
    // Clean up
    fs.unlinkSync(tempScriptPath);
    
    // Parse the result
    const difficulty: number = JSON.parse(stdout);
    
    return difficulty;
  } catch (error) {
    console.error("Error in assessDifficulty:", error);
    throw error;
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
from response_reviewer import review_responses

# Parse arguments
args = json.loads(sys.argv[1])
chunk = args.get("chunk", "")
questions = args.get("questions", [])
responses = args.get("responses", [])

# Review responses
feedback = review_responses(chunk, questions, responses)

# Output JSON
print(json.dumps(feedback))
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    // Execute the script
    const stdout = await execPythonScript(tempScriptPath, { chunk, questions, responses });
    
    // Clean up
    fs.unlinkSync(tempScriptPath);
    
    // Parse the result
    const feedback = JSON.parse(stdout);
    
    return feedback;
  } catch (error) {
    console.error("Error in reviewResponses:", error);
    throw error;
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
from adaptive_reader import AdaptiveReader

# Parse arguments
args = json.loads(sys.argv[1])
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
`;

    // Write the temporary script
    fs.writeFileSync(tempScriptPath, scriptContent);

    // Execute the script
    const stdout = await execPythonScript(tempScriptPath, { text, rating });
    
    // Clean up
    fs.unlinkSync(tempScriptPath);
    
    // Parse the result
    const result = JSON.parse(stdout);
    
    return {
      simplifiedText: result.simplified_text,
      factor: result.factor
    };
  } catch (error) {
    console.error("Error in adaptChunk:", error);
    throw error;
  }
}
