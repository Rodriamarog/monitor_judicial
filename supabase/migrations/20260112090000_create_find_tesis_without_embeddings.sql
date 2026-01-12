-- Function to find tesis documents that don't have any embeddings
CREATE OR REPLACE FUNCTION find_tesis_without_embeddings()
RETURNS TABLE (id_tesis INTEGER)
LANGUAGE sql
AS $$
  SELECT td.id_tesis
  FROM tesis_documents td
  LEFT JOIN tesis_embeddings te ON td.id_tesis = te.id_tesis
  WHERE te.id_tesis IS NULL
  ORDER BY td.id_tesis DESC;
$$;
