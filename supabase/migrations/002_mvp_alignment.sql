ALTER TABLE agencies DROP CONSTRAINT IF EXISTS agencies_status_check;
ALTER TABLE agencies
ADD CONSTRAINT agencies_status_check CHECK (status IN ('pending', 'active', 'rejected', 'suspended', 'deactivated'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS users_status_check;
ALTER TABLE users
ADD CONSTRAINT users_status_check CHECK (status IN ('pending', 'active', 'rejected', 'suspended', 'deactivated'));

ALTER TABLE broker_profiles DROP CONSTRAINT IF EXISTS broker_profiles_application_status_check;
ALTER TABLE broker_profiles
ADD CONSTRAINT broker_profiles_application_status_check CHECK (application_status IN ('pending', 'active', 'rejected', 'suspended', 'deactivated'));

ALTER TABLE listings DROP CONSTRAINT IF EXISTS listings_status_check;
ALTER TABLE listings
ADD CONSTRAINT listings_status_check CHECK (status IN ('pending', 'active', 'rejected', 'inactive'));

UPDATE agencies SET status = 'active' WHERE status = 'approved';
UPDATE users SET status = 'active' WHERE status = 'approved';
UPDATE broker_profiles SET application_status = 'active' WHERE application_status = 'approved';
UPDATE listings SET status = 'active' WHERE status = 'approved';
UPDATE listings SET status = 'inactive' WHERE status = 'expired';
