-- KEYS[1]: Rate limit key (e.g., "rate:write:192.168.1.100")
-- ARGV[1]: Current Epoch Milliseconds (Timestamp)
-- ARGV[2]: Window Size in Milliseconds (e.g., 60000 for 1 min)
-- ARGV[3]: Max Capacity / Limit (e.g., 10 requests)
-- ARGV[4]: Unique Request ID (e.g., UUID or current timestamp + random)

local key = KEYS[1]
local now = tonumber(ARGV[1])
local window = tonumber(ARGV[2])
local limit = tonumber(ARGV[3])
local request_id = ARGV[4]

local window_start = now - window

-- 1. Evict request entries older than the current sliding window
redis.call('ZREMRANGEBYSCORE', key, 0, window_start)

-- 2. Count remaining requests within the current window
local current_requests = redis.call('ZCARD', key)

-- 3. Evaluate capacity check
if current_requests < limit then
    -- Add the current request payload
    redis.call('ZADD', key, now, request_id)
    -- Set TTL on the key to ensure auto-cleanup if client stops making requests
    redis.call('PEXPIRE', key, window)

    -- Return Array: [Allowed = 1, Remaining Capacity]
    return {1, limit - current_requests - 1}
else
    -- Rate limit exceeded
    return {0, 0}
end