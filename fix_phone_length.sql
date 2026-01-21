-- Quick fix: Increase phone column length to accommodate full WhatsApp phone numbers
-- Format: whatsapp:+XXXXXXXXXXX (can be up to 50 chars with country codes)

ALTER TABLE whatsapp_conversations
ALTER COLUMN phone TYPE VARCHAR(50);
