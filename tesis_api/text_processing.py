"""
Text processing utilities for legal documents
"""
import re
from typing import List, Dict, Tuple
import logging

logger = logging.getLogger(__name__)


class LegalTextProcessor:
    """Processes legal thesis documents for vectorization"""
    
    def __init__(self, max_chunk_size: int = 512, chunk_overlap: int = 50):
        """
        Args:
            max_chunk_size: Maximum number of tokens per chunk
            chunk_overlap: Number of overlapping tokens between chunks
        """
        self.max_chunk_size = max_chunk_size
        self.chunk_overlap = chunk_overlap
    
    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Remove special characters that might cause issues
        text = text.replace('\r\n', '\n')
        text = text.replace('\r', '\n')
        
        # Normalize quotes
        text = text.replace('"', '"').replace('"', '"')
        text = text.replace(''', "'").replace(''', "'")
        
        return text.strip()
    
    def extract_sections(self, texto: str) -> Dict[str, str]:
        """
        Extract structured sections from legal text
        
        Returns:
            Dict with keys: 'hechos', 'criterio', 'justificacion', 'full'
        """
        sections = {'full': texto}
        
        # Try to extract "Hechos:" section
        hechos_match = re.search(r'Hechos:\s*(.*?)(?=Criterio jurídico:|$)', texto, re.DOTALL | re.IGNORECASE)
        if hechos_match:
            sections['hechos'] = hechos_match.group(1).strip()
        
        # Try to extract "Criterio jurídico:" section
        criterio_match = re.search(r'Criterio jurídico:\s*(.*?)(?=Justificación:|$)', texto, re.DOTALL | re.IGNORECASE)
        if criterio_match:
            sections['criterio'] = criterio_match.group(1).strip()
        
        # Try to extract "Justificación:" section
        justificacion_match = re.search(r'Justificación:\s*(.*?)$', texto, re.DOTALL | re.IGNORECASE)
        if justificacion_match:
            sections['justificacion'] = justificacion_match.group(1).strip()
        
        return sections
    
    def chunk_text(self, text: str, preserve_paragraphs: bool = True) -> List[str]:
        """
        Split text into chunks
        
        Args:
            text: Text to chunk
            preserve_paragraphs: Try to preserve paragraph boundaries
        
        Returns:
            List of text chunks
        """
        if not text:
            return []
        
        # Rough token estimation: ~4 characters per token for Spanish
        char_limit = self.max_chunk_size * 4
        overlap_chars = self.chunk_overlap * 4
        
        if len(text) <= char_limit:
            return [text]
        
        chunks = []
        
        if preserve_paragraphs:
            # Split by paragraphs first
            paragraphs = text.split('\n\n')
            current_chunk = ""
            
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                
                # If adding this paragraph exceeds limit, save current chunk
                if len(current_chunk) + len(para) > char_limit and current_chunk:
                    chunks.append(current_chunk.strip())
                    # Start new chunk with overlap
                    overlap_text = current_chunk[-overlap_chars:] if len(current_chunk) > overlap_chars else current_chunk
                    current_chunk = overlap_text + " " + para
                else:
                    current_chunk += ("\n\n" if current_chunk else "") + para
            
            # Add remaining chunk
            if current_chunk:
                chunks.append(current_chunk.strip())
        else:
            # Simple character-based chunking
            start = 0
            while start < len(text):
                end = start + char_limit
                chunk = text[start:end]
                chunks.append(chunk.strip())
                start = end - overlap_chars
        
        return chunks
    
    def prepare_document_for_embedding(self, doc: Dict) -> List[Tuple[str, str]]:
        """
        Prepare a thesis document for embedding
        
        Args:
            doc: Thesis document dictionary
        
        Returns:
            List of tuples (chunk_text, chunk_type)
        """
        chunks_with_types = []
        
        # Clean the main text
        rubro = self.clean_text(doc.get('rubro', ''))
        texto = self.clean_text(doc.get('texto', ''))
        
        # Combine rubro with texto for context
        full_text = f"{rubro}\n\n{texto}" if rubro else texto
        
        # Extract sections
        sections = self.extract_sections(texto)
        
        # Strategy: Create chunks from different sections
        # 1. Always include rubro as a separate chunk (it's usually short and important)
        if rubro and len(rubro) > 20:
            chunks_with_types.append((rubro, 'rubro'))
        
        # 2. Chunk each section separately
        for section_type in ['hechos', 'criterio', 'justificacion']:
            if section_type in sections:
                section_text = sections[section_type]
                section_chunks = self.chunk_text(section_text)
                for chunk in section_chunks:
                    chunks_with_types.append((chunk, section_type))
        
        # 3. If no sections were found, chunk the full text
        if len(chunks_with_types) <= 1:  # Only rubro or nothing
            full_chunks = self.chunk_text(full_text)
            for chunk in full_chunks:
                chunks_with_types.append((chunk, 'full'))
        
        return chunks_with_types
    
    def estimate_token_count(self, text: str) -> int:
        """Rough token count estimation for Spanish text"""
        # Rough approximation: 4 characters per token for Spanish
        return len(text) // 4
