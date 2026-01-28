/**
 * Tribunal WhatsApp Notifier
 * Sends WhatsApp alerts for new tribunal documents
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { sendTribunalElectronicoAlert, formatToWhatsApp } from '../whatsapp';

export interface NotifyParams {
  userId: string;
  documentId?: string; // Optional - for backwards compatibility
  expediente: string;
  juzgado: string;
  descripcion: string;
  fecha: string;
  aiSummary?: string;
  supabase: SupabaseClient;
}

export interface NotifyResult {
  success: boolean;
  messageId?: string;
  error?: string;
  status?: string;
}

/**
 * Send WhatsApp alert for a tribunal document
 */
export async function sendTribunalWhatsAppAlert(
  params: NotifyParams
): Promise<NotifyResult> {
  const {
    userId,
    documentId,
    expediente,
    juzgado,
    descripcion,
    fecha,
    aiSummary,
    supabase
  } = params;

  try {
    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('phone, whatsapp_enabled')
      .eq('id', userId)
      .single();

    if (profileError || !profile) {
      console.log(`[WhatsApp] User ${userId} has no profile, skipping notification`);
      return {
        success: false,
        error: 'Usuario sin perfil',
        status: 'no_profile'
      };
    }

    // Check if WhatsApp notifications are enabled
    if (!profile.whatsapp_enabled) {
      console.log(`[WhatsApp] User ${userId} has WhatsApp disabled, skipping notification`);
      return {
        success: false,
        error: 'WhatsApp deshabilitado',
        status: 'disabled'
      };
    }

    // Check if user has phone number
    if (!profile.phone) {
      console.log(`[WhatsApp] User ${userId} has no phone number, skipping notification`);
      return {
        success: false,
        error: 'Sin número de teléfono',
        status: 'no_phone'
      };
    }

    // Format phone to WhatsApp format
    const whatsappNumber = formatToWhatsApp(profile.phone);

    // Send Tribunal Electrónico alert with AI summary
    const result = await sendTribunalElectronicoAlert({
      to: whatsappNumber,
      expediente,
      juzgado,
      aiSummary
    });

    if (result.success) {
      const docRef = documentId ? `doc ${documentId}` : `${expediente}`;
      console.log(`[WhatsApp] ✓ Alert sent to ${whatsappNumber} for ${docRef}`);
      return {
        success: true,
        messageId: result.messageId,
        status: 'sent'
      };
    } else {
      console.error(`[WhatsApp] Failed to send alert:`, result.error);
      return {
        success: false,
        error: result.error,
        status: 'failed'
      };
    }

  } catch (error) {
    console.error('[WhatsApp] Error sending notification:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      status: 'error'
    };
  }
}
