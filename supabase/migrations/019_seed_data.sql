-- 019_seed_data
-- Seed master data categories and default items. Admin can edit or add items
-- later through the Admin Web master-data module.
-- Reference: turvo_phase1_spec.md section 8.

-- --- Categories --------------------------------------------------------------

insert into public.master_categories (code, name, description, status, sort_order)
values
  ('SPORTS',     'Sports',      'Sports supported by turfs.', 'ACTIVE', 1),
  ('FACILITIES', 'Facilities',  'Facilities/features offered at a turf.', 'ACTIVE', 2),
  ('RULES',      'Rules',       'Rules that apply at a turf.', 'ACTIVE', 3),
  ('EQUIPMENT',  'Equipment',   'Equipment available at a turf.', 'ACTIVE', 4)
on conflict (code) do nothing;

-- --- Items -------------------------------------------------------------------

insert into public.master_items (category_id, name, sort_order)
select c.id, s.name, s.sort_order
from (values
  ('SPORTS',     'Football',        1),
  ('SPORTS',     'Cricket',         2),
  ('SPORTS',     'Badminton',       3),
  ('SPORTS',     'Basketball',      4),
  ('SPORTS',     'Tennis',          5),
  ('SPORTS',     'Volleyball',      6),
  ('FACILITIES', 'Parking',         1),
  ('FACILITIES', 'Restroom',        2),
  ('FACILITIES', 'Drinking Water',  3),
  ('FACILITIES', 'Changing Room',   4),
  ('FACILITIES', 'Snacks',          5),
  ('FACILITIES', 'Equipment Availability', 6),
  ('RULES',      'Non-marking shoes required', 1),
  ('RULES',      'No outside food', 2),
  ('RULES',      'Follow turf timing rules',  3),
  ('EQUIPMENT',  'Football',        1),
  ('EQUIPMENT',  'Cricket Bat',     2),
  ('EQUIPMENT',  'Cricket Ball',    3),
  ('EQUIPMENT',  'Badminton Racket',4)
) as s(code, name, sort_order)
join public.master_categories c on c.code = s.code
on conflict (category_id, name) do nothing;
