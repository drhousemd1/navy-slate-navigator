
-- Clear all corrupted reward usage data with incorrect week numbers
-- This will remove entries with old week calculations like "2025-W4" instead of the correct "2025-W26"
DELETE FROM reward_usage;
