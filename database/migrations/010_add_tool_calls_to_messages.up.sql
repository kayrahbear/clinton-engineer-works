-- Migration 010: Add tool_calls column to messages table
-- Stores metadata about AI agent tool invocations (function calling) as JSONB
-- Example value: [{"name":"update_sim_skill","input":{"sim_name":"Lavender","skill_name":"Cooking","new_level":7},"result":{"success":true,"message":"Updated Lavender's Cooking to level 7"}}]

ALTER TABLE messages ADD COLUMN tool_calls JSONB;
