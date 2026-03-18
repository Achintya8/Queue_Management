-- Create Users Table
CREATE TABLE IF NOT EXISTS users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(15) UNIQUE NOT NULL,
    email VARCHAR(100),
    password_hash VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notification_preferences JSONB DEFAULT '{"push": true, "sms": true, "email": false}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone);

-- Create Service Types Table
CREATE TABLE IF NOT EXISTS service_types (
    service_id SERIAL PRIMARY KEY,
    service_name VARCHAR(50) NOT NULL,
    description TEXT,
    avg_service_time INTEGER DEFAULT 10,
    is_active BOOLEAN DEFAULT true,
    priority_level INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Staff Table
CREATE TABLE IF NOT EXISTS staff (
    staff_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'operator',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create Counters Table
CREATE TABLE IF NOT EXISTS counters (
    counter_id SERIAL PRIMARY KEY,
    counter_name VARCHAR(50) NOT NULL,
    status VARCHAR(20) DEFAULT 'free',
    current_queue_id UUID,
    staff_id UUID REFERENCES staff(staff_id),
    service_types INTEGER[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_counters_status ON counters(status);

-- Create Queues Table
CREATE TABLE IF NOT EXISTS queues (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id),
    service_id INTEGER REFERENCES service_types(service_id),
    counter_id INTEGER REFERENCES counters(counter_id),
    token_number INTEGER NOT NULL,
    status VARCHAR(20) DEFAULT 'waiting',
    priority INTEGER DEFAULT 0,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    called_at TIMESTAMP,
    serving_at TIMESTAMP,
    completed_at TIMESTAMP,
    estimated_wait_time INTEGER,
    actual_wait_time INTEGER,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_queues_status ON queues(status);
CREATE INDEX IF NOT EXISTS idx_queues_joined_at ON queues(joined_at);
CREATE INDEX IF NOT EXISTS idx_queues_user ON queues(user_id);
CREATE INDEX IF NOT EXISTS idx_queues_service ON queues(service_id);

-- Create Queue Logs Table
CREATE TABLE IF NOT EXISTS queue_logs (
    log_id SERIAL PRIMARY KEY,
    queue_id UUID REFERENCES queues(queue_id) ON DELETE CASCADE,
    counter_id INTEGER REFERENCES counters(counter_id),
    status_change VARCHAR(50) NOT NULL,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_queue_logs_queue_id ON queue_logs(queue_id);
CREATE INDEX IF NOT EXISTS idx_queue_logs_timestamp ON queue_logs(timestamp);

-- Create Token Counter (for daily token numbers)
CREATE TABLE IF NOT EXISTS token_counter (
    date DATE PRIMARY KEY,
    last_token INTEGER DEFAULT 0
);

-- Function to get next token number
CREATE OR REPLACE FUNCTION get_next_token()
RETURNS INTEGER AS $$
DECLARE
    next_token INTEGER;
    current_date DATE := CURRENT_DATE;
BEGIN
    INSERT INTO token_counter (date, last_token)
    VALUES (current_date, 1)
    ON CONFLICT (date)
    DO UPDATE SET last_token = token_counter.last_token + 1
    RETURNING last_token INTO next_token;

    RETURN next_token;
END;
$$ LANGUAGE plpgsql;

-- Create Analytics Cache Table
CREATE TABLE IF NOT EXISTS analytics_cache (
    id SERIAL PRIMARY KEY,
    metric_name VARCHAR(50) NOT NULL,
    metric_value JSONB NOT NULL,
    date DATE NOT NULL,
    hour INTEGER,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(metric_name, date, hour)
);

CREATE INDEX IF NOT EXISTS idx_analytics_date ON analytics_cache(date);
CREATE INDEX IF NOT EXISTS idx_analytics_metric ON analytics_cache(metric_name);