begin;

-- Development-only seed data. Do not use real student or parent contact data.

insert into users (
  id,
  login_id,
  password_hash,
  development_pin_hash,
  role,
  display_name,
  is_active
) values
  ('driver_car1', 'car1', null, '1234', 'driver', '1호차 기사님', true),
  ('admin_1', 'admin', null, '1234', 'admin', '관리자', true)
on conflict (id) do update set
  login_id = excluded.login_id,
  development_pin_hash = excluded.development_pin_hash,
  role = excluded.role,
  display_name = excluded.display_name,
  is_active = excluded.is_active,
  updated_at = now();

insert into vehicles (id, name, driver_user_id, is_active) values
  ('vehicle_1', '1호차', 'driver_car1', true)
on conflict (id) do update set
  name = excluded.name,
  driver_user_id = excluded.driver_user_id,
  is_active = excluded.is_active,
  updated_at = now();

insert into route_schedules (id, vehicle_id, name, start_time, is_active) values
  ('schedule_1330', 'vehicle_1', '등원', '13:30', true),
  ('schedule_1440', 'vehicle_1', '등원', '14:40', true),
  ('schedule_1550', 'vehicle_1', '등원', '15:50', true)
on conflict (id) do update set
  vehicle_id = excluded.vehicle_id,
  name = excluded.name,
  start_time = excluded.start_time,
  is_active = excluded.is_active,
  updated_at = now();

insert into students (
  id,
  name,
  parent_name,
  parent_phone,
  default_pickup_place,
  memo,
  is_active
) values
  ('student_1330_1', '김서린', null, null, '만촌역 앞', null, true),
  ('student_1330_2', '박도윤', null, null, '아파트 정문', null, true),
  ('student_1330_3', '이지우', null, null, '편의점 앞', null, true),
  ('student_1440_1', '최민준', null, null, '학원 앞 사거리', null, true),
  ('student_1440_2', '한지민', null, null, '편의점 앞', null, true),
  ('student_1440_3', '오도윤', null, null, '아파트 후문', null, true),
  ('student_1550_1', '정하린', null, null, '버스정류장 앞', null, true),
  ('student_1550_2', '윤서준', null, null, '태권도장 앞', null, true),
  ('student_1550_3', '강지우', null, null, '놀이터 입구', null, true)
on conflict (id) do update set
  name = excluded.name,
  parent_name = excluded.parent_name,
  parent_phone = excluded.parent_phone,
  default_pickup_place = excluded.default_pickup_place,
  memo = excluded.memo,
  is_active = excluded.is_active,
  updated_at = now();

insert into route_schedule_students (
  id,
  route_schedule_id,
  student_id,
  pickup_order,
  pickup_place_override,
  memo
) values
  ('rss_1330_1', 'schedule_1330', 'student_1330_1', 1, null, null),
  ('rss_1330_2', 'schedule_1330', 'student_1330_2', 2, null, null),
  ('rss_1330_3', 'schedule_1330', 'student_1330_3', 3, null, null),
  ('rss_1440_1', 'schedule_1440', 'student_1440_1', 1, null, null),
  ('rss_1440_2', 'schedule_1440', 'student_1440_2', 2, null, null),
  ('rss_1440_3', 'schedule_1440', 'student_1440_3', 3, null, null),
  ('rss_1550_1', 'schedule_1550', 'student_1550_1', 1, null, null),
  ('rss_1550_2', 'schedule_1550', 'student_1550_2', 2, null, null),
  ('rss_1550_3', 'schedule_1550', 'student_1550_3', 3, null, null)
on conflict (route_schedule_id, student_id) do update set
  pickup_order = excluded.pickup_order,
  pickup_place_override = excluded.pickup_place_override,
  memo = excluded.memo;

insert into settings (key, value) values
  ('send_not_boarded_sms', 'false')
on conflict (key) do update set
  value = excluded.value,
  updated_at = now();

commit;
