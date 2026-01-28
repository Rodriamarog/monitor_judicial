-- Create a function to efficiently get alert counts per case
-- Returns aggregated counts instead of fetching all rows

CREATE OR REPLACE FUNCTION get_alert_counts_by_case(p_user_id UUID)
RETURNS TABLE (
  monitored_case_id UUID,
  alert_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    a.monitored_case_id,
    COUNT(*) as alert_count
  FROM alerts a
  WHERE a.user_id = p_user_id
    AND a.monitored_case_id IS NOT NULL
  GROUP BY a.monitored_case_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_alert_counts_by_case(UUID) TO authenticated;

COMMENT ON FUNCTION get_alert_counts_by_case IS
  'Efficiently returns alert counts grouped by monitored_case_id for a user. '
  'Avoids fetching thousands of individual alert rows by aggregating in the database.';
