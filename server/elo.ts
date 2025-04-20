// ELO rating system implementation
// The ELO rating is used to track a user's reading comprehension ability

/**
 * Calculate the expected score of player A against player B
 * @param ratingA - The ELO rating of player A
 * @param ratingB - The ELO rating of player B
 * @returns The expected score for player A (between 0 and 1)
 */
function calculateExpectedScore(ratingA: number, ratingB: number): number {
  return 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
}

/**
 * Calculate ELO rating change for a user based on their performance against text difficulty
 * @param userRating - Current user ELO rating
 * @param textDifficulty - Text difficulty rating (Lexile-like scale: 0-2000)
 * @param performance - User performance rating (negative to positive range)
 * @param kFactor - K factor determines the maximum possible adjustment per performance
 * @returns The change in ELO rating
 */
export function calculateEloChange(
  userRating: number, 
  textDifficulty: number, 
  performance: number, 
  kFactor: number = 20
): number {
  // Convert text difficulty to ELO scale (0-2000 -> centered around 1000)
  const textElo = textDifficulty;
  
  // Calculate expected score (how well the user should perform against this text)
  const expectedScore = calculateExpectedScore(userRating, textElo);
  
  // Convert performance to a score between 0 and 1
  // (performance typically ranges from -200 to +200)
  const actualScore = normalizePerformance(performance);
  
  // Calculate ELO change
  const ratingChange = Math.round(kFactor * (actualScore - expectedScore));
  
  return ratingChange;
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
 * Gets the appropriate K-factor based on user's rating
 * K-factor determines how quickly ratings change
 * - Higher K = faster changes
 * - Lower K = more stable ratings
 */
export function getKFactor(userRating: number): number {
  // New users have higher K-factor to adjust quickly
  if (userRating < 1200) {
    return 32;
  }
  // Mid-range users have standard K-factor
  if (userRating < 1800) {
    return 24;
  }
  // Advanced users have lower K-factor for stability
  return 16;
}

/**
 * Calculate the adjustment to the ELO K-factor based on the number of chunks completed
 * Users with fewer chunks should have more volatile ratings
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
 * Calculate user's overall reading level based on ELO
 * @param elo - User's current ELO rating
 * @returns String describing reading level
 */
export function getReadingLevel(elo: number): string {
  if (elo < 800) return "Beginning Reader";
  if (elo < 1000) return "Developing Reader";
  if (elo < 1200) return "Proficient Reader";
  if (elo < 1400) return "Skilled Reader";
  if (elo < 1600) return "Advanced Reader";
  if (elo < 1800) return "Expert Reader";
  return "Master Reader";
}