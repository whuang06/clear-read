import requests
import json
import os
from typing import Optional
from difficulty_assessor import rate_chunk_difficulty

# Gemini 2.0 Flash API configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyADXjhUVt51IwsTIqeP-3IE-9T9Rak1P4E")
API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)


class AdaptiveReader:
    """
    Tracks reader performance and adapts text difficulty by simplifying chunks
    when performance is below chunk difficulty.
    """
    def __init__(self, initial_performance: float = 0.0):
        self.performance = initial_performance
        self.count = 0
        self.last_simplified = False
        self.last_factor = 0.0

    def update_performance(self, rating: float) -> None:
        """
        Update overall performance as running average of ratings.
        """
        self.count += 1
        self.performance = ((self.performance * (self.count - 1)) + rating) / self.count

    def process_next_chunk(
        self,
        chunk: str,
        prev_rating: float
    ) -> str:
        """
        Update performance with prev_rating. Then compare performance to chunk difficulty:
        - If performance < difficulty: simplify with computed factor.
        - Else if previous chunk was simplified: continue simplifying with same factor.
        - Otherwise: return original chunk.
        """
        self.update_performance(prev_rating)
        difficulty = rate_chunk_difficulty(chunk)
        if difficulty is None:
            self.last_simplified = False
            return chunk
        # struggling: simplify
        if self.performance < difficulty:
            factor = min(1.0, max(0.0, (difficulty - self.performance) / difficulty))
            self.last_factor = factor
            self.last_simplified = True
            return self.simplify_chunk(chunk, factor)
        # performance >= difficulty
        if self.last_simplified:
            # continue simplifying with previous factor
            return self.simplify_chunk(chunk, self.last_factor)
        # good comprehension on original text
        self.last_simplified = False
        return chunk

    def simplify_chunk(self, text: str, factor: float) -> str:
        """
        Uses Gemini to simplify the text by given factor (0-1) preserving length and nuances.
        """
        percent = int(factor * 100)
        prompt = (
            f"Simplify the following text by {percent}% while preserving its length and nuances."
            f" Return only the simplified text.\n\n{text}"
        )
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": len(text) * 2}
        }
        resp = requests.post(API_URL, headers={"Content-Type": "application/json"}, json=payload)
        try:
            resp.raise_for_status()
        except requests.HTTPError:
            print(f"Simplify API error ({resp.status_code}): {resp.text}")
            raise
        data = resp.json()
        cand = data.get("candidates", [{}])[0]
        if "content" in cand:
            parts = cand["content"].get("parts", [])
            simplified = "".join(p.get("text", "") for p in parts)
        else:
            simplified = cand.get("output", "")
        # strip code fences if any
        return simplified.strip().strip('`').strip()


if __name__ == "__main__":
    # Demo: simulate sequence
    reader = AdaptiveReader()
    # previous rating example
    prev_rating = -50  # low understanding
    next_chunk = (
        "Complex circuits use Kirchhoff's laws to analyze currents and voltages. "
        "These laws state that the sum of currents at a junction is zero, and the sum of voltage drops around a loop is zero."
    )
    out = reader.process_next_chunk(next_chunk, prev_rating)
    print("Output chunk (simplified if needed):")
    print(out)
