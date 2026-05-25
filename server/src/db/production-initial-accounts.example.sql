begin;

-- Production initial account template.
-- Copy this file on the NAS, replace CHANGE_ME_* values, and run it once.
-- Do not commit the edited file. Do not use real secrets in this example file.

insert into users (
  id,
  login_id,
  password_hash,
  development_pin_hash,
  role,
  display_name,
  is_active
) values
  ('admin_1', 'admin', null, 'CHANGE_ME_ADMIN_PIN', 'admin', '관리자', true),
  ('driver_car1', 'car1', null, 'CHANGE_ME_CAR1_PIN', 'driver', '1호차 기사님', true),
  ('driver_car2', 'car2', null, 'CHANGE_ME_CAR2_PIN', 'driver', '2호차 기사님', true)
on conflict (id) do update set
  login_id = excluded.login_id,
  development_pin_hash = excluded.development_pin_hash,
  role = excluded.role,
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  updated_at = now();

insert into vehicles (id, name, driver_user_id, is_active) values
  ('vehicle_1', '1호차', 'driver_car1', true),
  ('vehicle_2', '2호차', 'driver_car2', true)
on conflict (id) do update set
  name = excluded.name,
  driver_user_id = excluded.driver_user_id,
  is_active = excluded.is_active,
  updated_at = now();

commit;
