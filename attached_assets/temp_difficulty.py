
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
