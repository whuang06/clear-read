import requests
import json
import re
import os
from typing import Union, Optional

# Gemini 2.0 Flash API configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyADXjhUVt51IwsTIqeP-3IE-9T9Rak1P4E")
API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)


def rate_chunk_difficulty(
    chunk: str,
    min_score: int = 0,
    max_score: int = 2000,
    temperature: float = 0.0
) -> Optional[float]:
    """
    Sends a text chunk to Gemini 2.0 Flash and asks it to rate difficulty on a lexile-like scale
    between min_score and max_score. Returns the numeric score.
    """
    headers = {"Content-Type": "application/json"}
    prompt_text = (
        f"Rate the difficulty of the following text on a lexile-like scale from {min_score} to {max_score}. "
        "Respond with only the numeric score (no units, no text).\n\n"
        f"{chunk}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": 10}
    }
    response = requests.post(API_URL, headers=headers, json=payload)
    try:
        response.raise_for_status()
    except requests.HTTPError:
        print(f"Gemini API error ({response.status_code}): {response.text}")
        raise
    data = response.json()

    # extract text output
    candidate = data.get("candidates", [{}])[0]
    if "content" in candidate:
        parts = candidate["content"].get("parts", [])
        output = "".join(p.get("text", "") for p in parts)
    else:
        output = candidate.get("output", "")

    # clean markdown fences
    text = output.strip().strip('`').strip()
    # try parse JSON numeric
    try:
        score = json.loads(text)
    except json.JSONDecodeError:
        # fallback: regex find first number
        m = re.search(r"[-+]?\d*\.?\d+", text)
        score = float(m.group()) if m else None
    return score


if __name__ == "__main__":
    demo_chunk = (
        "In engineering, voltage dividers are circuits with two resistors in series. "
        "They split the input voltage in proportion to resistor values, allowing designers "
        "to get stable reference voltages from a higher voltage source."
    )
    score = rate_chunk_difficulty(demo_chunk)
    print(f"Estimated difficulty score: {score}")
