const pool = require("./pool");

const DAY_OF_WEEK_CHECK = `
  day_of_week in (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  )
`;

async function ensureDevelopmentScheduleSchema() {
  if (process.env.NODE_ENV === "production") {
    return;
  }

  const tableResult = await pool.query(
    `
      select exists (
        select 1
        from information_schema.tables
        where table_schema = 'public'
          and table_name = 'route_schedules'
      ) as exists
    `,
  );

  if (!tableResult.rows[0]?.exists) {
    return;
  }

  const columnResult = await pool.query(
    `
      select exists (
        select 1
        from information_schema.columns
        where table_schema = 'public'
          and table_name = 'route_schedules'
          and column_name = 'day_of_week'
      ) as exists
    `,
  );

  if (columnResult.rows[0]?.exists) {
    return;
  }

  await pool.query(`
    alter table route_schedules
      add column day_of_week text;

    update route_schedules
    set day_of_week = 'monday'
    where day_of_week is null;

    alter table route_schedules
      alter column day_of_week set not null;

    alter table route_schedules
      add constraint route_schedules_day_of_week_check check (${DAY_OF_WEEK_CHECK});

    create index if not exists idx_route_schedules_vehicle_day
      on route_schedules(vehicle_id, day_of_week);
  `);

  console.log("development schema updated: route_schedules.day_of_week");
}

module.exports = {
  ensureDevelopmentScheduleSchema,
};
