SELECT 
  user_id,
  COUNT(*) as total_ejercicios,
  COUNT(*) FILTER (WHERE deleted_at IS NULL) as ejercicios_activos
FROM user_assets
WHERE asset_type = 'gym_exercise'
GROUP BY user_id;
