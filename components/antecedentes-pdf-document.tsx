import React from 'react';
import { Document, Page, Text, View, StyleSheet, Svg, Path } from '@react-pdf/renderer';

// Helper function to format source names
const formatSource = (source: string): string => {
    const sourceMap: { [key: string]: string } = {
        'tijuana': 'Tijuana',
        'mexicali': 'Mexicali',
        'ensenada': 'Ensenada',
        'tecate': 'Tecate',
        'segunda_instancia': 'Segunda Instancia',
        'juzgados_mixtos': 'Juzgados Mixtos',
    };
    return sourceMap[source] || source.charAt(0).toUpperCase() + source.slice(1);
};

// Helper function to extract case type from raw_text
const extractCaseType = (rawText: string): string => {
    const text = rawText.toUpperCase();

    if (text.includes('AMPARO DIRECTO')) return 'Amparo Directo';
    if (text.includes('AMPARO INDIRECTO')) return 'Amparo Indirecto';
    if (text.includes('JUICIO DE AMPARO')) return 'Juicio de Amparo';
    if (text.includes('JUICIO ORAL')) return 'Juicio Oral';
    if (text.includes('JUICIO EJECUTIVO')) return 'Juicio Ejecutivo';
    if (text.includes('JUICIO ORDINARIO')) return 'Juicio Ordinario';
    if (text.includes('JUICIO ESPECIAL')) return 'Juicio Especial';
    if (text.includes('JUICIO FAMILIAR')) return 'Juicio Familiar';
    if (text.includes('DIVORCIO')) return 'Divorcio';
    if (text.includes('PENSIÓN')) return 'Pensión Alimenticia';
    if (text.includes('INCIDENTE')) return 'Incidente';
    if (text.includes('RECURSO DE APELACIÓN')) return 'Recurso de Apelación';
    if (text.includes('RECURSO DE REVOCACIÓN')) return 'Recurso de Revocación';

    return 'N/A';
};

// Helper function to extract parties from raw_text
const extractParties = (rawText: string): { actor: string; demandado: string } => {
    const text = rawText.toUpperCase();

    // Try to find actor patterns
    let actor = 'N/A';
    let demandado = 'N/A';

    // Pattern: "ACTOR: [NAME]" or "PROMOVENTE: [NAME]"
    const actorMatch = text.match(/(?:ACTOR|PROMOVENTE|QUEJOSO|DEMANDANTE)[:\s]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s+(?:VS|CONTRA|DEMANDADO)|$)/);
    if (actorMatch) {
        actor = actorMatch[1].trim().substring(0, 40);
    }

    // Pattern: "DEMANDADO: [NAME]" or "VS [NAME]"
    const demandadoMatch = text.match(/(?:DEMANDADO|VS|CONTRA|AUTORIDAD)[:\s]+([A-ZÁÉÍÓÚÑ\s]+?)(?:\s+(?:EXPEDIENTE|BOLETÍN)|$)/);
    if (demandadoMatch) {
        demandado = demandadoMatch[1].trim().substring(0, 40);
    }

    return { actor, demandado };
};

// Create styles with minimal colors and clean design
const styles = StyleSheet.create({
    page: {
        paddingTop: 40,
        paddingBottom: 60,
        paddingLeft: 40,
        paddingRight: 40,
        fontSize: 10,
        fontFamily: 'Helvetica',
        backgroundColor: '#ffffff',
    },
    brandingHeaderWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 70,
    },
    brandingHeader: {
        backgroundColor: '#6b7280',
        height: 60,
        position: 'relative',
    },
    brandingAccent: {
        position: 'absolute',
        bottom: -10,
        left: 0,
        right: 0,
        height: 20,
        backgroundColor: '#9ca3af',
        opacity: 1,
    },
    brandingTitle: {
        position: 'absolute',
        top: 18,
        left: 40,
        fontSize: 20,
        fontWeight: 'bold',
        color: '#ffffff',
    },
    contentArea: {
        marginTop: 30,
    },
    header: {
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 5,
        color: '#1f2937',
    },
    subtitle: {
        fontSize: 9,
        color: '#666',
    },
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1f2937',
    },
    paramRow: {
        flexDirection: 'row',
        marginBottom: 5,
    },
    paramLabel: {
        fontWeight: 'bold',
        width: 80,
    },
    paramValue: {
        flex: 1,
    },
    summaryBox: {
        backgroundColor: '#f3f4f6',
        border: '1 solid #d1d5db',
        borderRadius: 4,
        padding: 12,
        marginBottom: 15,
    },
    summaryCount: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 5,
    },
    summaryText: {
        fontSize: 10,
        color: '#666',
    },
    table: {
        marginBottom: 15,
        border: '1 solid #e5e7eb',
        borderRadius: 4,
    },
    tableHeader: {
        flexDirection: 'row',
        backgroundColor: '#6b7280',
        padding: 10,
        fontWeight: 'bold',
        fontSize: 9,
        color: '#ffffff',
    },
    tableRow: {
        flexDirection: 'row',
        padding: 10,
        borderBottom: '0.5 solid #e5e7eb',
        fontSize: 8,
        backgroundColor: '#ffffff',
    },
    tableRowAlt: {
        flexDirection: 'row',
        padding: 10,
        borderBottom: '0.5 solid #e5e7eb',
        fontSize: 8,
        backgroundColor: '#f9fafb',
    },
    colDate: {
        width: '10%',
        paddingRight: 8,
    },
    colJuzgado: {
        width: '26%',
        paddingRight: 8,
    },
    colCase: {
        width: '10%',
        paddingRight: 8,
    },
    colText: {
        width: '44%',
        paddingRight: 8,
        fontSize: 7,
        lineHeight: 1.3,
    },
    colSource: {
        width: '10%',
    },
    textWrap: {
        wordWrap: 'break-word',
    },
    disclaimer: {
        marginTop: 20,
        marginBottom: 40,
        padding: 12,
        backgroundColor: '#f9fafb',
        border: '1 solid #d1d5db',
        borderRadius: 4,
    },
    disclaimerTitle: {
        fontWeight: 'bold',
        marginBottom: 5,
        fontSize: 10,
    },
    disclaimerText: {
        fontSize: 9,
        color: '#666',
        lineHeight: 1.4,
    },
    footer: {
        position: 'absolute',
        bottom: 30,
        left: 40,
        right: 40,
        textAlign: 'center',
        fontSize: 8,
        color: '#999',
        borderTop: '0.5 solid #e5e7eb',
        paddingTop: 10,
    },
});

interface SearchResult {
    id: string;
    bulletin_date: string;
    juzgado: string;
    case_number: string;
    raw_text: string;
    bulletin_url: string;
    source: string;
}

interface AntecedentesPDFDocumentProps {
    searchParams: {
        fullName: string;
        estado: string;
        periodo: string;
        curp?: string;
        rfc?: string;
    };
    results: SearchResult[];
    getPeriodoLabel: (value: string) => string;
}

export const AntecedentesPDFDocument: React.FC<AntecedentesPDFDocumentProps> = ({
    searchParams,
    results,
    getPeriodoLabel,
}) => {
    const generatedDate = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Branding Header - Goes to edge of page on first page only */}
                <View style={styles.brandingHeaderWrapper}>
                    <View style={styles.brandingHeader}>
                        <Text style={styles.brandingTitle}>Monitor Judicial</Text>
                        <View style={styles.brandingAccent} />
                    </View>
                </View>

                <View style={styles.contentArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Reporte de Antecedentes Legales</Text>
                        <Text style={styles.subtitle}>Generado el {generatedDate}</Text>
                    </View>

                {/* Search Parameters */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Parámetros de Búsqueda</Text>
                    <View style={styles.paramRow}>
                        <Text style={styles.paramLabel}>Nombre:</Text>
                        <Text style={styles.paramValue}>{searchParams.fullName}</Text>
                    </View>
                    <View style={styles.paramRow}>
                        <Text style={styles.paramLabel}>Estado:</Text>
                        <Text style={styles.paramValue}>{searchParams.estado}</Text>
                    </View>
                    <View style={styles.paramRow}>
                        <Text style={styles.paramLabel}>Periodo:</Text>
                        <Text style={styles.paramValue}>{getPeriodoLabel(searchParams.periodo)}</Text>
                    </View>
                    {searchParams.curp && (
                        <View style={styles.paramRow}>
                            <Text style={styles.paramLabel}>CURP:</Text>
                            <Text style={styles.paramValue}>{searchParams.curp}</Text>
                        </View>
                    )}
                    {searchParams.rfc && (
                        <View style={styles.paramRow}>
                            <Text style={styles.paramLabel}>RFC:</Text>
                            <Text style={styles.paramValue}>{searchParams.rfc}</Text>
                        </View>
                    )}
                </View>

                {/* Results Summary */}
                <View style={styles.summaryBox}>
                    <Text style={styles.summaryCount}>
                        {results.length} {results.length === 1 ? 'Boletín Encontrado' : 'Boletines Encontrados'}
                    </Text>
                    <Text style={styles.summaryText}>
                        {results.length > 0
                            ? 'Se encontraron menciones del nombre buscado en los siguientes boletines judiciales:'
                            : 'No se encontraron menciones del nombre buscado en los boletines judiciales del estado seleccionado.'}
                    </Text>
                </View>

                {/* Results Table */}
                {results.length > 0 && (
                    <View>
                        <Text style={styles.sectionTitle}>Detalle de Boletines</Text>
                        <View style={styles.table}>
                            {/* Table Header */}
                            <View style={styles.tableHeader}>
                                <Text style={styles.colDate}>Fecha</Text>
                                <Text style={styles.colJuzgado}>Juzgado</Text>
                                <Text style={styles.colCase}>Expediente</Text>
                                <Text style={styles.colText}>Texto</Text>
                                <Text style={styles.colSource}>Fuente</Text>
                            </View>

                            {/* Table Rows */}
                            {results.map((result, index) => {
                                return (
                                    <View key={result.id} style={index % 2 === 0 ? styles.tableRow : styles.tableRowAlt}>
                                        <Text style={styles.colDate}>
                                            {new Date(result.bulletin_date).toLocaleDateString('es-MX', {
                                                day: '2-digit',
                                                month: '2-digit',
                                                year: 'numeric'
                                            })}
                                        </Text>
                                        <Text style={styles.colJuzgado}>{result.juzgado}</Text>
                                        <Text style={styles.colCase}>{result.case_number || 'N/A'}</Text>
                                        <Text style={styles.colText}>{result.raw_text}</Text>
                                        <Text style={styles.colSource}>{formatSource(result.source)}</Text>
                                    </View>
                                );
                            })}
                        </View>
                    </View>
                )}

                {/* Disclaimer */}
                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerTitle}>Nota Importante:</Text>
                    <Text style={styles.disclaimerText}>
                        Este reporte muestra únicamente menciones encontradas en boletines judiciales públicos.
                        La presencia de un nombre en un boletín no implica responsabilidad legal o condena.
                        Para información legal precisa, consulte con un profesional del derecho o verifique
                        directamente con las autoridades judiciales correspondientes.
                    </Text>
                </View>

                    {/* Footer */}
                    <Text style={styles.footer}>
                        Monitor Judicial - Reporte de Antecedentes Legales
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
