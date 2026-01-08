#!/usr/bin/env python3
"""
SCJN API Tester - Prueba de conexión y recuperación de IDs de tesis
"""

import requests
import json
from typing import List, Optional
import time


class SCJNAPIClient:
    """Cliente para la API del Semanario Judicial de la Federación"""
    
    # Posibles URLs base a probar
    # Basado en la documentación: bicentenario.scjn.gob.mx/repositorio-scjn
    POSSIBLE_BASE_URLS = [
        "https://bicentenario.scjn.gob.mx/repositorio-scjn",
        "http://bicentenario.scjn.gob.mx/repositorio-scjn",
        "https://www2.scjn.gob.mx/repositorio-scjn",
        "https://sjf.scjn.gob.mx/repositorio-scjn",
        "https://www.scjn.gob.mx/repositorio-scjn",
    ]
    
    def __init__(self, base_url: Optional[str] = None):
        """
        Inicializa el cliente
        
        Args:
            base_url: URL base de la API. Si es None, probará automáticamente.
        """
        self.base_url = None
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'LegalTech-Research/1.0',
            'Accept': 'application/json'
        })
        
        # Si se provee una URL, usarla. Sino, auto-detectar
        if base_url:
            self.base_url = base_url.rstrip('/')
            print(f"✓ Using provided base URL: {self.base_url}")
        else:
            print("🔍 Auto-detecting API base URL...")
            self.base_url = self._detect_base_url()
    
    def _detect_base_url(self) -> str:
        """
        Intenta detectar la URL base correcta de la API
        """
        for url in self.POSSIBLE_BASE_URLS:
            test_url = f"{url}/api/v1/tesis/count"
            print(f"  Trying: {test_url}")
            
            try:
                response = self.session.get(test_url, timeout=10)
                if response.status_code == 200:
                    print(f"✓ Found valid API at: {url}")
                    return url.rstrip('/')
            except requests.exceptions.RequestException as e:
                print(f"  ✗ Failed: {e}")
                continue
        
        # Si ninguna funciona, usar la primera como default
        print(f"⚠️  Could not auto-detect. Using default: {self.POSSIBLE_BASE_URLS[0]}")
        return self.POSSIBLE_BASE_URLS[0].rstrip('/')
    
    def get_total_tesis(self) -> Optional[int]:
        """
        GET /api/v1/tesis/count
        Retorna el total de tesis disponibles
        """
        url = f"{self.base_url}/api/v1/tesis/count"
        
        try:
            print(f"\n📊 Fetching total count from: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            # La API retorna solo un número
            total = int(response.text.strip())
            print(f"✓ Total tesis: {total:,}")
            return total
            
        except requests.exceptions.RequestException as e:
            print(f"✗ Error fetching count: {e}")
            return None
        except ValueError as e:
            print(f"✗ Error parsing response: {e}")
            print(f"  Response: {response.text}")
            return None
    
    def get_tesis_ids(self, page: int = 1, limit: int = 1000) -> Optional[List[str]]:
        """
        GET /api/v1/tesis/ids
        Recupera IDs de tesis (paginado)
        
        Args:
            page: Número de página (base 1)
            limit: Límite de resultados por página (max 1000)
        
        Returns:
            Lista de IDs o None si hay error
        """
        url = f"{self.base_url}/api/v1/tesis/ids"
        params = {}
        
        # Probar diferentes formatos de paginación
        # Algunas APIs usan 'page', otras 'offset', etc.
        if page > 1:
            params['page'] = page
        
        try:
            print(f"\n📄 Fetching IDs page {page} from: {url}")
            if params:
                print(f"   Params: {params}")
            
            response = self.session.get(url, params=params, timeout=10)
            response.raise_for_status()
            
            ids = response.json()
            
            if isinstance(ids, list):
                print(f"✓ Retrieved {len(ids)} IDs")
                return ids
            else:
                print(f"✗ Unexpected response format: {type(ids)}")
                return None
                
        except requests.exceptions.RequestException as e:
            print(f"✗ Error fetching IDs: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"✗ Error parsing JSON: {e}")
            print(f"  Response: {response.text[:200]}")
            return None
    
    def get_tesis_by_id(self, tesis_id: str) -> Optional[dict]:
        """
        GET /api/v1/tesis/{id}
        Recupera una tesis específica por su ID
        
        Args:
            tesis_id: ID de la tesis
        
        Returns:
            Diccionario con datos de la tesis o None si hay error
        """
        url = f"{self.base_url}/api/v1/tesis/{tesis_id}"
        
        try:
            print(f"\n📖 Fetching tesis {tesis_id} from: {url}")
            response = self.session.get(url, timeout=10)
            response.raise_for_status()
            
            tesis = response.json()
            print(f"✓ Retrieved tesis: {tesis.get('tesis', 'N/A')}")
            return tesis
            
        except requests.exceptions.RequestException as e:
            print(f"✗ Error fetching tesis: {e}")
            return None
        except json.JSONDecodeError as e:
            print(f"✗ Error parsing JSON: {e}")
            return None


def print_tesis_summary(tesis: dict):
    """Imprime un resumen legible de una tesis"""
    print("\n" + "="*80)
    print("RESUMEN DE TESIS")
    print("="*80)
    print(f"ID: {tesis.get('idTesis', 'N/A')}")
    print(f"Tesis: {tesis.get('tesis', 'N/A')}")
    print(f"Tipo: {tesis.get('tipoTesis', 'N/A')}")
    print(f"Materia(s): {', '.join(tesis.get('materias', []))}")
    print(f"Época: {tesis.get('epoca', 'N/A')}")
    print(f"Fecha: {tesis.get('mes', 'N/A')} {tesis.get('anio', 'N/A')}")
    print(f"\nRubro:")
    print(f"  {tesis.get('rubro', 'N/A')[:200]}...")
    print(f"\nInstancia: {tesis.get('instancia', 'N/A')}")
    print(f"Órgano: {tesis.get('organoJuris', 'N/A')}")
    print("="*80)


def main():
    """Función principal de prueba"""
    print("="*80)
    print("SCJN API TESTER")
    print("Semanario Judicial de la Federación - Tesis API")
    print("="*80)
    
    # Inicializar cliente (auto-detecta la URL)
    client = SCJNAPIClient()
    
    # Test 1: Obtener total de tesis
    print("\n" + "─"*80)
    print("TEST 1: Get Total Count")
    print("─"*80)
    total = client.get_total_tesis()
    
    if total is None:
        print("\n⚠️  Could not retrieve total count. API might be down or URL incorrect.")
        print("Please check the base URL and try again.")
        return
    
    # Test 2: Obtener primera página de IDs
    print("\n" + "─"*80)
    print("TEST 2: Get First Page of IDs")
    print("─"*80)
    ids = client.get_tesis_ids(page=1)
    
    if ids is None or len(ids) == 0:
        print("\n⚠️  Could not retrieve IDs. Stopping tests.")
        return
    
    print(f"\nFirst 10 IDs:")
    for i, tid in enumerate(ids[:10], 1):
        print(f"  {i}. {tid}")
    
    # Test 3: Obtener detalles de la primera tesis
    print("\n" + "─"*80)
    print("TEST 3: Get First Tesis Details")
    print("─"*80)
    
    first_id = ids[0]
    tesis = client.get_tesis_by_id(first_id)
    
    if tesis:
        print_tesis_summary(tesis)
        
        # Guardar ejemplo completo en JSON
        output_file = "tesis_example.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(tesis, f, ensure_ascii=False, indent=2)
        print(f"\n💾 Full tesis saved to: {output_file}")
    
    # Test 4: Calcular páginas necesarias
    print("\n" + "─"*80)
    print("TEST 4: Calculate Total Pages")
    print("─"*80)
    
    ids_per_page = len(ids)
    total_pages = (total // ids_per_page) + (1 if total % ids_per_page else 0)
    
    print(f"Total tesis: {total:,}")
    print(f"IDs per page: {ids_per_page}")
    print(f"Total pages needed: {total_pages}")
    print(f"Estimated download time @ 1 req/sec: {total / 3600:.1f} hours")
    print(f"Estimated download time @ 5 req/sec: {total / (3600 * 5):.1f} hours")
    
    # Resumen final
    print("\n" + "="*80)
    print("✅ API TESTS COMPLETED SUCCESSFULLY")
    print("="*80)
    print(f"Base URL: {client.base_url}")
    print(f"Total Tesis: {total:,}")
    print(f"API Status: ✓ Operational")
    print("\nNext steps:")
    print("  1. Review tesis_example.json to understand data structure")
    print("  2. Implement full download script with rate limiting")
    print("  3. Set up data cleaning pipeline")
    print("="*80)


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
    except Exception as e:
        print(f"\n\n❌ Unexpected error: {e}")
        import traceback
        traceback.print_exc()