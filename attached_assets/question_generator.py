import requests
import json
from typing import List, Optional

# Gemini 2.0 Flash API configuration
import os
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
GEMINI_URL = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"


def generate_questions_from_chunk(
    chunk: str,
    min_questions: int = 2,
    max_questions: int = 5,
    temperature: float = 0.7,
    max_output_tokens: int = 256
) -> List[str]:
    """
    Send a text chunk to Gemini 2.0 Flash and generate open-ended questions.
    Returns a list of questions as strings.
    """
    headers = {"Content-Type": "application/json"}
    prompt_text = (
        f"Read the following text and generate between {min_questions} and {max_questions} "
        "open-ended questions based on its content. Return the questions as a JSON array of strings.\n\n"
        f"{chunk}"
    )
    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {
            "temperature": temperature,
            "maxOutputTokens": max_output_tokens
        }
    }
    response = requests.post(GEMINI_URL, headers=headers, json=payload)
    # Debug HTTP errors
    try:
        response.raise_for_status()
    except requests.HTTPError as err:
        print(f"Gemini API request failed ({response.status_code}): {response.text}")
        raise
    data = response.json()

    # Extract generated text from response
    first = data.get("candidates", [{}])[0]
    if "content" in first:
        parts = first["content"].get("parts", [])
        output = "".join(p.get("text", "") for p in parts)
    else:
        output = first.get("output", "")

    try:
        questions = json.loads(output)
    except json.JSONDecodeError:
        # Fallback: split by lines
        questions = [
            line.strip().lstrip("0123456789. ")
            for line in output.splitlines()
            if line.strip()
        ]
    return questions


if __name__ == "__main__":
    demo_chunk = (
        "In engineering, voltage dividers are circuits with two resistors in series. "
        "They split the input voltage in proportion to resistor values, allowing designers "
        "to get stable reference voltages from a higher voltage source."
    )
    qs = generate_questions_from_chunk(demo_chunk)
    print("Generated questions:")
    for q in qs:
        print(f"- {q}")
