// Lexile-based reading level system implementation
// Tracks a user's reading comprehension ability using a Lexile-like scale

/**
 * Calculate the expected score of a reader against a text of specific difficulty
 * @param readerLevel - The Lexile-like score of the reader
 * @param textDifficulty - The Lexile-like score of the text
 * @returns The expected score for the reader (between 0 and 1)
 */
function calculateExpectedScore(readerLevel: number, textDifficulty: number): number {
  // Use a modified ELO formula that better represents reading ability vs. text difficulty
  // The denominator divisor (500 instead of standard 400) makes the curve more gradual,
  // which better represents the progressive nature of reading difficulty
  return 1 / (1 + Math.pow(10, (textDifficulty - readerLevel) / 500));
}

/**
 * Calculate Lexile score change for a user based on their performance against text difficulty
 * @param readerLevel - Current reader's Lexile-like score
 * @param textDifficulty - Text difficulty rating (Lexile scale: 0-2000)
 * @param performance - User performance rating (negative to positive range)
 * @param kFactor - K factor determines the maximum possible adjustment per performance
 * @returns The change in Lexile-like score
 */
export function calculateEloChange(
  readerLevel: number, 
  textDifficulty: number, 
  performance: number, 
  kFactor: number = 20
): number {
  // Calculate the distance between text difficulty and reader level
  // This influences how much the reader's level should change
  const difficultyGap = Math.abs(textDifficulty - readerLevel);
  
  // Difficulty adjustment: Reading far above or below level has diminishing returns
  // Reading near your level has maximum impact on growth
  const difficultyAdjustment = Math.exp(-Math.pow((difficultyGap / 400), 2)) * 1.5;
  
  // Calculate expected score (how well the reader should perform against this text)
  const expectedScore = calculateExpectedScore(readerLevel, textDifficulty);
  
  // Convert performance to a score between 0 and 1
  // (performance typically ranges from -200 to +200)
  const actualScore = normalizePerformance(performance);
  
  // Calculate Lexile score change, with difficulty adjustment applied
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore) * difficultyAdjustment);
  
  // Limit maximum gain/loss per reading to prevent extreme swings
  return Math.max(-40, Math.min(40, ratingChange));
}

/**
 * Convert performance score (-200 to +200) to a normalized score (0 to 1)
 * @param performance - Performance rating
 * @returns Normalized score between 0 and 1
 */
export function normalizePerformance(performance: number): number {
  // Map performance from [-200, 200] to [0, 1]
  // First clamp to the valid range
  const clampedPerformance = Math.max(-200, Math.min(200, performance));
  
  // Linear mapping: 
  // -200 maps to 0
  // 0 maps to 0.5
  // 200 maps to 1
  return (clampedPerformance + 200) / 400;
}

/**
 * Gets the appropriate K-factor based on reader's Lexile score
 * K-factor determines how quickly Lexile scores change
 * - Higher K = faster changes for developing readers
 * - Lower K = more stable scores for advanced readers
 */
export function getKFactor(lexileScore: number): number {
  // Beginning readers have higher K-factor to adjust quickly
  if (lexileScore < 800) {
    return 32;
  }
  // Intermediate readers have standard K-factor
  if (lexileScore < 1200) {
    return 24;
  }
  // Advanced readers have lower K-factor for stability
  return 16;
}

/**
 * Calculate the adjustment to the Lexile K-factor based on the number of chunks completed
 * Users with fewer chunks should have more volatile scores
 */
export function getSessionKFactorAdjustment(completedChunks: number): number {
  // New readers (few chunks) get more volatile ratings
  if (completedChunks < 5) {
    return 1.5; // 50% increase in K-factor
  }
  
  if (completedChunks < 15) {
    return 1.2; // 20% increase
  }
  
  if (completedChunks < 30) {
    return 1.1; // 10% increase
  }
  
  return 1.0; // No adjustment for experienced readers
}

/**
 * Calculate user's overall reading level based on Lexile-like score
 * @param lexileScore - User's current Lexile-like score
 * @returns String describing reading level aligned with educational standards
 */
export function getReadingLevel(lexileScore: number): string {
  // Categories roughly aligned with standard Lexile framework bands
  if (lexileScore < 400) return "Early Reader (K-1)";
  if (lexileScore < 650) return "Emerging Reader (1-2)";
  if (lexileScore < 850) return "Transitional Reader (3-5)";
  if (lexileScore < 1000) return "Grade-Level Reader (6-8)";
  if (lexileScore < 1200) return "Advanced Reader (9-10)";
  if (lexileScore < 1400) return "College-Ready Reader (11-12)";
  if (lexileScore < 1600) return "College-Level Reader";
  return "Professional/Academic Reader";
}