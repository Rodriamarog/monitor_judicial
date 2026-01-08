-- =====================================================
-- TEST: Sistema de Recency Ranking
-- =====================================================
-- Este script prueba el nuevo sistema de scoring con recencia
-- para la consulta: "¿Cuáles son los requisitos actuales para la Constancia de Representatividad?"

-- Primero, obtener el embedding de una consulta de prueba
-- (En producción esto viene de OpenAI, aquí usamos un embedding existente como proxy)

-- Paso 1: Obtener un embedding existente de una tesis sobre materia laboral/sindical
DO $$
DECLARE
    test_embedding vector(1536);
    rec RECORD;
BEGIN
    -- Usar el embedding de la tesis 2029808 como query proxy
    SELECT embedding INTO test_embedding
    FROM tesis_embeddings
    WHERE id_tesis = 2029808
    LIMIT 1;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST: Búsqueda con Recency Ranking';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Query simulada: ¿Cuáles son los requisitos actuales para la Constancia de Representatividad?';
    RAISE NOTICE '';
    RAISE NOTICE 'RESULTADOS CON RECENCY BOOST:';
    RAISE NOTICE '========================================';

    -- Ejecutar búsqueda con recency boost
    FOR rec IN
        SELECT
            id_tesis,
            rubro,
            tipo_tesis,
            epoca,
            anio,
            similarity as sim,
            recency_score as recency,
            epoca_score as epoca_sc,
            final_score as final
        FROM search_similar_tesis_with_recency(
            test_embedding,
            0.3,    -- threshold
            10,     -- top k
            ARRAY['Laboral'],  -- materias
            NULL,   -- tipo_tesis
            NULL,   -- epoca
            NULL,   -- anio_min
            NULL,   -- anio_max
            NULL,   -- instancia
            TRUE,   -- enable_recency_boost
            0.3     -- recency_weight
        )
    LOOP
        RAISE NOTICE 'ID: % | Año: % | Época: %', rec.id_tesis, rec.anio, rec.epoca;
        RAISE NOTICE 'Scores - Sim: % | Recency: % | Epoca: % | FINAL: %',
            ROUND(rec.sim::numeric, 3), ROUND(rec.recency::numeric, 3),
            ROUND(rec.epoca_sc::numeric, 3), ROUND(rec.final::numeric, 3);
        RAISE NOTICE 'Rubro: %', LEFT(rec.rubro, 100);
        RAISE NOTICE '---';
    END LOOP;

    RAISE NOTICE '';
    RAISE NOTICE 'COMPARACIÓN: Sin Recency Boost (scoring tradicional)';
    RAISE NOTICE '========================================';

    -- Ejecutar búsqueda SIN recency boost para comparar
    FOR rec IN
        SELECT
            id_tesis,
            rubro,
            tipo_tesis,
            epoca,
            anio,
            similarity as sim,
            final_score as final
        FROM search_similar_tesis_with_recency(
            test_embedding,
            0.3,
            10,
            ARRAY['Laboral'],
            NULL, NULL, NULL, NULL, NULL,
            FALSE,  -- disable recency boost
            0.0
        )
    LOOP
        RAISE NOTICE 'ID: % | Año: % | Época: %', rec.id_tesis, rec.anio, rec.epoca;
        RAISE NOTICE 'Scores - Sim: % | FINAL: %',
            ROUND(rec.sim::numeric, 3), ROUND(rec.final::numeric, 3);
        RAISE NOTICE 'Rubro: %', LEFT(rec.rubro, 100);
        RAISE NOTICE '---';
    END LOOP;

END $$;
