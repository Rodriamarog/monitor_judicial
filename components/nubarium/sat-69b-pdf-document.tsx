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
    statusBoxWarning: {
        backgroundColor: '#fef3c7',
        border: '1 solid #fbbf24',
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
    warningBox: {
        backgroundColor: '#fee2e2',
        border: '2 solid #ef4444',
        borderRadius: 6,
        padding: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    warningLabel: {
        fontSize: 10,
        color: '#666',
        marginBottom: 5,
    },
    warningValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#dc2626',
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
    resultSection: {
        backgroundColor: '#f9fafb',
        border: '1 solid #e5e7eb',
        borderRadius: 4,
        padding: 12,
        marginTop: 15,
        marginBottom: 10,
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

interface Sat69bPDFDocumentProps {
    searchParams: {
        rfc: string;
    };
    result: {
        estatus: string;
        claveMensaje?: string | number;
        codigoValidacion?: string;
        rfc?: string;
        nombreContribuyente?: string;
        situacion?: string;
        publicacionDofPresunto?: string;
        publicacionSatPresunto?: string;
        numeroFechaOficioPresunto?: string;
        publicacionDofDefinitivo?: string;
        publicacionSatDefinitivo?: string;
        numeroFechaOficioDefinitivo?: string;
        publicacionDofDesvirtuado?: string;
        publicacionSatDesvirtuado?: string;
        numeroFechaOficioDesvirtuado?: string;
        publicacionDofFavorable?: string;
        publicacionSatFavorable?: string;
        numeroFechaOficioFavorable?: string;
    };
}

export const Sat69bPDFDocument: React.FC<Sat69bPDFDocumentProps> = ({
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

    const isSuccess = result.estatus === 'OK';
    const isOnList = result.situacion && result.situacion !== 'NO LOCALIZADO';

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
                        <Text style={styles.title}>Reporte de Consulta SAT Artículo 69-B</Text>
                        <Text style={styles.subtitle}>Generado el {generatedDate}</Text>
                    </View>

                    {/* Status Box */}
                    <View style={[styles.statusBox, ...(isOnList ? [styles.statusBoxWarning] : isSuccess ? [styles.statusBoxSuccess] : [])]}>
                        <Text style={styles.statusTitle}>
                            {isOnList ? '⚠ RFC Encontrado en Lista 69-B' : '✓ RFC No Encontrado en Lista'}
                        </Text>
                        <Text style={styles.statusMessage}>
                            {isOnList
                                ? `El RFC se encuentra en situación: ${result.situacion}`
                                : 'El RFC no se encuentra en ninguna publicación del artículo 69-B'}
                        </Text>
                    </View>

                    {/* Search Parameters */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Parámetros de Búsqueda</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>RFC Consultado:</Text>
                            <Text style={styles.infoValue}>{searchParams.rfc}</Text>
                        </View>
                    </View>

                    {/* Warning Box if on list */}
                    {isOnList && (
                        <View style={styles.warningBox}>
                            <Text style={styles.warningLabel}>Situación en Lista 69-B</Text>
                            <Text style={styles.warningValue}>{result.situacion}</Text>
                        </View>
                    )}

                    {/* Results */}
                    {isSuccess && (
                        <View style={styles.resultSection}>
                            <Text style={styles.sectionTitle}>Información del RFC</Text>

                            {result.nombreContribuyente && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Nombre del Contribuyente:</Text>
                                    <Text style={styles.infoValue}>{result.nombreContribuyente}</Text>
                                </View>
                            )}

                            {result.situacion && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Situación:</Text>
                                    <Text style={styles.infoValue}>{result.situacion}</Text>
                                </View>
                            )}

                            {/* Presunto */}
                            {(result.publicacionDofPresunto || result.publicacionSatPresunto) && (
                                <>
                                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Publicación Presunto</Text>
                                    {result.publicacionDofPresunto && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Publicación DOF:</Text>
                                            <Text style={styles.infoValue}>{result.publicacionDofPresunto}</Text>
                                        </View>
                                    )}
                                    {result.publicacionSatPresunto && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Publicación SAT:</Text>
                                            <Text style={styles.infoValue}>{result.publicacionSatPresunto}</Text>
                                        </View>
                                    )}
                                    {result.numeroFechaOficioPresunto && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Número y Fecha de Oficio:</Text>
                                            <Text style={styles.infoValue}>{result.numeroFechaOficioPresunto}</Text>
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Definitivo */}
                            {(result.publicacionDofDefinitivo || result.publicacionSatDefinitivo) && (
                                <>
                                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Publicación Definitivo</Text>
                                    {result.publicacionDofDefinitivo && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Publicación DOF:</Text>
                                            <Text style={styles.infoValue}>{result.publicacionDofDefinitivo}</Text>
                                        </View>
                                    )}
                                    {result.publicacionSatDefinitivo && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Publicación SAT:</Text>
                                            <Text style={styles.infoValue}>{result.publicacionSatDefinitivo}</Text>
                                        </View>
                                    )}
                                    {result.numeroFechaOficioDefinitivo && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Número y Fecha de Oficio:</Text>
                                            <Text style={styles.infoValue}>{result.numeroFechaOficioDefinitivo}</Text>
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Desvirtuado */}
                            {(result.publicacionDofDesvirtuado || result.publicacionSatDesvirtuado) && (
                                <>
                                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Publicación Desvirtuado</Text>
                                    {result.publicacionDofDesvirtuado && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Publicación DOF:</Text>
                                            <Text style={styles.infoValue}>{result.publicacionDofDesvirtuado}</Text>
                                        </View>
                                    )}
                                    {result.publicacionSatDesvirtuado && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Publicación SAT:</Text>
                                            <Text style={styles.infoValue}>{result.publicacionSatDesvirtuado}</Text>
                                        </View>
                                    )}
                                    {result.numeroFechaOficioDesvirtuado && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Número y Fecha de Oficio:</Text>
                                            <Text style={styles.infoValue}>{result.numeroFechaOficioDesvirtuado}</Text>
                                        </View>
                                    )}
                                </>
                            )}

                            {/* Favorable */}
                            {(result.publicacionDofFavorable || result.publicacionSatFavorable) && (
                                <>
                                    <Text style={[styles.sectionTitle, { marginTop: 12 }]}>Publicación Favorable</Text>
                                    {result.publicacionDofFavorable && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Publicación DOF:</Text>
                                            <Text style={styles.infoValue}>{result.publicacionDofFavorable}</Text>
                                        </View>
                                    )}
                                    {result.publicacionSatFavorable && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Publicación SAT:</Text>
                                            <Text style={styles.infoValue}>{result.publicacionSatFavorable}</Text>
                                        </View>
                                    )}
                                    {result.numeroFechaOficioFavorable && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Número y Fecha de Oficio:</Text>
                                            <Text style={styles.infoValue}>{result.numeroFechaOficioFavorable}</Text>
                                        </View>
                                    )}
                                </>
                            )}
                        </View>
                    )}

                    {/* Disclaimer */}
                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerTitle}>Nota Importante:</Text>
                        <Text style={styles.disclaimerText}>
                            Este reporte muestra información del artículo 69-B del Código Fiscal de la Federación,
                            obtenida del Servicio de Administración Tributaria (SAT) a través del servicio Nubarium.
                            Este artículo incluye contribuyentes presuntos de operaciones inexistentes. La información
                            presentada tiene carácter informativo y debe ser verificada directamente con las autoridades
                            correspondientes para efectos legales u oficiales. Monitor Judicial no se hace responsable
                            del uso que se le dé a esta información.
                        </Text>
                    </View>

                    {/* Validation Code */}
                    {result.codigoValidacion && (
                        <Text style={styles.validationCode}>
                            Código de Validación: {result.codigoValidacion}
                        </Text>
                    )}

                    {/* Footer */}
                    <Text style={styles.footer}>
                        Monitor Judicial - Reporte SAT Artículo 69-B
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
