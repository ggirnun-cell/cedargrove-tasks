-- seed.sql — Cedar Grove real org data, built from SEED_DATA.md (Milestone 1).
--
-- Idempotent: safe to run repeatedly. Reference tables use ON CONFLICT DO
-- UPDATE; the purely seed-derived staff directory is rebuilt each run.
-- Re-confirm vacancies and emails with Geoff at deploy time — staff turns over.

begin;

-- 1. Regions (SEED_DATA §1) ----------------------------------------------------
insert into regions (id, name, has_regional_manager, regional_manager_email) values
  ('florida',        'Florida',        true,  'jward@covenantpropertyservices.com'),
  ('georgia',        'Georgia',        true,  'jward@covenantpropertyservices.com'), -- Jerika; role winding down, keep reassignable
  ('north-carolina', 'North Carolina', false, null),                                 -- no RM; escalations → Geoff + Steve only
  ('virginia',       'Virginia',       true,  null)                                  -- Crystal Martin; email to confirm at deploy
on conflict (id) do update set
  name = excluded.name,
  has_regional_manager = excluded.has_regional_manager,
  regional_manager_email = excluded.regional_manager_email;

-- 2. Properties (SEED_DATA §2) -------------------------------------------------
insert into properties (id, name, region_id, state, city, units, main_phone) values
  ('kings-tree',        'Kings Tree',                    'florida',        'FL', 'Orange Park',  96,  '904-375-1102'),
  ('lakewood-oaks',     'Lakewood Oaks',                 'florida',        'FL', 'Jacksonville', 138, '904-849-4410'),
  ('magnolia-point',    'Magnolia Point',                'florida',        'FL', 'Jacksonville', 227, '904-734-0455'),
  ('oasis-club',        'Oasis Club',                    'florida',        'FL', 'Jacksonville', 242, '904-298-8387'),
  ('park-place',        'Park Place',                    'florida',        'FL', 'Orange Park',  70,  '904-264-0625'),
  ('silversmith-creek', 'Silversmith Creek',             'florida',        'FL', 'Jacksonville', 140, '904-416-0222'),
  ('aurora-2700',       'Aurora @ Twenty Seven Hundred', 'georgia',        'GA', 'Lilburn',      280, '470-592-8622'),
  ('cielo-325',         'Cielo @ 325',                   'georgia',        'GA', 'Austell',      120, '404-474-1760'),
  ('andover-park',      'Andover Park',                  'north-carolina', 'NC', 'Greensboro',   120, '336-900-5964'),
  ('fields-conover',    'Fields Conover',                'north-carolina', 'NC', 'Conover',      160, '828-466-2202'),
  ('l-building',        'L Building',                    'north-carolina', 'NC', 'Raleigh',      83,  '919-615-3006'),
  ('lansdale-garden',   'Lansdale Garden',               'virginia',       'VA', 'Norfolk',      96,  '757-855-5588'),
  ('miramar',           'Miramar',                       'virginia',       'VA', 'Norfolk',      155, '757-855-5590'),
  ('windsor-court',     'Windsor Court',                 'virginia',       'VA', 'Newport News', 99,  '757-596-4242')
on conflict (id) do update set
  name = excluded.name, region_id = excluded.region_id, state = excluded.state,
  city = excluded.city, units = excluded.units, main_phone = excluded.main_phone;

-- 3. Role mailboxes (SEED_DATA §3) ---------------------------------------------
-- Rows with null email are known function slots awaiting a mailbox (confirm w/
-- Geoff). VA role mailboxes are entirely TBD and intentionally omitted here.
insert into role_mailboxes (property_id, function, email) values
  ('kings-tree',        'property_manager',           'kingsparkpm@covenantpropertyservices.com'),
  ('kings-tree',        'leasing',                    null),  -- confirm
  ('kings-tree',        'maintenance',                null),  -- confirm
  ('lakewood-oaks',     'property_manager',           'LakewoodOaksPM@covenantpropertyservices.com'),
  ('lakewood-oaks',     'leasing',                    'Lakewoodoaksleasing@covenantpropertyservices.com'),
  ('lakewood-oaks',     'maintenance',                null),  -- confirm
  ('magnolia-point',    'property_manager',           'magnoliapointpm@covenantpropertyservices.com'),
  ('magnolia-point',    'assistant_property_manager', 'magnoliapointapm@covenantpropertyservices.com'),
  ('magnolia-point',    'leasing',                    'magnoliapointleasing@covenantpropertyservices.com'),
  ('oasis-club',        'property_manager',           'oasisclubpm@covenantpropertyservices.com'),
  ('oasis-club',        'assistant_property_manager', 'oasisclubapm@covenantpropertyservices.com'),
  ('oasis-club',        'leasing',                    'oasisclubleasing@covenantpropertyservices.com'),
  ('park-place',        'property_manager',           'kingsparkpm@covenantpropertyservices.com'),  -- shared w/ Kings Tree
  ('silversmith-creek', 'property_manager',           'SilversmithPM@covenantpropertyservices.com'), -- seat vacant, mailbox active
  ('aurora-2700',       'property_manager',           'aurora2700PM@covenantpropertyservices.com'),
  ('aurora-2700',       'assistant_property_manager', 'aurora2700APM@covenantpropertyservices.com'),
  ('aurora-2700',       'leasing',                    'aurora2700leasing@covenantpropertyservices.com'),
  ('cielo-325',         'property_manager',           'Cielo325PM@covenantpropertyservices.com'),
  ('cielo-325',         'leasing',                    'GALeasingFloater@covenantpropertyservices.com'), -- GA leasing floater
  ('andover-park',      'property_manager',           'crose@covenantpropertyservices.com'),  -- CJ Rose
  ('fields-conover',    'property_manager',           'crose@covenantpropertyservices.com'),  -- CJ Rose, shared
  ('l-building',        'property_manager',           null)   -- PM seat vacant
on conflict (property_id, function) do update set
  email = excluded.email, is_active = true;

-- 4. Login users — seeded from roster/people.csv with pre-granted access
-- (Geoff's decision 2026-07-01). Property-mailbox logins have no name until the
-- person signs in. Re-seeding RESETS role to the roster; clerk_id/name from
-- sign-in are preserved. Access is granted in section 4b.
insert into users (email, full_name, role, can_manage_users) values
  ('geoff@cedargrovecp.com', 'Geoff Girnun', 'super_admin', true),
  ('steve@cedargrovecp.com', 'Steven Levitz', 'super_admin', true),
  ('aarongorin@gmail.com', 'Aaron Gorin', 'super_admin', true),
  ('cara@covenantpropertyservices.com', 'Cara McConnachie', 'super_admin', true),
  ('jackie@covenantpropertyservices.com', 'Jackie Eriksen', 'super_admin', true),
  ('shelley@covenantpropertyservices.com', 'Shelley Balanda', 'read_only', false),
  ('jward@covenantpropertyservices.com', 'Jerika Ward', 'regional_manager', false),
  ('kingsparkpm@covenantpropertyservices.com', null, 'property_manager', false),
  ('LakewoodOaksPM@covenantpropertyservices.com', 'Vivianna Pinero', 'property_manager', false),
  ('Lakewoodoaksleasing@covenantpropertyservices.com', 'Pedro Tellez Dacal', 'staff', false),
  ('magnoliapointpm@covenantpropertyservices.com', 'Tyra Jackson', 'property_manager', false),
  ('magnoliapointapm@covenantpropertyservices.com', 'Leyla Nieto Perez', 'assistant_property_manager', false),
  ('magnoliapointleasing@covenantpropertyservices.com', 'Luis Batencourt', 'staff', false),
  ('oasisclubpm@covenantpropertyservices.com', 'Linda Quasnick', 'property_manager', false),
  ('oasisclubapm@covenantpropertyservices.com', 'Elma Avila', 'assistant_property_manager', false),
  ('aurora2700PM@covenantpropertyservices.com', 'Teyani Stanton', 'property_manager', false),
  ('aurora2700APM@covenantpropertyservices.com', null, 'assistant_property_manager', false),
  ('Cielo325PM@covenantpropertyservices.com', 'Dana Darby', 'property_manager', false),
  ('GALeasingFloater@covenantpropertyservices.com', null, 'staff', false),
  ('crose@covenantpropertyservices.com', 'Courtney (CJ) Rose', 'property_manager', false)
on conflict (email) do update set
  full_name = coalesce(excluded.full_name, users.full_name),
  role = excluded.role,
  can_manage_users = excluded.can_manage_users;

-- 4b. Property/region access from the roster (additive — ON CONFLICT keeps any
-- assignments an admin added via the UI). Super-admins need no rows (see all).
insert into user_property_assignments (user_id, property_id)
  select u.id, v.property_id from users u
    join (values
    ('kingsparkpm@covenantpropertyservices.com', 'kings-tree'),
    ('kingsparkpm@covenantpropertyservices.com', 'park-place'),
    ('LakewoodOaksPM@covenantpropertyservices.com', 'lakewood-oaks'),
    ('Lakewoodoaksleasing@covenantpropertyservices.com', 'lakewood-oaks'),
    ('magnoliapointpm@covenantpropertyservices.com', 'magnolia-point'),
    ('magnoliapointapm@covenantpropertyservices.com', 'magnolia-point'),
    ('magnoliapointleasing@covenantpropertyservices.com', 'magnolia-point'),
    ('oasisclubpm@covenantpropertyservices.com', 'oasis-club'),
    ('oasisclubapm@covenantpropertyservices.com', 'oasis-club'),
    ('aurora2700PM@covenantpropertyservices.com', 'aurora-2700'),
    ('aurora2700APM@covenantpropertyservices.com', 'aurora-2700'),
    ('Cielo325PM@covenantpropertyservices.com', 'cielo-325'),
    ('GALeasingFloater@covenantpropertyservices.com', 'cielo-325'),
    ('crose@covenantpropertyservices.com', 'andover-park'),
    ('crose@covenantpropertyservices.com', 'fields-conover')
    ) as v(email, property_id) on lower(u.email) = lower(v.email)
  on conflict do nothing;

insert into user_region_assignments (user_id, region_id)
  select u.id, v.region_id from users u
    join (values
    ('jward@covenantpropertyservices.com', 'florida'),
    ('jward@covenantpropertyservices.com', 'georgia')
    ) as v(email, region_id) on lower(u.email) = lower(v.email)
  on conflict do nothing;

-- 5. Sign-up allowlist (SEED_DATA §8) ------------------------------------------
-- Outside the two Workspace domains, only listed addresses may sign in.
-- River Edge Advisors individuals are added at deploy time.
insert into email_allowlist (email, note) values
  ('aarongorin@gmail.com', 'Aaron Gorin — founder, personal Gmail')
on conflict (email) do update set note = excluded.note;

-- 6. Staff directory (from roster/people.csv) — assignee autocomplete source.
-- Rebuilt each run. One row per named person; unnamed/open seats live only as
-- role mailboxes (§3). Corporate + region-wide people have null property_id.
-- Personal Gmails are contact info only, NOT login allowlist entries.
truncate directory_people;
insert into directory_people (full_name, property_id, region_id, function, contact_email, is_vacant) values
  ('Geoff Girnun', null, null, 'VP Operations / Asset Manager', 'geoff@cedargrovecp.com', false),
  ('Steven Levitz', null, null, 'Partner', 'steve@cedargrovecp.com', false),
  ('Aaron Gorin', null, null, 'Partner', 'aarongorin@gmail.com', false),
  ('Cara McConnachie', null, null, 'Mgr Property & Lease Admin', 'cara@covenantpropertyservices.com', false),
  ('Jackie Eriksen', null, null, 'Talent Acquisitions Mgr', 'jackie@covenantpropertyservices.com', false),
  ('Shelley Balanda', null, null, 'Operations', 'shelley@covenantpropertyservices.com', false),
  ('Jerika Ward', null, 'florida', 'Regional Manager', 'jward@covenantpropertyservices.com', false),
  ('Jerika Ward', null, 'georgia', 'Regional Manager', 'jward@covenantpropertyservices.com', false),
  ('Crystal Martin', null, 'virginia', 'Regional Manager', null, false),
  ('Henry Avila Acevedo', 'kings-tree', null, 'Maintenance (Supervisor EPA)', null, false),
  ('Vivianna Pinero', 'lakewood-oaks', null, 'Property Manager', 'LakewoodOaksPM@covenantpropertyservices.com', false),
  ('Pedro Tellez Dacal', 'lakewood-oaks', null, 'Leasing', 'Lakewoodoaksleasing@covenantpropertyservices.com', false),
  ('Luis Perez Cancel', 'lakewood-oaks', null, 'Maintenance (Supervisor EPA)', null, false),
  ('Sanchesz Maultsby', 'lakewood-oaks', null, 'Maintenance (Tech)', null, false),
  ('Alexei Freire Goyes', 'lakewood-oaks', null, 'Groundskeeper / Porter', null, false),
  ('Tyra Jackson', 'magnolia-point', null, 'Property Manager', 'magnoliapointpm@covenantpropertyservices.com', false),
  ('Leyla Nieto Perez', 'magnolia-point', null, 'Assistant Property Manager', 'magnoliapointapm@covenantpropertyservices.com', false),
  ('Luis Batencourt', 'magnolia-point', null, 'Leasing', 'magnoliapointleasing@covenantpropertyservices.com', false),
  ('Gerardo Ceron Ayala', 'magnolia-point', null, 'Maintenance (Supervisor EPA)', null, false),
  ('Edison Daniel, Jn', 'magnolia-point', null, 'Maintenance (Tech EPA)', null, false),
  ('Danilo Menendez Rabassa', 'magnolia-point', null, 'Groundskeeper', null, false),
  ('Linda Quasnick', 'oasis-club', null, 'Property Manager', 'oasisclubpm@covenantpropertyservices.com', false),
  ('Elma Avila', 'oasis-club', null, 'Assistant Property Manager', 'oasisclubapm@covenantpropertyservices.com', false),
  ('Basha Buckley', 'oasis-club', null, 'Leasing', 'oasisclubleasing@covenantpropertyservices.com', false),
  ('Diosmel Avila Pozo', 'oasis-club', null, 'Groundskeeper', null, false),
  ('Henry Avila Acevedo', 'park-place', null, 'Maintenance (Supervisor EPA)', null, false),
  ('Julio Diaz Rodriguez', 'park-place', null, 'Maintenance (Tech EPA)', null, false),
  ('Eddys Monzon', 'silversmith-creek', null, 'Maintenance (Tech)', null, false),
  ('Teyani Stanton', 'aurora-2700', null, 'Property Manager', 'aurora2700PM@covenantpropertyservices.com', false),
  ('Dana Darby', 'cielo-325', null, 'Property Manager', 'Cielo325PM@covenantpropertyservices.com', false),
  ('Rasim Memishi', 'cielo-325', null, 'Maintenance (Supervisor EPA)', null, false),
  ('Courtney (CJ) Rose', 'andover-park', null, 'Property Manager', 'crose@covenantpropertyservices.com', false),
  ('Ariel Handy', 'andover-park', null, 'Leasing', null, false),
  ('Marcus Davis', 'andover-park', null, 'Maintenance (Supervisor EPA)', 'kaharidavis1@gmail.com', false),
  ('Courtney (CJ) Rose', 'fields-conover', null, 'Senior Property Manager', 'crose@covenantpropertyservices.com', false);

commit;
