begin;

drop table if exists sms_logs cascade;
drop table if exists attendance_records cascade;
drop table if exists route_schedule_students cascade;
drop table if exists route_schedules cascade;
drop table if exists students cascade;
drop table if exists vehicles cascade;
drop table if exists settings cascade;
drop table if exists users cascade;

create table users (
  id text primary key,
  login_id text not null unique,
  password_hash text,
  development_pin_hash text,
  role text not null check (role in ('admin', 'driver')),
  display_name text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table vehicles (
  id text primary key,
  name text not null,
  driver_user_id text references users(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table students (
  id text primary key,
  name text not null,
  parent_name text,
  parent_phone text,
  default_pickup_place text not null,
  memo text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table route_schedules (
  id text primary key,
  vehicle_id text not null references vehicles(id),
  day_of_week text not null check (
    day_of_week in (
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    )
  ),
  name text not null,
  start_time time not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table route_schedule_students (
  id text primary key,
  route_schedule_id text not null references route_schedules(id) on delete cascade,
  student_id text not null references students(id),
  pickup_order integer,
  pickup_place_override text,
  memo text,
  unique (route_schedule_id, student_id)
);

create table attendance_records (
  id text primary key,
  attendance_date date not null,
  vehicle_id text not null references vehicles(id),
  route_schedule_id text not null references route_schedules(id),
  student_id text not null references students(id),
  status text not null check (status in ('unchecked', 'boarded', 'not_boarded')),
  checked_at timestamptz,
  checked_by_user_id text not null references users(id),
  pickup_place text not null,
  memo text,
  is_temporary_student boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (attendance_date, route_schedule_id, student_id)
);

create table sms_logs (
  id text primary key,
  attendance_record_id text references attendance_records(id),
  student_id text references students(id),
  parent_phone text,
  message text not null,
  status text not null check (status in ('pending', 'sent', 'failed', 'skipped')),
  provider text,
  provider_message_id text,
  error_message text,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table settings (
  key text primary key,
  value text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_vehicles_driver_user_id on vehicles(driver_user_id);
create index idx_route_schedules_vehicle_day on route_schedules(vehicle_id, day_of_week);
create index idx_route_schedule_students_schedule_id on route_schedule_students(route_schedule_id);
create index idx_route_schedule_students_student_id on route_schedule_students(student_id);
create index idx_attendance_records_date_schedule on attendance_records(attendance_date, route_schedule_id);
create index idx_attendance_records_student_id on attendance_records(student_id);
create index idx_sms_logs_attendance_record_id on sms_logs(attendance_record_id);
create index idx_sms_logs_student_id on sms_logs(student_id);

commit;
