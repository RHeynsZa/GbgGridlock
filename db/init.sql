-- Legacy bootstrap script kept for backward compatibility.
-- Schema management is now handled by Sqitch migrations in db/{deploy,revert,verify}.
SELECT 'Use Sqitch migrations from db/sqitch.plan' AS message;
