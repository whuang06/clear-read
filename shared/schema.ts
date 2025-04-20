import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  elo_rating: integer("elo_rating").default(1000).notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

// Reading sessions
export const readingSessions = pgTable("reading_sessions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  originalText: text("original_text").notNull(),
  status: text("status").notNull().default("input"),
  performance: integer("performance").default(0),
  average_difficulty: integer("average_difficulty"),
  elo_change: integer("elo_change"),
  completed_chunks: integer("completed_chunks").default(0),
  total_chunks: integer("total_chunks").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertReadingSessionSchema = createInsertSchema(readingSessions).omit({
  id: true,
});

// Text chunks
export const chunks = pgTable("chunks", {
  id: serial("id").primaryKey(),
  sessionId: integer("session_id").references(() => readingSessions.id).notNull(),
  text: text("text").notNull(),
  startIndex: integer("start_index").notNull(),
  endIndex: integer("end_index").notNull(),
  tokenCount: integer("token_count").notNull(),
  difficulty: integer("difficulty"),
  sentencesData: jsonb("sentences_data").notNull(),
  status: text("status").notNull().default("pending"),
  isSimplified: boolean("is_simplified").default(false),
  simplificationLevel: integer("simplification_level"),
});

export const insertChunkSchema = createInsertSchema(chunks).omit({
  id: true,
});

// Questions
export const questions = pgTable("questions", {
  id: serial("id").primaryKey(),
  chunkId: integer("chunk_id").references(() => chunks.id).notNull(),
  text: text("text").notNull(),
});

export const insertQuestionSchema = createInsertSchema(questions).omit({
  id: true,
});

// Responses
export const responses = pgTable("responses", {
  id: serial("id").primaryKey(),
  questionId: integer("question_id").references(() => questions.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  text: text("text").notNull(),
});

export const insertResponseSchema = createInsertSchema(responses).omit({
  id: true,
});

// Feedback
export const feedback = pgTable("feedback", {
  id: serial("id").primaryKey(),
  chunkId: integer("chunk_id").references(() => chunks.id).notNull(),
  userId: integer("user_id").references(() => users.id),
  review: text("review").notNull(),
  rating: integer("rating").notNull(),
  elo_impact: integer("elo_impact"),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export const insertFeedbackSchema = createInsertSchema(feedback).omit({
  id: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertReadingSession = z.infer<typeof insertReadingSessionSchema>;
export type ReadingSession = typeof readingSessions.$inferSelect;

export type InsertChunk = z.infer<typeof insertChunkSchema>;
export type Chunk = typeof chunks.$inferSelect;

export type InsertQuestion = z.infer<typeof insertQuestionSchema>;
export type Question = typeof questions.$inferSelect;

export type InsertResponse = z.infer<typeof insertResponseSchema>;
export type Response = typeof responses.$inferSelect;

export type InsertFeedback = z.infer<typeof insertFeedbackSchema>;
export type Feedback = typeof feedback.$inferSelect;

// Progress tracking
export const userProgress = pgTable("user_progress", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  date: timestamp("date").defaultNow().notNull(),
  elo_rating: integer("elo_rating").notNull(),
  sessions_completed: integer("sessions_completed").default(0),
  chunks_completed: integer("chunks_completed").default(0),
  avg_performance: integer("avg_performance"),
  avg_difficulty: integer("avg_difficulty"),
});

export const insertUserProgressSchema = createInsertSchema(userProgress).omit({
  id: true,
});

export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type UserProgress = typeof userProgress.$inferSelect;
