import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config();

export interface TribunalConfig {
  email: string;
  password: string;
  cerPath: string;
  keyPath: string;
  loginUrl: string;
}

function validateEnvVar(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export function getConfig(): TribunalConfig {
  const email = validateEnvVar('TRIBUNAL_ELECTRONICO_CORREO', process.env.TRIBUNAL_ELECTRONICO_CORREO);
  const password = validateEnvVar('TRIBUNAL_ELECTRONICO_CLAVE', process.env.TRIBUNAL_ELECTRONICO_CLAVE);
  const cerPath = validateEnvVar('CER_PATH', process.env.CER_PATH);
  const keyPath = validateEnvVar('KEY_PATH', process.env.KEY_PATH);

  return {
    email,
    password,
    cerPath: path.resolve(cerPath),
    keyPath: path.resolve(keyPath),
    loginUrl: 'https://sjpo.pjbc.gob.mx/TribunalElectronico/login.aspx?ReturnUrl=%2ftribunalelectronico%2fdefault.aspx%3fver%3d1.2.4&ver=1.2.4'
  };
}
