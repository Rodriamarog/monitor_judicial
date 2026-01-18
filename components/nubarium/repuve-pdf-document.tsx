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
    vehicleHighlight: {
        backgroundColor: '#dbeafe',
        border: '2 solid #3b82f6',
        borderRadius: 6,
        padding: 15,
        marginBottom: 20,
    },
    vehicleMainInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    vehicleColumn: {
        flex: 1,
    },
    vehicleLabel: {
        fontSize: 8,
        color: '#666',
        marginBottom: 3,
    },
    vehicleValue: {
        fontSize: 12,
        fontWeight: 'bold',
        color: '#1f2937',
    },
    vinHighlight: {
        backgroundColor: '#e0e7ff',
        padding: 8,
        borderRadius: 4,
        marginTop: 10,
    },
    vinLabel: {
        fontSize: 8,
        color: '#666',
        marginBottom: 3,
    },
    vinValue: {
        fontSize: 11,
        fontWeight: 'bold',
        color: '#1f2937',
        fontFamily: 'Courier',
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
    technicalSection: {
        backgroundColor: '#f9fafb',
        border: '1 solid #e5e7eb',
        borderRadius: 4,
        padding: 12,
        marginTop: 15,
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

interface RepuvePDFDocumentProps {
    searchParams: {
        vin?: string;
        nic?: string;
        placa?: string;
    };
    result: {
        status: string;
        message?: string;
        validationCode?: string;
        data?: {
            repuveId?: string;
            vehicle?: {
                vin?: string;
                placa?: string;
                nic?: string;
                clase?: string;
                tipo?: string;
                marca?: string;
                linea?: string;
                modelo?: string;
                anioModelo?: string;
                cilindros?: string;
                puertas?: string;
                asientos?: string;
                combustible?: string;
                transmision?: string;
                color?: string;
                numeroSerie?: string;
                numeroMotor?: string;
                capacidadCarga?: string;
                origin?: string;
                procedencia?: string;
            };
        };
    };
}

export const RepuvePDFDocument: React.FC<RepuvePDFDocumentProps> = ({
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
    const vehicle = result.data?.vehicle;

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
                        <Text style={styles.title}>Reporte de Consulta REPUVE</Text>
                        <Text style={styles.subtitle}>Generado el {generatedDate}</Text>
                    </View>

                    {/* Status Box */}
                    <View style={[styles.statusBox, isSuccess && styles.statusBoxSuccess]}>
                        <Text style={styles.statusTitle}>
                            {isSuccess ? '✓ Vehículo Encontrado en REPUVE' : '✗ Vehículo No Encontrado'}
                        </Text>
                        <Text style={styles.statusMessage}>
                            {result.message || 'Sin mensaje disponible'}
                        </Text>
                    </View>

                    {/* Search Parameters */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Parámetros de Búsqueda</Text>
                        <View style={styles.infoGrid}>
                            {searchParams.vin && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>VIN Consultado:</Text>
                                    <Text style={styles.infoValue}>{searchParams.vin}</Text>
                                </View>
                            )}
                            {searchParams.nic && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>NIC Consultado:</Text>
                                    <Text style={styles.infoValue}>{searchParams.nic}</Text>
                                </View>
                            )}
                            {searchParams.placa && (
                                <View style={styles.infoRow}>
                                    <Text style={styles.infoLabel}>Placa Consultada:</Text>
                                    <Text style={styles.infoValue}>{searchParams.placa}</Text>
                                </View>
                            )}
                        </View>
                    </View>

                    {/* Vehicle Highlight - Main Info */}
                    {isSuccess && vehicle && (
                        <>
                            <View style={styles.vehicleHighlight}>
                                <View style={styles.vehicleMainInfo}>
                                    <View style={styles.vehicleColumn}>
                                        <Text style={styles.vehicleLabel}>Marca</Text>
                                        <Text style={styles.vehicleValue}>{vehicle.marca || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.vehicleColumn}>
                                        <Text style={styles.vehicleLabel}>Modelo</Text>
                                        <Text style={styles.vehicleValue}>{vehicle.modelo || 'N/A'}</Text>
                                    </View>
                                    <View style={styles.vehicleColumn}>
                                        <Text style={styles.vehicleLabel}>Año</Text>
                                        <Text style={styles.vehicleValue}>{vehicle.anioModelo || 'N/A'}</Text>
                                    </View>
                                </View>

                                {vehicle.vin && (
                                    <View style={styles.vinHighlight}>
                                        <Text style={styles.vinLabel}>VIN (Número de Serie)</Text>
                                        <Text style={styles.vinValue}>{vehicle.vin}</Text>
                                    </View>
                                )}
                            </View>

                            {/* Identification Information */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Información de Identificación</Text>
                                <View style={styles.infoGrid}>
                                    {vehicle.placa && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Placa:</Text>
                                            <Text style={styles.infoValue}>{vehicle.placa}</Text>
                                        </View>
                                    )}
                                    {vehicle.nic && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>NIC:</Text>
                                            <Text style={styles.infoValue}>{vehicle.nic}</Text>
                                        </View>
                                    )}
                                    {result.data?.repuveId && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>ID REPUVE:</Text>
                                            <Text style={styles.infoValue}>{result.data.repuveId}</Text>
                                        </View>
                                    )}
                                    {vehicle.numeroSerie && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Número de Serie:</Text>
                                            <Text style={styles.infoValue}>{vehicle.numeroSerie}</Text>
                                        </View>
                                    )}
                                    {vehicle.numeroMotor && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Número de Motor:</Text>
                                            <Text style={styles.infoValue}>{vehicle.numeroMotor}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Vehicle Characteristics */}
                            <View style={styles.section}>
                                <Text style={styles.sectionTitle}>Características del Vehículo</Text>
                                <View style={styles.infoGrid}>
                                    {vehicle.clase && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Clase:</Text>
                                            <Text style={styles.infoValue}>{vehicle.clase}</Text>
                                        </View>
                                    )}
                                    {vehicle.tipo && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Tipo:</Text>
                                            <Text style={styles.infoValue}>{vehicle.tipo}</Text>
                                        </View>
                                    )}
                                    {vehicle.linea && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Línea:</Text>
                                            <Text style={styles.infoValue}>{vehicle.linea}</Text>
                                        </View>
                                    )}
                                    {vehicle.color && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Color:</Text>
                                            <Text style={styles.infoValue}>{vehicle.color}</Text>
                                        </View>
                                    )}
                                    {vehicle.origin && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Origen:</Text>
                                            <Text style={styles.infoValue}>{vehicle.origin}</Text>
                                        </View>
                                    )}
                                    {vehicle.procedencia && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Procedencia:</Text>
                                            <Text style={styles.infoValue}>{vehicle.procedencia}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>

                            {/* Technical Specifications */}
                            <View style={styles.technicalSection}>
                                <Text style={styles.sectionTitle}>Especificaciones Técnicas</Text>
                                <View style={styles.infoGrid}>
                                    {vehicle.combustible && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Combustible:</Text>
                                            <Text style={styles.infoValue}>{vehicle.combustible}</Text>
                                        </View>
                                    )}
                                    {vehicle.transmision && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Transmisión:</Text>
                                            <Text style={styles.infoValue}>{vehicle.transmision}</Text>
                                        </View>
                                    )}
                                    {vehicle.cilindros && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Cilindros:</Text>
                                            <Text style={styles.infoValue}>{vehicle.cilindros}</Text>
                                        </View>
                                    )}
                                    {vehicle.puertas && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Puertas:</Text>
                                            <Text style={styles.infoValue}>{vehicle.puertas}</Text>
                                        </View>
                                    )}
                                    {vehicle.asientos && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Asientos:</Text>
                                            <Text style={styles.infoValue}>{vehicle.asientos}</Text>
                                        </View>
                                    )}
                                    {vehicle.capacidadCarga && (
                                        <View style={styles.infoRow}>
                                            <Text style={styles.infoLabel}>Capacidad de Carga:</Text>
                                            <Text style={styles.infoValue}>{vehicle.capacidadCarga} kg</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                        </>
                    )}

                    {/* Disclaimer */}
                    <View style={styles.disclaimer}>
                        <Text style={styles.disclaimerTitle}>Nota Importante:</Text>
                        <Text style={styles.disclaimerText}>
                            Este reporte muestra información obtenida del Registro Público Vehicular (REPUVE) a través del servicio Nubarium.
                            La información presentada tiene carácter informativo y debe ser verificada directamente con las autoridades
                            correspondientes para efectos legales u oficiales. Monitor Judicial no se hace responsable del uso que se le dé
                            a esta información. Verifique que el vehículo no se encuentre reportado como robado antes de realizar
                            cualquier transacción.
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
                        Monitor Judicial - Reporte de Consulta REPUVE
                    </Text>
                </View>
            </Page>
        </Document>
    );
};
