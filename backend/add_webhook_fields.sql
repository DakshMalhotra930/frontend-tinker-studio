-- Add webhook support fields to payment_qr_codes table
-- This script adds fields needed for payment provider integration

ALTER TABLE payment_qr_codes 
ADD COLUMN IF NOT EXISTS payment_provider VARCHAR(50),
ADD COLUMN IF NOT EXISTS transaction_id VARCHAR(255),
ADD COLUMN IF NOT EXISTS webhook_received_at TIMESTAMP,
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_payment_qr_codes_transaction_id ON payment_qr_codes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_payment_qr_codes_status ON payment_qr_codes(status);
CREATE INDEX IF NOT EXISTS idx_payment_qr_codes_user_status ON payment_qr_codes(user_id, status);

-- Update existing records to have updated_at timestamp
UPDATE payment_qr_codes SET updated_at = CURRENT_TIMESTAMP WHERE updated_at IS NULL;
