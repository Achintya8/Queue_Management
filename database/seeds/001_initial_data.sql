-- Insert default service types
INSERT INTO service_types (service_name, description, avg_service_time, priority_level)
VALUES
    ('General Inquiry', 'General questions and information', 10, 0),
    ('Account Opening', 'New account registration', 15, 0),
    ('Bill Payment', 'Pay bills and invoices', 8, 0),
    ('Document Verification', 'Verify and submit documents', 12, 1),
    ('Customer Support', 'Technical support and complaints', 20, 0)
ON CONFLICT DO NOTHING;

-- Insert default counters
INSERT INTO counters (counter_name, service_types, is_active)
VALUES
    ('Counter 1', ARRAY[1, 2, 3], true),
    ('Counter 2', ARRAY[1, 3, 4], true),
    ('Counter 3', ARRAY[2, 4, 5], true)
ON CONFLICT DO NOTHING;