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
    cedulaHighlight: {
        backgroundColor: '#fef3c7',
        border: '2 solid #fbbf24',
        borderRadius: 6,
        padding: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    cedulaLabel: {
        fontSize: 10,
        color: '#666',
        marginBottom: 5,
    },
    cedulaValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        letterSpacing: 1,
    },
    infoGrid: {
        marginBottom: 15,
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
    cedulasSection: {
        backgroundColor: '#f9fafb',
        border: '1 solid #e5e7eb',
        borderRadius: 4,
        padding: 12,
        marginTop: 15,
        marginBottom: 10,
    },
    cedulaItem: {
        marginBottom: 15,
        paddingBottom: 15,
        borderBottom: '1 solid #e5e7eb',
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

interface SepPDFDocumentProps {
    searchParams: {
        numeroCedula: string;
    };
    result: {
        estatus: string;
        codigoValidacion?: string;
        codigoMensaje?: string;
        cedulas?: Array<{
            numeroCedula?: string;
            nombre?: string;
            titulo?: string;
            institucion?: string;
            fechaExpedicion?: string;
            numeroRegistro?: string;
        }>;
    };
}

export const SepPDFDocument: React.FC<SepPDFDocumentProps> = ({
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

    const isSuccess = result.estatus === 'OK' && result.cedulas && result.cedulas.length > 0;

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
                        <Text style={styles.title}>Reporte de Cédula Profesional SEP</Text>
                        <Text style={styles.subtitle}>Generado el {generatedDate}</Text>
                    </View>

                    {/* Status Box */}
                    <View style={[styles.statusBox, ...(isSuccess ? [styles.statusBoxSuccess] : [])]}>
                        <Text style={styles.statusTitle}>
                            {isSuccess ? '✓ Cédula Encontrada' : '✗ Cédula No Encontrada'}
                        </Text>
                        <Text style={styles.statusMessage}>
                            {isSuccess
                                ? `Se encontraron ${result.cedulas!.length} resultado(s) en el sistema SEP`
                                : 'No se encontraron resultados para la cédula consultada'}
                        </Text>
                    </View>

                    {/* Search Parameters */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Parámetros de Búsqueda</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Número de Cédula:</Text>
                            <Text style={styles.infoValue}>{searchParams.numeroCedula}</Text>
                        </View>
                    </View>

                    {/* Cédulas Found */}
                    {isSuccess && result.cedulas && (
                        <View style={styles.cedulasSection}>
                            <Text style={styles.sectionTitle}>
                                {result.cedulas.length === 1 ? 'Cédula Profesional' : 'Cédulas Profesionales'}
                            </Text>
                            {result.cedulas.map((cedula, index) => (
                                <View key={index} style={styles.cedulaItem}>
                                    {cedula.numeroCedula && (
                                        <View style={styles.cedulaHighlight}>
                                            <Text style={styles.cedulaLabel}>Número de Cédula</Text>
                                            <Text style={styles.cedulaValue}>{cedula.numeroCedula}</Text>
                                        </View>
                                    )}

                                    <View style={styles.infoGrid}>
                                        {cedula.nombre && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Nombre:</Text>
                                                <Text style={styles.infoValue}>{cedula.nombre}</Text>
                                            </View>
                                        )}
                                        {cedula.titulo && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Título:</Text>
                                                <Text style={styles.infoValue}>{cedula.titulo}</Text>
                                            </View>
                                        )}
                                        {cedula.institucion && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Institución:</Text>
                                                <Text style={styles.infoValue}>{cedula.institucion}</Text>
                                            </View>
                                        )}
                                        {cedula.fechaExpedicion && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Fecha de Expedición:</Text>
                                                <Text style={styles.infoValue}>{cedula.fechaExpedicion}</Text>
                                            </View>
                                        )}
                                        {cedula.numeroRegistro && (
                                            <View style={styles.infoRow}>
                                                <Text style={styles.infoLabel}>Número de Registro:</Text>
                                                <Text style={styles.infoValue}>{cedula.numeroRegistro}</Text>
                                            </View>
                                        )}
                                    </View>
                                </View>
                            ))}
                        </View>
                    )}

                    {/* Disclaimer */}
                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerTitle}>Nota Importante:</Text>
                        <Text style={styles.disclaimerText}>
                            Este reporte muestra información obtenida del Registro Nacional de Profesionistas de la
                            Secretaría de Educación Pública (SEP) a través del servicio Nubarium. La información
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
                        Monitor Judicial - Reporte de Cédula Profesional SEP
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
