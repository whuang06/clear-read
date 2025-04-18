
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
