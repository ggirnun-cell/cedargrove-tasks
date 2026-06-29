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

-- 4. Login users — super-admin bootstrap only (SEED_DATA §4/§6) -----------------
-- Everyone else is created on first sign-in (M2) as read_only. Cara & Jackie are
-- seeded as full super_admin per Geoff's decision (2026-06-29). Shelley is
-- read_only pending scope confirmation (default-deny).
insert into users (email, full_name, role, can_manage_users) values
  ('geoff@cedargrovecp.com',                 'Geoff Girnun',     'super_admin', true),
  ('steve@cedargrovecp.com',                 'Steven Levitz',    'super_admin', true),
  ('aarongorin@gmail.com',                   'Aaron Gorin',      'super_admin', true),
  ('cara@covenantpropertyservices.com',      'Cara McConnachie', 'super_admin', true),
  ('jackie@covenantpropertyservices.com',    'Jackie Eriksen',   'super_admin', true),
  ('shelley@covenantpropertyservices.com',   'Shelley Balanda',  'read_only',   false) -- scope TBD, confirm w/ Geoff
on conflict (email) do update set
  full_name = excluded.full_name, role = excluded.role, can_manage_users = excluded.can_manage_users;

-- 5. Sign-up allowlist (SEED_DATA §8) ------------------------------------------
-- Outside the two Workspace domains, only listed addresses may sign in.
-- River Edge Advisors individuals are added at deploy time.
insert into email_allowlist (email, note) values
  ('aarongorin@gmail.com', 'Aaron Gorin — founder, personal Gmail')
on conflict (email) do update set note = excluded.note;

-- 6. Staff directory (SEED_DATA §7) — autocomplete source ----------------------
-- Rebuilt each run (purely seed-derived in M1). Personal Gmails are contact
-- info only, NOT login allowlist entries.
truncate directory_people;
insert into directory_people (full_name, property_id, region_id, function, contact_email, is_vacant) values
  -- Florida
  ('Ayonda Parsons',          'kings-tree',        null, 'property_manager',                'kingsparkpm@covenantpropertyservices.com', false),
  ('Jania Bristol',           'kings-tree',        null, 'leasing',                         null, false),
  ('Henry Avila Acevedo',     'kings-tree',        null, 'maintenance (Supervisor, EPA)',   null, false),
  ('Julio Diaz Rodriguez',    'kings-tree',        null, 'maintenance (Tech, EPA)',         null, false),
  ('Vivianna Pinero',         'lakewood-oaks',     null, 'property_manager',                'LakewoodOaksPM@covenantpropertyservices.com', false),
  ('Pedro Tellez Dacal',      'lakewood-oaks',     null, 'leasing',                         'Lakewoodoaksleasing@covenantpropertyservices.com', false),
  ('Luis Perez Cancel',       'lakewood-oaks',     null, 'maintenance (Supervisor, EPA)',   null, false),
  ('Sanchesz Maultsby',       'lakewood-oaks',     null, 'maintenance (Tech)',              null, false),
  ('Alexei Freire Goyes',     'lakewood-oaks',     null, 'groundskeeper/porter',            null, false),
  ('Jerika Ward',             'magnolia-point',    'florida', 'regional_manager',           'jward@covenantpropertyservices.com', false),
  ('Tyra Jackson',            'magnolia-point',    null, 'property_manager',                'magnoliapointpm@covenantpropertyservices.com', false),
  ('Leyla Nieto Perez',       'magnolia-point',    null, 'assistant_property_manager',      'magnoliapointapm@covenantpropertyservices.com', false),
  ('Luis Batencourt',         'magnolia-point',    null, 'leasing',                         'magnoliapointleasing@covenantpropertyservices.com', false),
  ('Gerardo Ceron Ayala',     'magnolia-point',    null, 'maintenance (Supervisor, EPA)',   null, false),
  ('Edison Daniel, Jn',       'magnolia-point',    null, 'maintenance (Tech, EPA)',         null, false),
  ('Danilo Menendez Rabassa', 'magnolia-point',    null, 'groundskeeper',                   null, false),
  ('Linda Quasnick',          'oasis-club',        null, 'property_manager',                'oasisclubpm@covenantpropertyservices.com', false),
  ('Elma Avila',              'oasis-club',        null, 'assistant_property_manager',      'oasisclubapm@covenantpropertyservices.com', false),
  ('Vacant',                  'oasis-club',        null, 'leasing (OPEN)',                  'oasisclubleasing@covenantpropertyservices.com', true),
  ('Diosmel Avila Pozo',      'oasis-club',        null, 'groundskeeper',                   null, false),
  ('Ayonda Parsons',          'park-place',        null, 'property_manager',                'kingsparkpm@covenantpropertyservices.com', false),
  ('Jania Bristol',           'park-place',        null, 'leasing',                         null, false),
  ('Henry Avila Acevedo',     'park-place',        null, 'maintenance (Supervisor, EPA)',   null, false),
  ('Julio Diaz Rodriguez',    'park-place',        null, 'maintenance (Tech, EPA)',         null, false),
  ('Vacant',                  'silversmith-creek', null, 'property_manager (OPEN)',         'SilversmithPM@covenantpropertyservices.com', true),
  ('Aldo Velasco Diaz',       'silversmith-creek', null, 'maintenance (Supervisor, EPA)',   'aldovelasco08@gmail.com', false), -- personal, contact only
  ('Eddys Monzon',            'silversmith-creek', null, 'maintenance (Tech)',              null, false),
  -- Georgia
  ('Mariela Rivas',           'aurora-2700',       null, 'property_manager',                'aurora2700PM@covenantpropertyservices.com', false),
  ('Teyani Stanton',          'aurora-2700',       null, 'assistant_property_manager',      'aurora2700APM@covenantpropertyservices.com', false),
  ('Vacant',                  'aurora-2700',       null, 'leasing (OPEN)',                  'aurora2700leasing@covenantpropertyservices.com', true),
  ('Vacant',                  'aurora-2700',       null, 'maintenance (Supervisor, OPEN)',  null, true),
  ('Vacant',                  'aurora-2700',       null, 'maintenance (Tech, OPEN)',        null, true),
  ('Dana Darby',              'cielo-325',         null, 'property_manager',                'Cielo325PM@covenantpropertyservices.com', false),
  ('Jazmin Fuentes',          'cielo-325',         null, 'leasing',                         'GALeasingFloater@covenantpropertyservices.com', false),
  ('Rasim Memishi',           'cielo-325',         null, 'maintenance (Supervisor, EPA)',   null, false),
  -- North Carolina
  ('Courtney (CJ) Rose',      'andover-park',      null, 'property_manager',                'crose@covenantpropertyservices.com', false),
  ('Ariel Handy',             'andover-park',      null, 'leasing',                         null, false),
  ('Marcus Davis',            'andover-park',      null, 'maintenance (Supervisor, EPA)',   'kaharidavis1@gmail.com', false), -- personal, contact only
  ('Courtney (CJ) Rose',      'fields-conover',    null, 'senior_property_manager',         'crose@covenantpropertyservices.com', false),
  ('Vacant',                  'l-building',        null, 'property_manager (OPEN)',          null, true),
  -- Virginia (region-level RM; on-site staff TBD)
  ('Crystal Martin',          null,                'virginia', 'regional_manager',           null, false);

commit;
