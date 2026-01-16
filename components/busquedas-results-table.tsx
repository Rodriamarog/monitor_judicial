'use client';

import React, { useState } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface SearchResult {
    id: string;
    bulletin_date: string;
    juzgado: string;
    case_number: string;
    raw_text: string;
    bulletin_url: string;
    source: string;
}

interface BusquedasResultsTableProps {
    results: SearchResult[];
}

export function BusquedasResultsTable({ results }: BusquedasResultsTableProps) {
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

    const toggleRow = (id: string) => {
        const newExpanded = new Set(expandedRows);
        if (newExpanded.has(id)) {
            newExpanded.delete(id);
        } else {
            newExpanded.add(id);
        }
        setExpandedRows(newExpanded);
    };

    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-MX', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    return (
        <div className="rounded-md border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px]"></TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Juzgado</TableHead>
                        <TableHead>Expediente</TableHead>
                        <TableHead>Fuente</TableHead>
                        <TableHead className="w-[100px]">Enlace</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {results.map((result) => {
                        const isExpanded = expandedRows.has(result.id);
                        return (
                            <React.Fragment key={result.id}>
                                <TableRow className="cursor-pointer hover:bg-muted/50">
                                    <TableCell onClick={() => toggleRow(result.id)}>
                                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                            {isExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </TableCell>
                                    <TableCell onClick={() => toggleRow(result.id)}>
                                        {formatDate(result.bulletin_date)}
                                    </TableCell>
                                    <TableCell onClick={() => toggleRow(result.id)}>
                                        <div className="max-w-xs truncate" title={result.juzgado}>
                                            {result.juzgado}
                                        </div>
                                    </TableCell>
                                    <TableCell onClick={() => toggleRow(result.id)}>
                                        <Badge variant="outline">{result.case_number}</Badge>
                                    </TableCell>
                                    <TableCell onClick={() => toggleRow(result.id)}>
                                        <Badge variant="secondary" className="capitalize">
                                            {result.source.replace('_', ' ')}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <a
                                            href={result.bulletin_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            Ver
                                            <ExternalLink className="h-3 w-3" />
                                        </a>
                                    </TableCell>
                                </TableRow>
                                {isExpanded && (
                                    <TableRow>
                                        <TableCell colSpan={6} className="bg-muted/30">
                                            <div className="py-4 px-2">
                                                <p className="text-sm font-semibold mb-2">Texto del boletín:</p>
                                                <p className="text-sm whitespace-pre-wrap">{result.raw_text}</p>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                )}
                            </React.Fragment>
                        );
                    })}
                </TableBody>
            </Table>
        </div>
    );
}
