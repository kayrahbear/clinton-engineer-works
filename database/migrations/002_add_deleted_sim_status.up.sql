-- Add 'deleted' value to sim_status enum for soft delete support
ALTER TYPE sim_status ADD VALUE IF NOT EXISTS 'deleted';
