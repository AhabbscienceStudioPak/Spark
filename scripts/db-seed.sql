-- Seed data for development and demo
-- Run after db-init.sql

-- ── Seed Merchants (using gen_random_uuid for proper UUIDs) ──────────────────
INSERT INTO merchants (id, name, category, lat, lng, address, city, geo_fence_radius_meters, offer_preview_mode, is_active)
VALUES
  (gen_random_uuid(), 'Café Müller',              'cafe',       48.7758, 9.1829,  'Königstraße 1',       'stuttgart', 500, false, true),
  (gen_random_uuid(), 'Bäckerei Schmidt',          'bakery',     48.7741, 9.1801,  'Marktplatz 5',        'stuttgart', 400, false, true),
  (gen_random_uuid(), 'Weinbar Alte Stadt',        'bar',        48.7769, 9.1843,  'Schillerplatz 3',     'stuttgart', 600, true,  true),
  (gen_random_uuid(), 'Café am Prenzlauer Berg',   'cafe',       52.5396, 13.4127, 'Kastanienallee 12',   'berlin',    500, false, true),
  (gen_random_uuid(), 'Markthalle Neun',           'retail',     52.4994, 13.4244, 'Eisenbahnstraße 48',  'berlin',    700, false, true)
ON CONFLICT DO NOTHING;

-- ── Seed Campaign Rules (linked to merchants by name lookup) ─────────────────
INSERT INTO campaign_rules (merchant_id, name, max_discount_percentage, target_time_windows, target_days_of_week, eligible_categories, goal, is_active)
SELECT id, 'Quiet Morning Boost', 15.00,
  '[{"start":"07:00","end":"10:00"}]', '[1,2,3,4,5]', '[]', 'increase_foot_traffic', true
FROM merchants WHERE name = 'Café Müller' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO campaign_rules (merchant_id, name, max_discount_percentage, target_time_windows, target_days_of_week, eligible_categories, goal, is_active)
SELECT id, 'Afternoon Lull', 20.00,
  '[{"start":"14:00","end":"17:00"}]', '[1,2,3,4,5]', '[]', 'increase_foot_traffic', true
FROM merchants WHERE name = 'Café Müller' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO campaign_rules (merchant_id, name, max_discount_percentage, target_time_windows, target_days_of_week, eligible_categories, goal, is_active)
SELECT id, 'Early Bird Bakery', 10.00,
  '[{"start":"06:30","end":"09:00"}]', '[1,2,3,4,5,6]', '[]', 'clear_inventory', true
FROM merchants WHERE name = 'Bäckerei Schmidt' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO campaign_rules (merchant_id, name, max_discount_percentage, target_time_windows, target_days_of_week, eligible_categories, goal, is_active)
SELECT id, 'Happy Hour', 25.00,
  '[{"start":"17:00","end":"19:00"}]', '[1,2,3,4,5]', '[]', 'increase_foot_traffic', true
FROM merchants WHERE name = 'Weinbar Alte Stadt' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO campaign_rules (merchant_id, name, max_discount_percentage, target_time_windows, target_days_of_week, eligible_categories, goal, is_active)
SELECT id, 'Slow Afternoon', 18.00,
  '[{"start":"14:00","end":"16:00"}]', '[1,2,3,4,5]', '[]', 'increase_foot_traffic', true
FROM merchants WHERE name = 'Café am Prenzlauer Berg' LIMIT 1
ON CONFLICT DO NOTHING;

INSERT INTO campaign_rules (merchant_id, name, max_discount_percentage, target_time_windows, target_days_of_week, eligible_categories, goal, is_active)
SELECT id, 'Weekend Special', 12.00,
  '[{"start":"10:00","end":"18:00"}]', '[0,6]', '[]', 'boost_category', true
FROM merchants WHERE name = 'Markthalle Neun' LIMIT 1
ON CONFLICT DO NOTHING;

-- ── Seed Users ────────────────────────────────────────────────────────────────
-- Passwords hashed with bcrypt 4.x (generated from the running container):
--   consumer@demo.com  → demo1234
--   merchant@demo.com  → demo1234
--   admin@demo.com     → admin1234

INSERT INTO users (email, password_hash, role, merchant_id, display_name)
VALUES (
  'consumer@demo.com',
  '$2b$12$4n0JmS.uiIYs.Ecl18AFB.u9337ZtiKzi/MJDcnCBUosdFNMaya8a',
  'consumer', NULL, 'Demo Consumer'
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;

INSERT INTO users (email, password_hash, role, merchant_id, display_name)
SELECT
  'merchant@demo.com',
  '$2b$12$4n0JmS.uiIYs.Ecl18AFB.u9337ZtiKzi/MJDcnCBUosdFNMaya8a',
  'merchant',
  id,
  'Café Müller'
FROM merchants WHERE name = 'Café Müller' LIMIT 1
ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, merchant_id = EXCLUDED.merchant_id;

INSERT INTO users (email, password_hash, role, merchant_id, display_name)
VALUES (
  'admin@demo.com',
  '$2b$12$V2hqrjLlLE53MQnchsEu9uyEI2eXrncNi4Qq5nAqpVUL5BiCY7kW6',
  'admin', NULL, 'Platform Admin'
) ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash;
