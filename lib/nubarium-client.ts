const USE_DEMO_MODE = process.env.NUBARIUM_DEMO_MODE === 'true';

// Response types (handles both modern and legacy formats)
interface NubariumResponse<T = any> {
  status?: 'OK' | 'ERROR';
  estatus?: 'OK' | 'ERROR';
  messageCode?: number;
  codigoMensaje?: string | number;
  message?: string;
  validationCode?: string;
  codigoValidacion?: string;
  data?: T;
  // Service-specific fields
  [key: string]: any;
}

export class NubariumClient {
  private credentials: string;

  constructor() {
    const username = process.env.NUBARIUM_USERNAME || 'demo';
    const password = process.env.NUBARIUM_PASSWORD || 'demo';
    this.credentials = Buffer.from(`${username}:${password}`).toString('base64');
  }

  /**
   * Make a POST request to Nubarium API
   * @param fullUrl - Complete URL including subdomain (e.g., 'https://curp.nubarium.com/renapo/v3/valida_curp')
   * @param body - Request body
   */
  async post<T = any>(
    fullUrl: string,
    body: any
  ): Promise<NubariumResponse<T>> {
    if (USE_DEMO_MODE) {
      console.log(`[Nubarium] Demo mode - URL: ${fullUrl}`);
      return this.getDemoResponse(fullUrl, body);
    }

    console.log(`[Nubarium] Real API call - URL: ${fullUrl}`);

    const response = await fetch(fullUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${this.credentials}`
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Nubarium] API error: ${response.status} ${errorText}`);
      throw new Error(`Nubarium API error: ${response.statusText}`);
    }

    return response.json();
  }

  private getDemoResponse(fullUrl: string, body: any): NubariumResponse {
    // Extract endpoint path for matching (remove protocol and domain)
    const urlPath = fullUrl.replace(/^https?:\/\/[^\/]+/, '');

    console.log(`[Nubarium] Demo response for: ${urlPath}`);

    // Demo responses mapped by URL path (loaded from fetched documentation)
    const demoResponses: Record<string, any> = {
      // CURP Services
      '/renapo/v3/valida_curp': {
        estatus: 'OK',
        mensaje: 'CURP válido - Registro encontrado en RENAPO',
        codigoValidacion: 'vc1619806387.2754068',
        curp: body.curp || 'RAZR811012HVZMPB00',
        nombre: 'RAMIRO ALONSO',
        apellidoPaterno: 'RASCON',
        apellidoMaterno: 'ZAPATA',
        sexo: 'HOMBRE',
        fechaNacimiento: '11/10/1981',
        paisNacimiento: 'MEXICO',
        estadoNacimiento: 'VERACRUZ',
        docProbatorio: 1,
        datosDocProbatorio: {
          entidadRegistro: 'VERACRUZ',
          claveEntidadRegistro: '30',
          municipioRegistro: 'MINATITLÁN',
          claveMunicipioRegistro: '108',
          numActa: '03382',
          anioReg: '1983'
        },
        estatusCurp: 'RCN',
        codigoMensaje: '0'
      },

      '/renapo/obtener_curp': {
        estatus: 'OK',
        mensaje: 'CURP generado exitosamente',
        codigoValidacion: 'gc1619806387.2754068',
        curp: 'RAGJ810101HJCMRN09',
        nombre: body.nombre || 'JUAN',
        apellidoPaterno: body.primerApellido || 'RAMIREZ',
        apellidoMaterno: body.segundoApellido || 'GARCIA',
        sexo: body.sexo || 'HOMBRE',
        fechaNacimiento: body.fechaNacimiento || '01/01/1981',
        paisNacimiento: 'MEXICO',
        estadoNacimiento: body.entidad || 'JALISCO',
        docProbatorio: 1,
        datosDocProbatorio: {
          entidadRegistro: body.entidad || 'JALISCO',
          claveEntidadRegistro: '14',
          municipioRegistro: 'GUADALAJARA',
          claveMunicipioRegistro: '039',
          numActa: '00123',
          anioReg: '1981'
        },
        estatusCurp: 'AN',
        codigoMensaje: '0'
      },

      // REPUVE
      '/mex/services/v1/validate-repuve': {
        status: 'OK',
        messageCode: 0,
        message: 'Vehicle registered in REPUVE',
        validationCode: 'rpv1753229731.576453733284',
        data: {
          repuveId: '23946829',
          vehicle: {
            vin: body.vin || '1NCCN82233A223456',
            placa: body.placa || 'X12BCD',
            nic: body.nic || 'NICABCDEF12345',
            clase: 'AUTOMOVIL',
            tipo: 'SEDAN',
            marca: 'ACME',
            linea: 'SEDÁN',
            modelo: 'FALCON',
            anioModelo: '2019',
            cilindros: '4',
            puertas: '4',
            asientos: '5',
            combustible: 'GASOLINA',
            transmision: 'AUTOMATICA',
            color: 'AZUL',
            numeroSerie: '1NCCN82233A223456',
            numeroMotor: 'MTR123456',
            capacidadCarga: '500',
            origin: 'IMPORTADO',
            procedencia: 'ESTADOS UNIDOS'
          }
        }
      },

      // Geographic Intelligence
      '/mex/geo/v1/insights': {
        status: 'OK',
        messageCode: 0,
        message: 'Valid Address',
        validationCode: 'adn1234567890.123456',
        insights: {
          conapo: {
            level: 4,
            levelCode: 'high',
            municipality: 'Guadalajara',
            state: 'Jalisco',
            locality: 'Guadalajara'
          },
          sepomex: {
            postalCode: '44100',
            colony: 'Centro',
            municipality: 'Guadalajara',
            state: 'Jalisco'
          }
        }
      },

      '/mex/geo/v1/analyze-position': {
        status: 'OK',
        messageCode: 0,
        message: 'Position analyzed',
        validationCode: 'pos1234567890.123456',
        addresses: [{
          formattedAddress: 'Av. Chapultepec 480, Americana, 44160 Guadalajara, Jal., Mexico',
          street: 'Av. Chapultepec',
          streetNumber: '480',
          colony: 'Americana',
          municipality: 'Guadalajara',
          state: 'Jalisco',
          postalCode: '44160',
          country: 'Mexico',
          lat: body.lat || 20.6736,
          lng: body.lng || -103.3467
        }]
      },

      '/mex/geo/v1/analyze-address': {
        status: 'OK',
        messageCode: 0,
        message: 'Address analyzed',
        validationCode: 'addr1234567890.123456',
        addresses: [{
          formattedAddress: body.address || 'Av. Chapultepec 480, Americana, Guadalajara, Jalisco',
          lat: 20.6736,
          lng: -103.3467,
          street: 'Av. Chapultepec',
          streetNumber: '480',
          colony: 'Americana',
          municipality: 'Guadalajara',
          state: 'Jalisco',
          postalCode: '44160',
          country: 'Mexico'
        }]
      },

      // SAT - RFC Validation
      '/sat/valida_rfc': {
        estatus: 'OK',
        mensaje: 'RFC válido',
        informacionAdicional: 'Persona Física',
        tipoPersona: 'F',
        codigoValidacion: 'rfc1234567890.123456',
        claveMensaje: '0'
      },

      // SEP - Cédula Profesional
      '/sep/obtener_cedula': {
        cedulas: [{
          numeroCedula: body.numeroCedula || '12345678',
          nombre: 'JUAN PEREZ GARCIA',
          titulo: 'LICENCIADO EN DERECHO',
          institucion: 'UNIVERSIDAD DE GUADALAJARA',
          fechaExpedicion: '15/05/2015',
          numeroRegistro: 'REG123456'
        }],
        estatus: 'OK',
        codigoValidacion: 'sep1234567890.123456',
        codigoMensaje: '0'
      },

      // SAT Article 69-B
      '/sat/consultar_69b': {
        estatus: 'OK',
        claveMensaje: '0',
        codigoValidacion: '69b1234567890.123456',
        rfc: body.rfc || 'XAXX010101000',
        nombreContribuyente: 'CONTRIBUYENTE EJEMPLO',
        situacion: 'NO LOCALIZADO',
        publicacionDofPresunto: '2023-01-15',
        publicacionSatPresunto: '2023-01-15',
        numeroFechaOficioPresunto: 'OFICIO123 - 2023-01-10'
      },
    };

    const response = demoResponses[urlPath];

    if (!response) {
      console.warn(`[Nubarium] No demo response configured for: ${urlPath}`);
      return {
        status: 'ERROR',
        messageCode: 999,
        message: `Demo response not configured for endpoint: ${urlPath}`
      };
    }

    return response;
  }
}

export const nubariumClient = new NubariumClient();
