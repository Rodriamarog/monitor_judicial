#!/usr/bin/env python3
"""
SCJN Downloader - Descarga las primeras 100 tesis para prueba del RAG
"""

import requests
import json
import time
from typing import List, Dict, Optional
from pathlib import Path
from datetime import datetime
import logging

# Configurar logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class SCJNDownloader:
    """Descargador de tesis del Semanario Judicial de la Federación"""
    
    BASE_URL = "https://bicentenario.scjn.gob.mx/repositorio-scjn"
    
    def __init__(self, output_dir: str = "./data"):
        """
        Inicializa el descargador
        
        Args:
            output_dir: Directorio donde guardar los datos
        """
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(parents=True, exist_ok=True)
        
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'LegalTech-Research/1.0',
            'Accept': 'application/json'
        })
        
        # Estadísticas
        self.stats = {
            'total_downloaded': 0,
            'successful': 0,
            'failed': 0,
            'errors': []
        }
    
    def get_tesis_ids(self, page: int = 1) -> List[str]:
        """
        Obtiene IDs de tesis de una página
        
        Args:
            page: Número de página
            
        Returns:
            Lista de IDs
        """
        url = f"{self.BASE_URL}/api/v1/tesis/ids"
        params = {'page': page} if page > 1 else {}
        
        try:
            logger.info(f"Fetching IDs from page {page}...")
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            ids = response.json()
            logger.info(f"✓ Retrieved {len(ids)} IDs from page {page}")
            return ids
        except Exception as e:
            logger.error(f"✗ Error fetching IDs from page {page}: {e}")
            return []
    
    def get_tesis_by_id(self, tesis_id: str) -> Optional[Dict]:
        """
        Obtiene una tesis por su ID
        
        Args:
            tesis_id: ID de la tesis
            
        Returns:
            Diccionario con datos de la tesis o None
        """
        url = f"{self.BASE_URL}/api/v1/tesis/{tesis_id}"
        
        try:
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            logger.error(f"✗ Error fetching tesis {tesis_id}: {e}")
            self.stats['errors'].append({
                'tesis_id': tesis_id,
                'error': str(e)
            })
            return None
    
    def download_tesis_batch(
        self, 
        ids: List[str], 
        delay: float = 0.5,
        save_individual: bool = False
    ) -> List[Dict]:
        """
        Descarga un batch de tesis
        
        Args:
            ids: Lista de IDs a descargar
            delay: Delay entre requests (segundos)
            save_individual: Si guardar cada tesis individualmente
            
        Returns:
            Lista de tesis descargadas
        """
        tesis_list = []
        total = len(ids)
        
        logger.info(f"Starting download of {total} tesis...")
        logger.info(f"Rate limit: {delay}s between requests")
        
        for i, tesis_id in enumerate(ids, 1):
            logger.info(f"[{i}/{total}] Downloading tesis {tesis_id}...")
            
            tesis = self.get_tesis_by_id(tesis_id)
            
            if tesis:
                tesis_list.append(tesis)
                self.stats['successful'] += 1
                
                # Guardar individualmente si se solicita
                if save_individual:
                    individual_file = self.output_dir / f"tesis_{tesis_id}.json"
                    with open(individual_file, 'w', encoding='utf-8') as f:
                        json.dump(tesis, f, ensure_ascii=False, indent=2)
                    logger.debug(f"  Saved to {individual_file}")
            else:
                self.stats['failed'] += 1
            
            self.stats['total_downloaded'] = i
            
            # Progress every 10 tesis
            if i % 10 == 0:
                success_rate = (self.stats['successful'] / i) * 100
                logger.info(f"  Progress: {i}/{total} ({success_rate:.1f}% success)")
            
            # Rate limiting
            if i < total:  # No delay after last one
                time.sleep(delay)
        
        return tesis_list
    
    def save_batch(self, tesis_list: List[Dict], filename: str = "tesis_batch.json"):
        """
        Guarda un batch de tesis en un archivo JSON
        
        Args:
            tesis_list: Lista de tesis
            filename: Nombre del archivo
        """
        output_file = self.output_dir / filename
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(tesis_list, f, ensure_ascii=False, indent=2)
        
        logger.info(f"💾 Saved {len(tesis_list)} tesis to {output_file}")
        return output_file
    
    def save_metadata(self):
        """Guarda metadata sobre la descarga"""
        metadata = {
            'download_date': datetime.now().isoformat(),
            'base_url': self.BASE_URL,
            'statistics': self.stats,
            'total_tesis': self.stats['successful'],
            'success_rate': (
                self.stats['successful'] / self.stats['total_downloaded'] * 100
                if self.stats['total_downloaded'] > 0 else 0
            )
        }
        
        metadata_file = self.output_dir / "download_metadata.json"
        with open(metadata_file, 'w', encoding='utf-8') as f:
            json.dump(metadata, f, ensure_ascii=False, indent=2)
        
        logger.info(f"📊 Saved metadata to {metadata_file}")
    
    def print_summary(self):
        """Imprime resumen de la descarga"""
        print("\n" + "="*80)
        print("DOWNLOAD SUMMARY")
        print("="*80)
        print(f"Total attempted: {self.stats['total_downloaded']}")
        print(f"Successful: {self.stats['successful']}")
        print(f"Failed: {self.stats['failed']}")
        
        if self.stats['total_downloaded'] > 0:
            success_rate = (self.stats['successful'] / self.stats['total_downloaded']) * 100
            print(f"Success rate: {success_rate:.1f}%")
        
        if self.stats['errors']:
            print(f"\nErrors: {len(self.stats['errors'])}")
            for error in self.stats['errors'][:5]:  # Show first 5
                print(f"  - Tesis {error['tesis_id']}: {error['error']}")
            if len(self.stats['errors']) > 5:
                print(f"  ... and {len(self.stats['errors']) - 5} more")
        
        print("="*80 + "\n")


def analyze_tesis_batch(tesis_list: List[Dict]):
    """
    Analiza el batch de tesis descargado
    
    Args:
        tesis_list: Lista de tesis
    """
    from collections import Counter
    
    print("\n" + "="*80)
    print("BATCH ANALYSIS")
    print("="*80)
    
    # Tipos de tesis
    tipos = Counter(t.get('tipoTesis') for t in tesis_list)
    print("\nTipos de Tesis:")
    for tipo, count in tipos.most_common():
        print(f"  {tipo}: {count}")
    
    # Materias
    all_materias = []
    for t in tesis_list:
        materias = t.get('materias', [])
        if materias:
            all_materias.extend(materias)
    
    materias_count = Counter(all_materias)
    print("\nMaterias (Top 5):")
    for materia, count in materias_count.most_common(5):
        print(f"  {materia}: {count}")
    
    # Instancias
    instancias = Counter(t.get('instancia') for t in tesis_list)
    print("\nInstancias (Top 3):")
    for instancia, count in instancias.most_common(3):
        print(f"  {instancia}: {count}")
    
    # Épocas
    epocas = Counter(t.get('epoca') for t in tesis_list)
    print("\nÉpocas:")
    for epoca, count in epocas.most_common():
        print(f"  {epoca}: {count}")
    
    # Años
    years = Counter(t.get('anio') for t in tesis_list)
    print("\nAños (Top 5):")
    for year, count in sorted(years.most_common(5), reverse=True):
        print(f"  {year}: {count}")
    
    # Longitud de texto promedio
    text_lengths = [len(t.get('texto', '')) for t in tesis_list]
    if text_lengths:
        avg_length = sum(text_lengths) / len(text_lengths)
        print(f"\nLongitud promedio de texto: {avg_length:.0f} caracteres")
        print(f"Texto más corto: {min(text_lengths)} caracteres")
        print(f"Texto más largo: {max(text_lengths)} caracteres")
    
    print("="*80 + "\n")


def main():
    """Función principal"""
    print("="*80)
    print("SCJN SAMPLE DOWNLOADER")
    print("Downloading first 100 tesis for RAG development")
    print("="*80 + "\n")
    
    # Crear downloader
    downloader = SCJNDownloader(output_dir="./data/sample")
    
    # Obtener IDs de la primera página
    logger.info("Step 1: Getting tesis IDs...")
    ids = downloader.get_tesis_ids(page=1)
    
    if not ids:
        logger.error("Failed to retrieve IDs. Exiting.")
        return
    
    # Tomar los primeros 100 (la API ya retorna 100)
    sample_size = 100
    ids_to_download = ids[:sample_size]
    
    logger.info(f"Will download {len(ids_to_download)} tesis")
    
    # Descargar tesis
    logger.info("\nStep 2: Downloading tesis content...")
    tesis_list = downloader.download_tesis_batch(
        ids_to_download,
        delay=0.5,  # 0.5 segundos entre requests = 2 req/sec
        save_individual=False  # No guardar archivos individuales por ahora
    )
    
    # Guardar batch completo
    logger.info("\nStep 3: Saving batch file...")
    output_file = downloader.save_batch(tesis_list, "tesis_sample_100.json")
    
    # Guardar metadata
    downloader.save_metadata()
    
    # Imprimir resumen
    downloader.print_summary()
    
    # Análisis del batch
    if tesis_list:
        analyze_tesis_batch(tesis_list)
    
    # Resumen final
    print("✅ DOWNLOAD COMPLETED")
    print(f"📁 Data saved in: {downloader.output_dir}")
    print(f"📄 Main file: {output_file}")
    print(f"📊 Metadata: {downloader.output_dir / 'download_metadata.json'}")
    print("\n🚀 Next step: Run the RAG vectorization script")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Download interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()