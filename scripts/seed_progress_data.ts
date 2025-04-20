import { db } from "../server/db";
import { users, userProgress } from "../shared/schema";
import { getReadingLevel } from "../server/elo";

/**
 * Seed script to create a sample user and progress history
 * for demonstration of the progress visualization page
 */
async function seedProgressData() {
  try {
    console.log("Starting seed process...");
    
    // Check if user 1 already exists
    const existingUser = await db.select().from(users).where(eq(users.id, 1));
    
    let userId = 1;
    
    // Create user if needed
    if (existingUser.length === 0) {
      console.log("Creating sample user...");
      
      const [user] = await db.insert(users)
        .values({
          username: "reader1",
          elo_rating: 1000,
          created_at: new Date(new Date().setMonth(new Date().getMonth() - 3)) // 3 months ago
        })
        .returning();
      
      userId = user.id;
      console.log(`Created user with ID: ${userId}`);
    } else {
      console.log("Sample user already exists");
    }
    
    // Check if we already have progress data
    const existingProgress = await db.select().from(userProgress).where(eq(userProgress.userId, userId));
    
    if (existingProgress.length > 0) {
      console.log(`User already has ${existingProgress.length} progress records, skipping...`);
      return;
    }
    
    // Generate 90 days of sample progress data
    console.log("Generating progress history...");
    
    // Start with base ELO of 1000 and gradually improve
    let currentElo = 1000;
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);
    startDate.setDate(startDate.getDate() - 90); // 90 days ago
    
    // Sample progress patterns
    // - First month: Slow improvement
    // - Second month: Faster improvement with some setbacks
    // - Third month: Steady improvement to advanced level
    
    // Generate records for each day
    for (let day = 0; day < 90; day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      // Skip some days to simulate not reading every day
      // Skip more days in the beginning, fewer toward the end
      const skipThreshold = day < 30 ? 0.5 : day < 60 ? 0.3 : 0.2;
      if (Math.random() < skipThreshold) {
        continue;
      }
      
      // Generate ELO change
      // More volatile in the middle month, steady in last month
      let eloChange;
      let chunksCompleted;
      let avgDifficulty;
      
      if (day < 30) {
        // First month - slow progress, small chunks
        eloChange = Math.floor(Math.random() * 20 - 5);  // -5 to +15
        chunksCompleted = Math.floor(Math.random() * 3) + 1; // 1-3 chunks
        avgDifficulty = 800 + Math.floor(Math.random() * 400); // 800-1200 difficulty
      } else if (day < 60) {
        // Second month - faster progress, more volatility, more chunks
        eloChange = Math.floor(Math.random() * 40 - 10); // -10 to +30
        chunksCompleted = Math.floor(Math.random() * 5) + 2; // 2-6 chunks
        avgDifficulty = 1000 + Math.floor(Math.random() * 500); // 1000-1500 difficulty
      } else {
        // Third month - consistent improvement, harder content
        eloChange = Math.floor(Math.random() * 25); // 0 to +25
        chunksCompleted = Math.floor(Math.random() * 5) + 3; // 3-7 chunks
        avgDifficulty = 1200 + Math.floor(Math.random() * 600); // 1200-1800 difficulty
      }
      
      // Update current ELO
      currentElo += eloChange;
      
      // Ensure minimum rating
      currentElo = Math.max(800, currentElo);
      
      // Ensure maximum rating cap for sample data
      currentElo = Math.min(1700, currentElo);
      
      // Create progress record
      await db.insert(userProgress)
        .values({
          userId,
          date,
          elo_rating: currentElo,
          sessions_completed: 1,
          chunks_completed: chunksCompleted,
          avg_performance: (Math.random() * 100) + 50, // 50-150 performance score
          avg_difficulty: avgDifficulty
        });
    }
    
    // Update user's final ELO
    await db.update(users)
      .set({ elo_rating: currentElo })
      .where(eq(users.id, userId));
    
    console.log(`Generated ${90} days of progress history, final ELO: ${currentElo} (${getReadingLevel(currentElo)})`);
    console.log("Seed process complete!");
  } catch (error) {
    console.error("Error seeding progress data:", error);
  } finally {
    // Close the database connection
    await db.end();
  }
}

// Import eq
import { eq } from "drizzle-orm";

// Run the seed function
seedProgressData();