'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle } from 'lucide-react';

interface NubariumResultCardProps {
    title: string;
    status?: 'OK' | 'ERROR';
    estatus?: 'OK' | 'ERROR';
    message?: string;
    mensaje?: string;
    data?: any;
    renderData?: (data: any) => React.ReactNode;
}

export function NubariumResultCard({
    title,
    status,
    estatus,
    message,
    mensaje,
    data,
    renderData,
    ...rest
}: NubariumResultCardProps) {
    // Handle both modern (status/message) and legacy (estatus/mensaje) formats
    const isSuccess = (status === 'OK' || estatus === 'OK');
    const displayMessage = message || mensaje || 'Sin mensaje';

    // For legacy format, the full response IS the data
    const fullData = data || rest;

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <Alert variant={isSuccess ? 'default' : 'destructive'}>
                    {isSuccess ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                        <XCircle className="h-4 w-4" />
                    )}
                    <AlertDescription>{displayMessage}</AlertDescription>
                </Alert>

                {renderData && (
                    <div className="mt-4">
                        {renderData(fullData)}
                    </div>
                )}

                {!renderData && Object.keys(fullData).length > 0 && (
                    <pre className="mt-4 p-4 bg-muted rounded text-xs overflow-auto max-h-96">
                        {JSON.stringify(fullData, null, 2)}
                    </pre>
                )}
            </CardContent>
        </Card>
    );
}
