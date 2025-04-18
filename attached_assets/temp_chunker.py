
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

    # Parse arguments
    args = json.loads(sys.argv[1])
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
