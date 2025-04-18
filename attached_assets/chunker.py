import requests
import logging
import os
from dataclasses import dataclass
from typing import List, Optional, Union

# Get API key from environment variable, fall back to hardcoded key if not present
API_KEY = os.environ.get("CHONKIE_API_KEY", "d8ed4e94-654c-4df1-929e-f97a6c2f13c6")
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
    resp = requests.post(url, headers=headers, json=payload)
    try:
        resp.raise_for_status()
    except requests.HTTPError as err:
        logging.error(f"Request to {url} failed ({resp.status_code}): {resp.text}")
        raise
    body = resp.json()
    # Handle API response which may be a list of chunks or a dict with 'chunks'
    if isinstance(body, list):
        raw_chunks = body
    else:
        raw_chunks = body.get("chunks", [])
    chunks: List[SemanticChunk] = []
    for rc in raw_chunks:
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
        chunks.append(
            SemanticChunk(
                text=rc["text"],
                start_index=rc["start_index"],
                end_index=rc["end_index"],
                token_count=rc["token_count"],
                sentences=sents
            )
        )
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