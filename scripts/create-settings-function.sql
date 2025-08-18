-- Função SQL para obter configurações finais do usuário
CREATE OR REPLACE FUNCTION get_user_settings(p_user_id UUID)
RETURNS TABLE(key TEXT, final_value JSONB) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.key,
        COALESCE(u.value, s.value) AS final_value
    FROM system_defaults s
    LEFT JOIN user_settings u 
        ON u.key = s.key 
        AND u.user_id = p_user_id;
END;
$$ LANGUAGE plpgsql;
