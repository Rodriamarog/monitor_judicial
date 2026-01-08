# Guía de Optimización de Costos - Monitor Judicial RAG

## 🎯 Configuración Actual (ÓPTIMA)

Tu sistema ya implementa la mejor estrategia costo-calidad:

```
SQL: Top 10 tesis → Re-ranking → Top 5 al LLM
```

**Costo:** $0.000665 por query (~$2/mes con 100 queries/día)

---

## 💡 Estrategias para Escalar sin Aumentar Costos

### 1. Cache de Respuestas Frecuentes

**Problema:** Muchos usuarios preguntan lo mismo
**Solución:** Cachear respuestas comunes

```typescript
// Implementación simple con Redis o memoria
const cacheKey = `query:${hashQuery(userMessageText)}:${JSON.stringify(filters)}`
const cached = await cache.get(cacheKey)

if (cached) {
  return cached // $0 costo
}

// ... hacer RAG normal
await cache.set(cacheKey, response, { ttl: 3600 }) // 1 hora
```

**Ahorro potencial:** 30-50% de queries si hay patrones comunes

### 2. Tier de Usuarios (Free vs Premium)

```typescript
const MAX_TESIS = user.isPremium ? 10 : 5

const result = await client.query(
  `SELECT * FROM search_similar_tesis_with_recency(...)`,
  [
    /* ... */
    MAX_TESIS,  // Variable por tier
    /* ... */
  ]
)
```

**Pricing sugerido:**
- Free: 5 tesis, 10 queries/día = $0.07/mes por usuario
- Premium: 10 tesis, ilimitado = +$5/mes (margen alto)

### 3. Chunking Inteligente

**Actual:** Envías chunk completo (~400 tokens)
**Optimización:** Envía solo sección relevante

```typescript
// Priorizar chunks por tipo
const priorityChunks = sources
  .filter(s => ['criterio', 'justificacion'].includes(s.chunk_type))
  .slice(0, 5)

const fallbackChunks = sources
  .filter(s => s.chunk_type === 'full')
  .slice(0, 2)

const finalSources = [...priorityChunks, ...fallbackChunks].slice(0, 5)
```

**Ahorro:** ~20% en tokens de contexto

### 4. Modo "Respuesta Rápida" vs "Análisis Completo"

```typescript
interface QueryOptions {
  mode: 'quick' | 'comprehensive'
}

const config = {
  quick: {
    max_tesis: 3,
    max_tokens: 200,  // Respuesta corta
    temperature: 0.1,  // Más determinística
  },
  comprehensive: {
    max_tesis: 10,
    max_tokens: 800,
    temperature: 0.3,
  }
}
```

**Ahorro:** ~60% en queries simples que no requieren análisis profundo

### 5. Batch Processing para Backoffice

Si tienes análisis internos (no tiempo real):

```python
# Procesar múltiples queries en paralelo
async def batch_analyze(queries: list[str], batch_size=20):
    # OpenAI permite batches para reducir costos
    # Usa async para máxima eficiencia
    results = await asyncio.gather(*[
        process_query(q) for q in queries[:batch_size]
    ])
```

**Ahorro:** ~10-15% por economías de escala

---

## 📊 Análisis de ROI por Feature

### Opción A: Aumentar a Top 10 Siempre

**Costo adicional:** +$1/mes (100 queries/día)
**Beneficio:** +30% mejor contexto, respuestas más completas
**ROI:** Excelente si tus usuarios son profesionales pagando

### Opción B: Sistema Adaptativo

**Costo adicional:** $0 (mantener Top 5 promedio)
**Beneficio:** +20% satisfacción (usa Top 10 solo cuando es crítico)
**ROI:** Máximo

```typescript
// Detectar complejidad de la query
function estimateQueryComplexity(query: string): number {
  const indicators = [
    query.includes('comparar') ? 2 : 0,
    query.includes('evolución') ? 2 : 0,
    query.includes('contradicción') ? 2 : 0,
    query.length > 100 ? 1 : 0,
    query.split('?').length > 1 ? 1 : 0,
  ]
  return indicators.reduce((a, b) => a + b, 0)
}

const complexity = estimateQueryComplexity(userMessageText)
const numTesis = complexity >= 3 ? 10 : 5  // Adaptativo
```

### Opción C: Usar Claude Haiku para Queries Simples

**Costo:** Claude Haiku es ~5x más barato que GPT-4o-mini
**Trade-off:** Calidad ligeramente menor

```typescript
const model = queryIsSimple(userMessage)
  ? anthropic('claude-3-haiku')  // $0.25 / 1M input
  : openai('gpt-4o-mini')        // $0.15 / 1M input
```

---

## 🎯 Recomendación Final

**Para tu caso (LegalTech profesional):**

1. **MANTÉN tu configuración actual** (Top 10 → Re-rank → Top 5)
2. **Implementa cache** para queries comunes (30-50% ahorro)
3. **Considera tier premium:**
   - Free: 5 tesis, 10 queries/día
   - Premium: 10 tesis, ilimitado, $10/mes
   - Profit: $10 - $0.30 (costo real) = **$9.70/usuario/mes**

4. **Monitorea costos reales:**

```typescript
// Agregar logging
console.log(`[Cost] Tokens: ${tokens.total}, Est: $${cost.toFixed(6)}`)

// Guardar en BD
await supabase.from('usage_analytics').insert({
  user_id: user.id,
  query_tokens: tokens.total,
  estimated_cost: cost,
  num_tesis: sources.length,
})
```

---

## 💰 Cálculo de Break-Even

Si cobras $10/mes por acceso premium:

- Costo por usuario/mes (ilimitado): ~$0.30 (100 queries)
- Costo por usuario/mes (power user): ~$3 (1000 queries)
- **Margen:** 90-97%

**Conclusión:** Los costos de OpenAI son MÍNIMOS comparados con el valor de servicio legal.

---

## 🚨 Alertas de Costo

Implementa alertas para evitar sorpresas:

```typescript
// Alertas diarias
const dailyCost = await calculateDailyCost()

if (dailyCost > BUDGET_THRESHOLD) {
  await sendAlert({
    channel: 'slack',
    message: `⚠️ Costo diario: $${dailyCost} (límite: $${BUDGET_THRESHOLD})`
  })
}
```

**Umbrales sugeridos:**
- Amarillo: >$10/día
- Rojo: >$50/día
- Crítico: >$100/día

---

## 📖 Recursos

- **OpenAI Pricing:** https://openai.com/api/pricing/
- **Token Counter:** https://platform.openai.com/tokenizer
- **Cost Calculator:** `tesis_api/cost_calculator.py`

Para calcular costos en tiempo real:
```bash
python3 tesis_api/cost_calculator.py
```
