import { db } from "../server/db";
import { eq } from "drizzle-orm";
import { users, userProgress } from "../shared/schema";

// A simple script to add progress data for the reader1 user
async function addProgressData() {
  try {
    console.log("Looking up user 'reader1'...");
    
    // Find the user by username
    const [user] = await db.select().from(users).where(eq(users.username, "reader1"));
    
    if (!user) {
      console.error("User 'reader1' not found");
      return;
    }
    
    console.log(`Found user with ID: ${user.id}`);
    
    // Check if we already have progress data
    const existingProgress = await db.select().from(userProgress).where(eq(userProgress.userId, user.id));
    
    if (existingProgress.length > 0) {
      console.log(`User already has ${existingProgress.length} progress records`);
      return;
    }
    
    console.log("Generating progress history...");
    
    // Generate 3 months of data
    const daysToGenerate = 90;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysToGenerate);
    
    // Start with a base ELO and improve over time
    let currentElo = 1000;
    
    for (let day = 0; day < daysToGenerate; day += 3) { // One entry every 3 days
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      // Generate different patterns for each month
      let eloChange;
      let chunksCompleted;
      let avgDifficulty;
      
      if (day < 30) {
        // First month - slow improvement
        eloChange = Math.floor(Math.random() * 30); // 0 to 30
        chunksCompleted = Math.floor(Math.random() * 3) + 1; // 1-3 chunks
        avgDifficulty = 800 + Math.floor(Math.random() * 400); // 800-1200 difficulty
      } else if (day < 60) {
        // Second month - faster improvement but some setbacks
        eloChange = Math.floor(Math.random() * 40 - 5); // -5 to 35
        chunksCompleted = Math.floor(Math.random() * 5) + 2; // 2-6 chunks
        avgDifficulty = 1000 + Math.floor(Math.random() * 400); // 1000-1400 difficulty
      } else {
        // Third month - consistent improvement
        eloChange = Math.floor(Math.random() * 50 - 10); // -10 to 40
        chunksCompleted = Math.floor(Math.random() * 6) + 3; // 3-8 chunks
        avgDifficulty = 1100 + Math.floor(Math.random() * 500); // 1100-1600 difficulty
      }
      
      // Update ELO rating
      currentElo += eloChange;
      currentElo = Math.max(800, Math.min(1700, currentElo)); // Keep within reasonable bounds
      
      // Create progress entry
      await db.insert(userProgress).values({
        userId: user.id,
        date,
        elo_rating: currentElo,
        sessions_completed: 1,
        chunks_completed: chunksCompleted,
        avg_performance: Math.floor((Math.random() * 100) + 50), // 50-150 performance score
        avg_difficulty: avgDifficulty
      });
    }
    
    // Update user's final ELO
    await db.update(users)
      .set({ elo_rating: currentElo })
      .where(eq(users.id, user.id));
    
    console.log(`Generated ${Math.ceil(daysToGenerate / 3)} progress records`);
    console.log(`Updated user ELO to ${currentElo}`);
    console.log("Done!");
    
  } catch (error) {
    console.error("Error adding progress data:", error);
  }
}

// Run the script
addProgressData();