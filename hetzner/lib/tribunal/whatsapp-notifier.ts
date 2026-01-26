/**
 * Tribunal WhatsApp Notifier
 * Sends WhatsApp alerts for new tribunal documents
 */

import { SupabaseClient } from '@supabase/supabase-js';
import { sendWhatsAppAlert, formatToWhatsApp } from '../whatsapp';

export interface NotifyParams {
  userId: string;
  documentId: string;
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
      .eq('user_id', userId)
      .single();

    if (profileError || !profile) {
      console.log(`[WhatsApp] User ${userId} has no profile, skipping notification`);
      return {
        success: false,
        error: 'Usuario sin perfil',
        status: 'no_profile'
      };
    }

    // Check if WhatsApp is enabled
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

    // Format bulletin date
    const bulletinDate = fecha || new Date().toISOString().split('T')[0];

    // Build alert text including AI summary
    let rawText = descripcion;
    if (aiSummary) {
      rawText += `\n\n📋 Resumen IA:\n${aiSummary}`;
    }

    // Send WhatsApp alert using existing template
    const result = await sendWhatsAppAlert({
      to: whatsappNumber,
      bulletinDate,
      alerts: [{
        caseNumber: expediente,
        juzgado,
        caseName: null,
        rawText
      }]
    });

    if (result.success) {
      console.log(`[WhatsApp] ✓ Alert sent to ${whatsappNumber} for doc ${documentId}`);
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
