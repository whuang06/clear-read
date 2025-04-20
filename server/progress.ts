import { db } from "./db";
import { userProgress, users, readingSessions, feedback, chunks } from "@shared/schema";
import { eq, and, count, avg, max, desc, sql } from "drizzle-orm";
import { calculateEloChange, getKFactor, getSessionKFactorAdjustment } from "./elo";

/**
 * Update a user's Lexile score after completing a reading chunk
 */
export async function updateUserElo(
  userId: number, 
  chunkId: number, 
  performance: number,
  difficulty: number
): Promise<{
  newRating: number;
  ratingChange: number;
}> {
  try {
    // Get current user
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Get completed chunks count for K-factor adjustment
    const [{ count: completedChunks }] = await db
      .select({ count: count() })
      .from(feedback)
      .where(eq(feedback.userId, userId));
    
    // Calculate Lexile score change
    const baseKFactor = getKFactor(user.elo_rating);
    const kFactorMultiplier = getSessionKFactorAdjustment(completedChunks ? Number(completedChunks) : 0);
    const adjustedKFactor = baseKFactor * kFactorMultiplier;
    
    const ratingChange = calculateEloChange(
      user.elo_rating,  // Current Lexile score
      difficulty,       // Text difficulty on Lexile scale
      performance,      // Performance rating
      adjustedKFactor
    );
    
    // Calculate new Lexile score (minimum score of 100L)
    const newRating = Math.max(100, user.elo_rating + ratingChange);
    
    // Update user's rating in database
    await db.update(users)
      .set({ elo_rating: newRating })
      .where(eq(users.id, userId));
    
    // Record ELO impact in the feedback record
    await db.update(feedback)
      .set({ elo_impact: ratingChange })
      .where(and(
        eq(feedback.userId, userId),
        eq(feedback.chunkId, chunkId)
      ));
    
    return {
      newRating,
      ratingChange
    };
  } catch (error) {
    console.error("Error updating user ELO:", error);
    throw error;
  }
}

/**
 * Update the reading session with progress data
 */
export async function updateSessionProgress(
  sessionId: number,
  userId: number,
  completedChunkId: number
): Promise<void> {
  try {
    // Get the session
    const [session] = await db.select()
      .from(readingSessions)
      .where(eq(readingSessions.id, sessionId));
    
    if (!session) {
      throw new Error(`Session not found: ${sessionId}`);
    }
    
    // Count completed chunks
    const [{ count: completedChunks }] = await db
      .select({ count: count() })
      .from(chunks)
      .where(and(
        eq(chunks.sessionId, sessionId),
        eq(chunks.status, "completed")
      ));
    
    // Get total chunks for the session
    const [{ count: totalChunks }] = await db
      .select({ count: count() })
      .from(chunks)
      .where(eq(chunks.sessionId, sessionId));
    
    // Get average difficulty
    const [difficultyResult] = await db
      .select({ avgDifficulty: avg(chunks.difficulty) })
      .from(chunks)
      .where(eq(chunks.sessionId, sessionId));
    
    const averageDifficulty = difficultyResult?.avgDifficulty || null;
    
    // Get the ELO change for this session
    const [{ totalEloChange }] = await db
      .select({
        totalEloChange: sql<number>`sum(${feedback.elo_impact})`
      })
      .from(feedback)
      .innerJoin(chunks, eq(feedback.chunkId, chunks.id))
      .where(and(
        eq(chunks.sessionId, sessionId),
        eq(feedback.userId, userId)
      ));
    
    // Update session
    await db.update(readingSessions)
      .set({
        completed_chunks: completedChunks ? Number(completedChunks) : 0,
        total_chunks: totalChunks ? Number(totalChunks) : 0,
        average_difficulty: typeof averageDifficulty === 'number' ? averageDifficulty : null,
        elo_change: totalEloChange ? Number(totalEloChange) : 0,
        updatedAt: new Date()
      })
      .where(eq(readingSessions.id, sessionId));
    
  } catch (error) {
    console.error("Error updating session progress:", error);
    throw error;
  }
}

/**
 * Create or update a daily progress record for the user
 */
export async function updateDailyProgress(userId: number): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Get start of day
    
    // Get user
    const [user] = await db.select()
      .from(users)
      .where(eq(users.id, userId));
    
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }
    
    // Check if we already have a progress record for today
    const [existingProgress] = await db
      .select()
      .from(userProgress)
      .where(and(
        eq(userProgress.userId, userId),
        sql`date_trunc('day', ${userProgress.date}) = ${today.toISOString()}`
      ));
    
    // Get completed sessions count
    const [{ completedSessions }] = await db
      .select({
        completedSessions: count()
      })
      .from(readingSessions)
      .where(and(
        eq(readingSessions.userId, userId),
        eq(readingSessions.status, "complete")
      ));
    
    // Get completed chunks count
    const [{ completedChunks }] = await db
      .select({
        completedChunks: count()
      })
      .from(feedback)
      .where(eq(feedback.userId, userId));
    
    // Get average performance from all feedback
    const [performanceResult] = await db
      .select({
        avgPerformance: avg(feedback.rating)
      })
      .from(feedback)
      .where(eq(feedback.userId, userId));
    
    const avgPerformance = performanceResult?.avgPerformance || null;
    
    // Get average difficulty from all chunks
    const [difficultyResult] = await db
      .select({
        avgDifficulty: avg(chunks.difficulty)
      })
      .from(chunks)
      .innerJoin(feedback, eq(chunks.id, feedback.chunkId))
      .where(eq(feedback.userId, userId));
      
    const avgDifficulty = difficultyResult?.avgDifficulty || null;
    
    if (existingProgress) {
      // Update existing record
      await db.update(userProgress)
        .set({
          elo_rating: user.elo_rating,
          sessions_completed: completedSessions ? Number(completedSessions) : 0,
          chunks_completed: completedChunks ? Number(completedChunks) : 0,
          avg_performance: typeof avgPerformance === 'number' ? avgPerformance : null,
          avg_difficulty: typeof avgDifficulty === 'number' ? avgDifficulty : null
        })
        .where(eq(userProgress.id, existingProgress.id));
    } else {
      // Create new progress record
      await db.insert(userProgress)
        .values({
          userId: userId,
          date: today,
          elo_rating: user.elo_rating,
          sessions_completed: completedSessions ? Number(completedSessions) : 0,
          chunks_completed: completedChunks ? Number(completedChunks) : 0,
          avg_performance: typeof avgPerformance === 'number' ? avgPerformance : null,
          avg_difficulty: typeof avgDifficulty === 'number' ? avgDifficulty : null
        });
    }
  } catch (error) {
    console.error("Error updating daily progress:", error);
    throw error;
  }
}

/**
 * Get a user's progress history
 */
export async function getUserProgressHistory(userId: number, days: number = 30): Promise<any[]> {
  try {
    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    // Get progress records in date range
    const progressRecords = await db
      .select()
      .from(userProgress)
      .where(and(
        eq(userProgress.userId, userId),
        sql`${userProgress.date} >= ${startDate.toISOString()}`,
        sql`${userProgress.date} <= ${endDate.toISOString()}`
      ))
      .orderBy(userProgress.date);
    
    return progressRecords;
  } catch (error) {
    console.error("Error getting user progress history:", error);
    throw error;
  }
}