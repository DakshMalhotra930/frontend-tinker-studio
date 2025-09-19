-- Add payment_qr_codes table for QR payment system
CREATE TABLE IF NOT EXISTS payment_qr_codes (
    id SERIAL PRIMARY KEY,
    qr_code VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    tier VARCHAR(50) NOT NULL,
    user_id VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL,
    payment_id VARCHAR(255),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
