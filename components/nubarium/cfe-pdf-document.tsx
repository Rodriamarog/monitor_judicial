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
    statusBoxError: {
        backgroundColor: '#fee2e2',
        border: '1 solid #fca5a5',
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
    section: {
        marginBottom: 15,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        marginBottom: 8,
        color: '#1f2937',
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

interface CfePDFDocumentProps {
    searchParams: {
        name: string;
        serviceNumber: string;
    };
    result: {
        status: string;
        message?: string;
        validationCode?: string;
        data?: any;
    };
}

export const CfePDFDocument: React.FC<CfePDFDocumentProps> = ({
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
                <View style={styles.brandingHeaderWrapper}>
                    <View style={styles.brandingHeader}>
                        <Text style={styles.brandingTitle}>Monitor Judicial</Text>
                        <View style={styles.brandingAccent} />
                    </View>
                </View>

                <View style={styles.contentArea}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Reporte de Validación CFE</Text>
                        <Text style={styles.subtitle}>Generado el {generatedDate}</Text>
                    </View>

                    <View style={[styles.statusBox, ...(isSuccess ? [styles.statusBoxSuccess] : [styles.statusBoxError])]}>
                        <Text style={styles.statusTitle}>
                            {isSuccess ? '✓ Validación Exitosa' : '✗ Validación Fallida'}
                        </Text>
                        <Text style={styles.statusMessage}>
                            {result.message || (isSuccess ? 'Datos validados correctamente' : 'No se pudo validar la información')}
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Parámetros de Búsqueda</Text>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Nombre:</Text>
                            <Text style={styles.infoValue}>{searchParams.name}</Text>
                        </View>
                        <View style={styles.infoRow}>
                            <Text style={styles.infoLabel}>Número de Servicio:</Text>
                            <Text style={styles.infoValue}>{searchParams.serviceNumber}</Text>
                        </View>
                    </View>

                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerTitle}>Nota Importante:</Text>
                        <Text style={styles.disclaimerText}>
                            Este reporte muestra información de validación de comprobante CFE obtenida a través del servicio Nubarium.
                            La información presentada tiene carácter informativo y debe ser verificada directamente con las autoridades
                            correspondientes para efectos legales u oficiales. Monitor Judicial no se hace responsable del uso que se le dé a esta información.
                        </Text>
                    </View>

                    {result.validationCode && (
                        <Text style={styles.validationCode}>
                            Código de Validación: {result.validationCode}
                        </Text>
                    )}

                    <Text style={styles.footer}>
                        Monitor Judicial - Reporte de Validación CFE
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
