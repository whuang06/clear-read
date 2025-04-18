
import json
import sys
import os
import traceback

try:
    # Ensure the current directory is in the Python path
    script_dir = os.path.dirname(os.path.abspath(__file__))
    sys.path.insert(0, script_dir)
    
    from difficulty_assessor import rate_chunk_difficulty

    # Parse arguments from command line JSON string
    args = json.loads(sys.argv[1])
    text = args.get("text", "")

    # Rate difficulty
    score = rate_chunk_difficulty(text)

    # Output JSON
    print(json.dumps(score))
except Exception as e:
    print(json.dumps({
        "error": str(e),
        "traceback": traceback.format_exc()
    }))
    sys.exit(1)
