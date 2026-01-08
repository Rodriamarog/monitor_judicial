-- =====================================================
-- TEST: Top 20 → Re-ranking → Top 5
-- =====================================================
-- Simula el nuevo flujo optimizado

DO $$
DECLARE
    test_embedding vector(1536);
    rec RECORD;
    counter INTEGER := 0;
BEGIN
    -- Usar embedding de tesis sobre materia laboral
    SELECT embedding INTO test_embedding
    FROM tesis_embeddings
    WHERE id_tesis = 2029808
    LIMIT 1;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'TEST: Top 20 con Recency Boost';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Query simulada: ¿Cuáles son los requisitos actuales para la Constancia de Representatividad?';
    RAISE NOTICE '';

    -- Ejecutar búsqueda con top 20
    FOR rec IN
        SELECT
            id_tesis,
            LEFT(rubro, 80) as rubro_short,
            tipo_tesis,
            epoca,
            anio,
            ROUND(similarity::numeric, 3) as sim,
            ROUND(final_score::numeric, 3) as final
        FROM search_similar_tesis_with_recency(
            test_embedding,
            0.3,    -- threshold
            20,     -- TOP 20 (vs 10 anterior)
            ARRAY['Laboral'],
            NULL, NULL, NULL, NULL, NULL,
            TRUE,   -- recency boost habilitado
            0.3
        )
    LOOP
        counter := counter + 1;

        -- Marcar las que serían descartadas por re-ranking
        DECLARE
            would_discard TEXT := '';
        BEGIN
            IF counter > 3 AND rec.anio < 2000 THEN
                would_discard := ' ❌ DESCARTADA (pre-2000)';
            ELSIF counter > 3 AND rec.epoca IN ('Octava Época', 'Séptima Época', 'Sexta Época') THEN
                would_discard := ' ❌ DESCARTADA (época antigua)';
            ELSIF counter <= 5 THEN
                would_discard := ' ✅ TOP 5 FINAL';
            END IF;

            RAISE NOTICE '#% | ID: % | Año: % | Época: %',
                LPAD(counter::TEXT, 2, '0'),
                rec.id_tesis,
                COALESCE(rec.anio::TEXT, 'N/A'),
                COALESCE(LEFT(rec.epoca, 15), 'Sin época');
            RAISE NOTICE '   Scores: Sim=% Final=% | Tipo: %',
                rec.sim,
                rec.final,
                rec.tipo_tesis;
            RAISE NOTICE '   Rubro: %', rec.rubro_short;
            RAISE NOTICE '   Status: %', would_discard;
            RAISE NOTICE '';
        END;
    END LOOP;

    RAISE NOTICE '========================================';
    RAISE NOTICE 'RESUMEN';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'Total recuperadas: % tesis', counter;
    RAISE NOTICE 'Las primeras 5 irán al LLM después de re-ranking';
    RAISE NOTICE '';
    RAISE NOTICE 'Ventajas del Top 20:';
    RAISE NOTICE '- Más candidatos para re-ranking inteligente';
    RAISE NOTICE '- Mejor descarte de tesis obsoletas';
    RAISE NOTICE '- Costo adicional: $0 (SQL es gratis)';
    RAISE NOTICE '- Costo LLM: Igual (solo 5 tesis finales)';

END $$;
