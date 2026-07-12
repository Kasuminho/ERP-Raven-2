UPDATE "Player" AS player
SET "attendancePercentage" = CASE
  WHEN (
    SELECT COUNT(*)
    FROM "Event" AS total_event
    WHERE total_event.status = 'FINALIZED'
      AND total_event."startsAt" >= NOW() - INTERVAL '30 days'
  ) = 0 THEN 0
  ELSE ROUND(((
    SELECT COUNT(*)
    FROM "EventAttendance" AS event_attendance
    INNER JOIN "Event" AS event
      ON event.id = event_attendance."eventId"
    WHERE event_attendance."playerId" = player.id
      AND event_attendance.attended = true
      AND event.status = 'FINALIZED'
      AND event."startsAt" >= NOW() - INTERVAL '30 days'
  )::numeric / (
    SELECT COUNT(*)
    FROM "Event" AS total_event
    WHERE total_event.status = 'FINALIZED'
      AND total_event."startsAt" >= NOW() - INTERVAL '30 days'
  )::numeric) * 100, 2)::double precision
END;
