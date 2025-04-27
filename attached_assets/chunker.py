import requests
import logging
import os
from dataclasses import dataclass
from typing import List, Optional, Union

API_KEY = os.environ.get("CHONKIE_API_KEY", "")
CHUNK_URL = "https://api.chonkie.ai/v1/chunk/semantic"  # Correct endpoint (no trailing slash)

@dataclass
class SemanticSentence:
    text: str
    start_index: int
    end_index: int
    token_count: int
    embedding: Optional[List[float]]

@dataclass
class SemanticChunk:
    text: str
    start_index: int
    end_index: int
    token_count: int
    sentences: List[SemanticSentence]

def chunk_text(
    text: str,
    embedding_model: str = "minishlab/potion-base-8M",
    threshold: Union[float, str] = "auto",
    chunk_size: int = 512,
    min_sentences: int = 1,
    chunk_url: Optional[str] = None
) -> List[SemanticChunk]:
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "text": text,
        "params": {
            "embedding_model": embedding_model,
            "threshold": threshold,
            "chunk_size": chunk_size,
            "min_sentences": min_sentences
        }
    }
    url = chunk_url or CHUNK_URL
    logging.info(f"Sending chunking request to {url} with text of length {len(text)}")
    
    # Initialize response variable outside the try block to avoid unbound error
    resp = None
    
    try:
        resp = requests.post(url, headers=headers, json=payload)
        resp.raise_for_status()
    except requests.HTTPError as err:
        if resp is not None:
            logging.error(f"Request to {url} failed ({resp.status_code}): {resp.text}")
        else:
            logging.error(f"Request to {url} failed: {str(err)}")
        raise
    except Exception as ex:
        logging.error(f"Unexpected error in chunking request: {str(ex)}")
        raise
    
    if resp is None:
        raise ValueError("Failed to get response from chunking API")
        
    try:
        body = resp.json()
        logging.info(f"Received API response with status code {resp.status_code}")
    except ValueError as json_err:
        logging.error(f"Failed to parse JSON response: {resp.text[:500]}")
        raise ValueError(f"Invalid JSON response from chunking API: {str(json_err)}")
    # Handle API response which may be a list of chunks or a dict with 'chunks'
    if isinstance(body, list):
        raw_chunks = body
    else:
        raw_chunks = body.get("chunks", [])
        
    # Validate we actually got chunks
    if not raw_chunks:
        logging.error("No chunks received from API. Response: " + str(body)[:500])
        raise ValueError("No chunks returned from chunking API")
    
    logging.info(f"Received {len(raw_chunks)} chunks from API")
    chunks: List[SemanticChunk] = []
    
    for i, rc in enumerate(raw_chunks):
        # Validate chunk structure
        if not isinstance(rc, dict):
            logging.error(f"Invalid chunk format at index {i}: {type(rc)} - {str(rc)[:100]}")
            continue
            
        if "text" not in rc or not rc["text"]:
            logging.error(f"Chunk at index {i} missing text field: {str(rc)[:100]}")
            continue
            
        try:
            # Extract sentence information
            sents = [
                SemanticSentence(
                    text=s["text"],
                    start_index=s["start_index"],
                    end_index=s["end_index"],
                    token_count=s["token_count"],
                    embedding=s.get("embedding")
                )
                for s in rc.get("sentences", [])
            ]
            
            # Create the chunk
            chunks.append(
                SemanticChunk(
                    text=rc["text"],
                    start_index=rc.get("start_index", 0),
                    end_index=rc.get("end_index", len(rc["text"])),
                    token_count=rc.get("token_count", 0),
                    sentences=sents
                )
            )
            
            # Log chunk stats for debugging
            logging.info(f"Chunk #{i+1}: {len(rc['text'])} chars, {len(sents)} sentences")
            
        except KeyError as key_err:
            logging.error(f"Missing required field in chunk {i}: {key_err}")
            # Create chunk with partial data if possible
            if "text" in rc:
                chunks.append(
                    SemanticChunk(
                        text=rc["text"],
                        start_index=rc.get("start_index", 0),
                        end_index=rc.get("end_index", len(rc["text"])),
                        token_count=rc.get("token_count", 0),
                        sentences=[]
                    )
                )
                logging.info(f"Added partial chunk #{i+1} with missing fields")
        except Exception as e:
            logging.error(f"Error processing chunk {i}: {str(e)}")
            
    # Final validation
    if not chunks:
        logging.error("No valid chunks could be created")
        raise ValueError("Failed to create any valid chunks from API response")
        
    logging.info(f"Successfully created {len(chunks)} chunks")
    return chunks

if __name__ == "__main__":
    sample = """
Could you please review my lab responses for both correctness and completeness? Be extremely critical and harsh, looking at every detail and any mistake. This includes checking my explanations, calculations, and any justifications I provided. Also, please take a close look at the oscilloscope screenshots I’ve included—let me know if the waveforms match what would be expected from the given circuit setup. At the end, summarize any changes or improvements I should make to ensure my submission is 100% accurate and thorough. Finally, give me a predicted percentage score a UPenn electrical engineering college professor would give for this lab report, if he was extremely harsh and critical.
    """
    result = chunk_text(sample)
    for i, c in enumerate(result, 1):
        print(f"Chunk #{i}:")
        print(f"  text         = {c.text!r}")
        print(f"  token_count  = {c.token_count}")
        print(f"  sentences    = {len(c.sentences)}")