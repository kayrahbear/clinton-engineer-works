-- Rollback Migration 010: Remove tool_calls column from messages table

ALTER TABLE messages DROP COLUMN IF EXISTS tool_calls;
