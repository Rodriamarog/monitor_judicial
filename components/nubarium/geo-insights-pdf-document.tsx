import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

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
    statusBox: {
        backgroundColor: '#f3f4f6',
        border: '1 solid #d1d5db',
        borderRadius: 4,
        padding: 12,
        marginBottom: 15,
    },
    statusBoxSuccess: {
        backgroundColor: '#d1fae5',
        border: '1 solid #6ee7b7',
    },
    statusTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#1f2937',
        marginBottom: 5,
    },
    statusMessage: {
        fontSize: 10,
        color: '#666',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
        paddingBottom: 8,
        borderBottom: '0.5 solid #e5e7eb',
    },
    infoLabel: {
        width: '40%',
        fontWeight: 'bold',
        fontSize: 10,
        color: '#4b5563',
    },
    infoValue: {
        width: '60%',
        fontSize: 10,
        color: '#1f2937',
    },
    dataSection: {
        backgroundColor: '#f9fafb',
        border: '1 solid #e5e7eb',
        borderRadius: 4,
        padding: 12,
        marginTop: 15,
        marginBottom: 10,
    },
    subsection: {
        marginTop: 12,
        marginBottom: 12,
    },
    subsectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
        color: '#1f2937',
    },
    disclaimer: {
        marginTop: 20,
        marginBottom: 40,
        padding: 12,
        backgroundColor: '#fef3c7',
        border: '1 solid #fbbf24',
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
    validationCode: {
        fontSize: 8,
        color: '#999',
        marginTop: 10,
        fontFamily: 'Courier',
    },
});

interface GeoInsightsPDFDocumentProps {
    searchParams: {
        address?: string;
        lat?: number;
        lng?: number;
    };
    result: {
        status: string;
        message?: string;
        messageCode?: number;
        validationCode?: string;
        insights?: {
            conapo?: {
                level?: number;
                levelCode?: string;
                municipality?: string;
                state?: string;
                locality?: string;
            };
            sepomex?: {
                postalCode?: string;
                colony?: string;
                municipality?: string;
                state?: string;
            };
        };
    };
}

export const GeoInsightsPDFDocument: React.FC<GeoInsightsPDFDocumentProps> = ({
    searchParams,
    result,
}) => {
    const generatedDate = new Date().toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });

    const isSuccess = result.status === 'OK';

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                {/* Branding Header */}
                <View style={styles.brandingHeaderWrapper}>
                    <View style={styles.brandingHeader}>
                        <Text style={styles.brandingTitle}>Monitor Judicial</Text>
                        <View style={styles.brandingAccent} />
                    </View>
                </View>

                <View style={styles.contentArea}>
                    {/* Header */}
                    <View style={styles.header}>
                        <Text style={styles.title}>Reporte de Inteligencia Geográfica</Text>
                        <Text style={styles.subtitle}>Generado el {generatedDate}</Text>
                    </View>

                    {/* Status Box */}
                    <View style={[styles.statusBox, ...(isSuccess ? [styles.statusBoxSuccess] : [])]}>
                        <Text style={styles.statusTitle}>
                            {isSuccess ? '✓ Análisis Completado' : '✗ Error en Análisis'}
                        </Text>
                        <Text style={styles.statusMessage}>
                            {result.message || (isSuccess ? 'Análisis geográfico completado exitosamente' : 'No se pudo completar el análisis')}
                        </Text>
                    </View>

                    {/* Search Parameters */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Parámetros de Búsqueda</Text>
                        {searchParams.address && (
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>Dirección:</Text>
                                <Text style={styles.infoValue}>{searchParams.address}</Text>
                            </View>
                        )}
                        {searchParams.lat && searchParams.lng && (
                            <>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Latitud:</Text>
                                    <Text style={styles.infoValue}>{searchParams.lat}</Text>
                                </View>
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Longitud:</Text>
                                    <Text style={styles.infoValue}>{searchParams.lng}</Text>
                                </View>
                            </>
                        )}
                    </View>

                    {/* Results */}
                    {isSuccess && result.insights && (
                        <View style={styles.dataSection}>
                            <Text style={styles.sectionTitle}>Análisis Geográfico</Text>

                            {/* CONAPO Data */}
                            {result.insights.conapo && (
                                <View style={styles.subsection}>
                                    <Text style={styles.subsectionTitle}>Datos CONAPO (Marginalización)</Text>
                                    {result.insights.conapo.state && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Estado:</Text>
                                            <Text style={styles.infoValue}>{result.insights.conapo.state}</Text>
                                        </View>
                                    )}
                                    {result.insights.conapo.municipality && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Municipio:</Text>
                                            <Text style={styles.infoValue}>{result.insights.conapo.municipality}</Text>
                                        </View>
                                    )}
                                    {result.insights.conapo.locality && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Localidad:</Text>
                                            <Text style={styles.infoValue}>{result.insights.conapo.locality}</Text>
                                        </View>
                                    )}
                                    {result.insights.conapo.level !== undefined && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Nivel de Marginalización:</Text>
                                            <Text style={styles.infoValue}>{result.insights.conapo.level} ({result.insights.conapo.levelCode || 'N/A'})</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* SEPOMEX Data */}
                            {result.insights.sepomex && (
                                <View style={styles.subsection}>
                                    <Text style={styles.subsectionTitle}>Datos SEPOMEX</Text>
                                    {result.insights.sepomex.postalCode && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Código Postal:</Text>
                                            <Text style={styles.infoValue}>{result.insights.sepomex.postalCode}</Text>
                                        </View>
                                    )}
                                    {result.insights.sepomex.colony && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Colonia:</Text>
                                            <Text style={styles.infoValue}>{result.insights.sepomex.colony}</Text>
                                        </View>
                                    )}
                                    {result.insights.sepomex.municipality && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Municipio:</Text>
                                            <Text style={styles.infoValue}>{result.insights.sepomex.municipality}</Text>
                                        </View>
                                    )}
                                    {result.insights.sepomex.state && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Estado:</Text>
                                            <Text style={styles.infoValue}>{result.insights.sepomex.state}</Text>
                                        </View>
                                    )}
                                </View>
                            )}
                        </View>
                    )}

                    {/* Disclaimer */}
                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerTitle}>Nota Importante:</Text>
                        <Text style={styles.disclaimerText}>
                            Este reporte muestra información geográfica obtenida a través del servicio Nubarium,
                            incluyendo datos de CONAPO (Consejo Nacional de Población) y SEPOMEX. La información
                            presentada tiene carácter informativo y debe ser verificada directamente con las autoridades
                            correspondientes para efectos legales u oficiales. Monitor Judicial no se hace responsable
                            del uso que se le dé a esta información.
                        </Text>
                    </View>

                    {/* Validation Code */}
                    {result.validationCode && (
                        <Text style={styles.validationCode}>
                            Código de Validación: {result.validationCode}
                        </Text>
                    )}

                    {/* Footer */}
                    <Text style={styles.footer}>
                        Monitor Judicial - Reporte de Inteligencia Geográfica
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
