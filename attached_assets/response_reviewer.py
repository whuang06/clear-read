import requests
import json
import re
from typing import List, Dict, Any, Optional

# Gemini 2.0 Flash API configuration
import os
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)


def review_responses(
    chunk: str,
    questions: List[str],
    responses: List[str],
    temperature: float = 0.3,
    max_output_tokens: int = 512
) -> Optional[Dict[str, Any]]:
    """
    Sends the text chunk, questions, and their responses to Gemini 2.0 Flash.
    Returns a dict with keys: 'review' (str) and 'rating' (int).
    
    NEW: Automatically gives very negative ratings for very short answers
    without even sending to the API.
    """
    if len(questions) != len(responses):
        raise ValueError("Questions and responses lists must be the same length")
    
    # Check for very short responses - automatically give negative ratings
    # This is to ensure we always simplify after poor answers
    all_responses_text = " ".join(responses)
    if all_responses_text.strip().lower() in ["no", "yes", "idk", "not sure", "n/a"]:
        return {
            "review": "Your answers are too short and don't demonstrate understanding. Please provide more detailed answers.",
            "rating": -150
        }
    
    # Check for very short responses (less than 5 words total across all responses)
    if len(all_responses_text.split()) < 5:
        return {
            "review": "Your answers are too brief. Please explain your understanding in more detail.",
            "rating": -100
        }

    # Build prompt
    prompt = [chunk, "\n"]
    for idx, (q, r) in enumerate(zip(questions, responses), 1):
        prompt.append(f"Question {idx}: {q}\nResponse: {r}\n")
    prompt.append(
        "\nGenerate a JSON object with two keys: 'review' (a short evaluation message for the learner) "
        "and 'rating' (integer between -200 and 200). IMPORTANT RATING GUIDELINES:\n"
        "- For complete, accurate answers: rate 50 to 200 (higher for exceptional answers)\n"
        "- For partially correct but incomplete answers: rate -50 to 50\n"
        "- For very short, clearly incorrect, or minimal effort answers (like one-word responses): rate -200 to -100\n"
        "- BE VERY STRICT with short, low-effort answers - they should get strongly negative ratings\n"
        "Respond with only the JSON object."
    )
    prompt_text = "".join(prompt)

    payload = {
        "contents": [{"parts": [{"text": prompt_text}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_output_tokens}
    }

    response = requests.post(API_URL, headers={"Content-Type": "application/json"}, json=payload)
    try:
        response.raise_for_status()
    except requests.HTTPError:
        print(f"Gemini API error ({response.status_code}): {response.text}")
        raise

    data = response.json()
    candidate = data.get("candidates", [{}])[0]
    # Extract text
    if "content" in candidate:
        parts = candidate["content"].get("parts", [])
        output = "".join(p.get("text", "") for p in parts)
    else:
        output = candidate.get("output", "")

    # Clean fences
    text = output.strip().strip('`').strip()
    # Parse JSON
    try:
        result = json.loads(text)
        # Ensure correct types
        review = result.get("review") if isinstance(result.get("review"), str) else None
        rating = result.get("rating") if isinstance(result.get("rating"), (int, float)) else None
        if review is None or rating is None:
            raise ValueError("Invalid format in JSON response")
        # clamp rating between -200 and 200
        score = int(rating)
        score = max(-200, min(200, score))
        return {"review": review, "rating": score}
    except Exception:
        # Fallback: attempt regex
        m_text = re.search(r"\{.*\}", text, flags=re.DOTALL)
        if m_text:
            try:
                return json.loads(m_text.group())
            except json.JSONDecodeError:
                pass
        # Could not parse
        print("Could not parse JSON response from Gemini:", text)
        return None


if __name__ == "__main__":
    demo_chunk = (
        "In engineering, voltage dividers are circuits with two resistors in series. "
        "They split the input voltage in proportion to resistor values."
    )
    demo_questions = [
        "What does a voltage divider do?",
        "Why use two resistors in series?"
    ]
    demo_responses = [
        "It divides voltage proportionally.",
        "To get a reference voltage."
    ]
    review = review_responses(demo_chunk, demo_questions, demo_responses)
    print(review)
