import requests
import json
import os
import logging
import sys
from typing import Dict, Any, Tuple, Optional, List

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("adaptive_reader")

# TEST GEMINI API ON STARTUP
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
if GEMINI_API_KEY:
    logger.info("GEMINI_API_KEY is set, testing API connection...")
    test_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
    try:
        test_resp = requests.post(
            test_url, 
            headers={"Content-Type": "application/json"}, 
            json={"contents": [{"parts": [{"text": "Say 'API TEST SUCCESSFUL' and nothing else"}]}]}
        )
        if test_resp.status_code == 200:
            logger.info(f"Gemini API test successful: {test_resp.status_code}")
            logger.info(f"Response: {test_resp.text[:100]}...")
        else:
            logger.error(f"Gemini API test failed with status code: {test_resp.status_code}")
            logger.error(f"Error response: {test_resp.text}")
    except Exception as e:
        logger.error(f"Error testing Gemini API: {str(e)}")
else:
    logger.error("GEMINI_API_KEY environment variable is not set!")

# Configuration
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY", "")
API_URL = (
    f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={GEMINI_API_KEY}"
)

# Fixed simplification levels to choose from (10% increments)
SIMPLIFICATION_LEVELS = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7]

class AdaptiveReader:
    """
    Simplified adaptive reader that only uses fixed simplification levels.
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
        logger.info(f"Updated performance to {self.performance:.2f} with rating {rating}")
    
    def get_simplification_level(self, current_level: float, performance: float) -> float:
        """
        Get the appropriate simplification level based on performance.
        Only returns values from the fixed list of simplification levels.
        Changes are limited to 20% maximum between chunks.
        More aggressive simplification for poor performance.
        
        CRITICAL: FOR NEGATIVE PERFORMANCE, ALWAYS RETURN A NON-ZERO VALUE
        """
        logger.info(f"Determining simplification level - current level: {current_level}, performance: {performance}")
        
        # FORCE SIMPLIFICATION FOR NEGATIVE PERFORMANCE
        # If performance is negative, we want to ensure we get at least 10% simplification
        if performance < 0 and current_level == 0:
            logger.info("NEGATIVE PERFORMANCE DETECTED: FORCING MINIMUM 10% SIMPLIFICATION")
            forced_level = 0.1  # 10% simplification
            return forced_level
            
        # Determine direction of change - make more aggressive for negative performance
        if performance > 100:  # Very good performance
            # Reduce simplification by 10-20%
            adjustment = -0.2
            logger.info("Very good performance: reducing simplification by 20%")
        elif performance > 0:  # Good performance
            # Reduce simplification by 10%
            adjustment = -0.1
            logger.info("Good performance: reducing simplification by 10%")
        elif performance > -50:  # Slightly poor performance
            # Increase simplification by 10%
            adjustment = 0.1
            logger.info("Slightly poor performance: increasing simplification by 10%")
        elif performance > -100:  # Poor performance
            # Increase simplification by 20%
            adjustment = 0.2
            logger.info("Poor performance: increasing simplification by 20%")
        else:  # Very poor performance
            # Increase simplification by 30% (will be capped to max 20% change)
            adjustment = 0.3
            logger.info("Very poor performance: increasing simplification by 30% (will be capped)")
            
        # Calculate target level (but don't apply yet)
        target_level = current_level + adjustment
        
        # Ensure we don't go below 0 or above 0.7
        target_level = max(0.0, min(0.7, target_level))
        
        # Find the closest allowed level in our fixed list
        # that doesn't exceed 20% change from current level
        allowed_levels = [
            level for level in SIMPLIFICATION_LEVELS 
            if abs(level - current_level) <= 0.2
        ]
        
        # If performance is negative, REMOVE 0.0 from allowed levels to force some simplification
        if performance < 0 and 0.0 in allowed_levels and len(allowed_levels) > 1:
            allowed_levels.remove(0.0)
            logger.info("Removed 0.0 from allowed levels due to negative performance")
        
        # Find the closest allowed level to our target
        closest_level = min(allowed_levels, key=lambda x: abs(x - target_level))
        
        logger.info(f"Simplification adjustment: current={current_level}, " +
                   f"adjustment={adjustment}, target={target_level}, closest_allowed={closest_level}")
        
        return closest_level
    
    def simplify_chunk(self, text: str, factor: float) -> str:
        """
        Simplify text using Gemini API with explicit simplification instructions.
        """
        # Ensure factor is valid and rounded to nearest 10%
        factor = min(0.7, max(0, factor))
        factor = round(factor * 10) / 10
        
        # If no simplification needed, return original
        if factor == 0.0:
            logger.info("No simplification needed (factor=0)")
            return text
            
        # Calculate percentage for prompt
        percent = int(factor * 100)
        logger.info(f"Simplifying text at {percent}% level")
        
        prompt = (
            f"Simplify this text to make it {percent}% easier to read. Maintain the core meaning but:\n"
            f"- Use simpler vocabulary appropriate for someone with {100-percent}% of college reading ability\n"
            f"- Create shorter sentences with clearer structure\n"
            f"- Simplify complex concepts but preserve all key information\n"
            f"- CRITICAL: PRESERVE EXACTLY THE SAME PARAGRAPH STRUCTURE as the original text\n"
            f"- IMPORTANT: MAINTAIN ALL LINE BREAKS from the original text in your simplified version\n"
            f"- The degree of simplification should be EXACTLY {percent}%\n\n"
            f"TEXT: {text}\n\n"
            f"SIMPLIFIED ({percent}%):"
        )
        
        payload = {
            "contents": [{"parts": [{"text": prompt}]}],
            "generationConfig": {
                "temperature": 0.2,
                "maxOutputTokens": len(text) * 2,
                "topK": 40,
                "topP": 0.95
            }
        }
        
        try:
            # Log what we're about to do
            logger.info(f"Sending simplification request to Gemini API with {percent}% simplification")
            logger.info(f"Original text (30 chars): {text[:30]}...")
            
            resp = requests.post(API_URL, headers={"Content-Type": "application/json"}, json=payload)
            resp.raise_for_status()
            
            data = resp.json()
            logger.info(f"Received API response: {str(data)[:500]}...")  # Log first 500 chars of response
            
            if "candidates" in data and len(data["candidates"]) > 0:
                candidate = data["candidates"][0]
                if "content" in candidate:
                    parts = candidate["content"].get("parts", [])
                    simplified = "".join(p.get("text", "") for p in parts)
                    # Clean up any formatting artifacts
                    simplified = simplified.strip()
                    simplified = simplified.replace("SIMPLIFIED:", "").strip()
                    
                    logger.info(f"Successfully simplified text. Result (30 chars): {simplified[:30]}...")
                    return simplified
            
            logger.error(f"Unexpected API response format: {data}")
            return text  # Return original as fallback
            
        except Exception as e:
            logger.error(f"Error during simplification: {str(e)}")
            return text  # Return original as fallback
