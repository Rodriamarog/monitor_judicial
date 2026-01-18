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
    curpHighlight: {
        backgroundColor: '#e0e7ff',
        border: '2 solid #818cf8',
        borderRadius: 6,
        padding: 15,
        marginBottom: 20,
        textAlign: 'center',
    },
    curpLabel: {
        fontSize: 10,
        color: '#666',
        marginBottom: 5,
    },
    curpValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1f2937',
        letterSpacing: 2,
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
    docSection: {
        backgroundColor: '#f9fafb',
        border: '1 solid #e5e7eb',
        borderRadius: 4,
        padding: 12,
        marginTop: 15,
    },
    docTitle: {
        fontSize: 11,
        fontWeight: 'bold',
        marginBottom: 8,
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

interface CurpPDFDocumentProps {
    reportType: 'validate' | 'generate';
    searchParams: {
        curp?: string;
        nombre?: string;
        primerApellido?: string;
        segundoApellido?: string;
        fechaNacimiento?: string;
        entidad?: string;
        sexo?: string;
    };
    result: {
        estatus: string;
        mensaje?: string;
        codigoValidacion?: string;
        curp: string;
        nombre?: string;
        apellidoPaterno?: string;
        apellidoMaterno?: string;
        sexo?: string;
        fechaNacimiento?: string;
        paisNacimiento?: string;
        estadoNacimiento?: string;
        estatusCurp?: string;
        datosDocProbatorio?: {
            entidadRegistro?: string;
            municipioRegistro?: string;
            numActa?: string;
            anioReg?: string;
        };
    };
}

export const CurpPDFDocument: React.FC<CurpPDFDocumentProps> = ({
    reportType,
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
    const reportTitle = reportType === 'validate' ? 'Validación de CURP' : 'Generación de CURP';

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
                        <Text style={styles.title}>Reporte de {reportTitle}</Text>
                        <Text style={styles.subtitle}>Generado el {generatedDate}</Text>
                    </View>

                    {/* Status Box */}
                    <View style={[styles.statusBox, isSuccess && styles.statusBoxSuccess]}>
                        <Text style={styles.statusTitle}>
                            {isSuccess ? '✓ Consulta Exitosa' : '✗ Error en Consulta'}
                        </Text>
                        <Text style={styles.statusMessage}>
                            {result.mensaje || 'Sin mensaje disponible'}
                        </Text>
                    </View>

                    {/* CURP Highlight */}
                    {result.curp && (
                        <View style={styles.curpHighlight}>
                            <Text style={styles.curpLabel}>CURP</Text>
                            <Text style={styles.curpValue}>{result.curp}</Text>
                        </View>
                    )}

                    {/* Search Parameters (for validation) */}
                    {reportType === 'validate' && searchParams.curp && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Parámetros de Búsqueda</Text>
                            <View style={styles.infoRow}>
                                <Text style={styles.infoLabel}>CURP Consultado:</Text>
                                <Text style={styles.infoValue}>{searchParams.curp}</Text>
                            </View>
                        </View>
                    )}

                    {/* Personal Information */}
                    {isSuccess && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Información Personal</Text>
                            <View style={styles.infoGrid}>
                                {result.nombre && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Nombre(s):</Text>
                                        <Text style={styles.infoValue}>{result.nombre}</Text>
                                    </View>
                                )}
                                {result.apellidoPaterno && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Apellido Paterno:</Text>
                                        <Text style={styles.infoValue}>{result.apellidoPaterno}</Text>
                                    </View>
                                )}
                                {result.apellidoMaterno && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Apellido Materno:</Text>
                                        <Text style={styles.infoValue}>{result.apellidoMaterno}</Text>
                                    </View>
                                )}
                                {result.sexo && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Sexo:</Text>
                                        <Text style={styles.infoValue}>{result.sexo}</Text>
                                    </View>
                                )}
                                {result.fechaNacimiento && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Fecha de Nacimiento:</Text>
                                        <Text style={styles.infoValue}>{result.fechaNacimiento}</Text>
                                    </View>
                                )}
                                {result.estadoNacimiento && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Estado de Nacimiento:</Text>
                                        <Text style={styles.infoValue}>{result.estadoNacimiento}</Text>
                                    </View>
                                )}
                                {result.paisNacimiento && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>País de Nacimiento:</Text>
                                        <Text style={styles.infoValue}>{result.paisNacimiento}</Text>
                                    </View>
                                )}
                                {result.estatusCurp && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Estatus CURP:</Text>
                                        <Text style={styles.infoValue}>{result.estatusCurp}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Birth Certificate Information */}
                    {isSuccess && result.datosDocProbatorio && (
                        <View style={styles.docSection}>
                            <Text style={styles.docTitle}>Datos del Documento Probatorio</Text>
                            <View style={styles.infoGrid}>
                                {result.datosDocProbatorio.entidadRegistro && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Entidad de Registro:</Text>
                                        <Text style={styles.infoValue}>{result.datosDocProbatorio.entidadRegistro}</Text>
                                    </View>
                                )}
                                {result.datosDocProbatorio.municipioRegistro && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Municipio de Registro:</Text>
                                        <Text style={styles.infoValue}>{result.datosDocProbatorio.municipioRegistro}</Text>
                                    </View>
                                )}
                                {result.datosDocProbatorio.numActa && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Número de Acta:</Text>
                                        <Text style={styles.infoValue}>{result.datosDocProbatorio.numActa}</Text>
                                    </View>
                                )}
                                {result.datosDocProbatorio.anioReg && (
                                    <View style={styles.infoRow}>
                                        <Text style={styles.infoLabel}>Año de Registro:</Text>
                                        <Text style={styles.infoValue}>{result.datosDocProbatorio.anioReg}</Text>
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    {/* Disclaimer */}
                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerTitle}>Nota Importante:</Text>
                        <Text style={styles.disclaimerText}>
                            Este reporte muestra información obtenida del Registro Nacional de Población (RENAPO) a través del servicio Nubarium.
                            La información presentada tiene carácter informativo y debe ser verificada directamente con las autoridades
                            correspondientes para efectos legales u oficiales. Monitor Judicial no se hace responsable del uso que se le dé
                            a esta información.
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
                        Monitor Judicial - Reporte de {reportTitle}
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
