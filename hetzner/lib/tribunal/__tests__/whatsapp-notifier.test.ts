/**
 * Tests for whatsapp-notifier.ts
 * Priority 5: Profile validation, phone formatting, parameter mapping
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { sendTribunalWhatsAppAlert, NotifyParams } from '../whatsapp-notifier';
import { createMockSupabase } from '../../__tests__/test-utils/mocks';
import * as whatsapp from '../../whatsapp';

// Mock the whatsapp module
vi.mock('../../whatsapp', () => ({
  sendTribunalElectronicoAlert: vi.fn(),
  formatToWhatsApp: vi.fn((phone: string) => `whatsapp:${phone}`)
}));

describe('sendTribunalWhatsAppAlert', () => {
  let mockSupabase: ReturnType<typeof createMockSupabase>;
  let baseParams: NotifyParams;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase = createMockSupabase();

    baseParams = {
      userId: 'test-user-123',
      expediente: '01234/2025',
      juzgado: 'JUZGADO PRIMERO CIVIL',
      descripcion: 'AUTO DE TRÁMITE',
      fecha: '2026-02-09',
      supabase: mockSupabase as any
    };
  });

  describe('Profile Validation Chain', () => {
    it('should return no_profile status when user has no profile', async () => {
      mockSupabase.single.mockResolvedValue({
        data: null,
        error: { message: 'No profile found' }
      });

      const result = await sendTribunalWhatsAppAlert(baseParams);

      expect(result.success).toBe(false);
      expect(result.status).toBe('no_profile');
      expect(result.error).toBe('Usuario sin perfil');
    });

    it('should return disabled status when whatsapp_enabled is false', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          phone: '+526641234567',
          whatsapp_enabled: false
        },
        error: null
      });

      const result = await sendTribunalWhatsAppAlert(baseParams);

      expect(result.success).toBe(false);
      expect(result.status).toBe('disabled');
      expect(result.error).toBe('WhatsApp deshabilitado');
    });

    it('should return no_phone status when phone is null', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          phone: null,
          whatsapp_enabled: true
        },
        error: null
      });

      const result = await sendTribunalWhatsAppAlert(baseParams);

      expect(result.success).toBe(false);
      expect(result.status).toBe('no_phone');
      expect(result.error).toBe('Sin número de teléfono');
    });

    it('should proceed to send message when all checks pass', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          phone: '+526641234567',
          whatsapp_enabled: true
        },
        error: null
      });

      vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert').mockResolvedValue({
        success: true,
        messageId: 'SM-mock-123'
      });

      const result = await sendTribunalWhatsAppAlert(baseParams);

      expect(result.success).toBe(true);
      expect(result.status).toBe('sent');
      expect(result.messageId).toBe('SM-mock-123');
    });

    it('should query user_profiles with correct user ID', async () => {
      mockSupabase.single.mockResolvedValue({
        data: { phone: '+526641234567', whatsapp_enabled: true },
        error: null
      });

      vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert').mockResolvedValue({
        success: true,
        messageId: 'SM-mock-123'
      });

      await sendTribunalWhatsAppAlert(baseParams);

      expect(mockSupabase.from).toHaveBeenCalledWith('user_profiles');
      expect(mockSupabase.eq).toHaveBeenCalledWith('id', 'test-user-123');
    });
  });

  describe('Phone Formatting', () => {
    it('should format phone using formatToWhatsApp', async () => {
      const mockPhone = '+526641234567';
      mockSupabase.single.mockResolvedValue({
        data: {
          phone: mockPhone,
          whatsapp_enabled: true
        },
        error: null
      });

      const mockFormatToWhatsApp = vi.spyOn(whatsapp, 'formatToWhatsApp');
      mockFormatToWhatsApp.mockReturnValue(`whatsapp:${mockPhone}`);

      vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert').mockResolvedValue({
        success: true,
        messageId: 'SM-mock-123'
      });

      await sendTribunalWhatsAppAlert(baseParams);

      expect(mockFormatToWhatsApp).toHaveBeenCalledWith(mockPhone);
    });

    it('should handle bare phone number', async () => {
      const barePhone = '6641234567';
      mockSupabase.single.mockResolvedValue({
        data: {
          phone: barePhone,
          whatsapp_enabled: true
        },
        error: null
      });

      const mockFormatToWhatsApp = vi.spyOn(whatsapp, 'formatToWhatsApp');
      mockFormatToWhatsApp.mockReturnValue('whatsapp:+526641234567');

      vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert').mockResolvedValue({
        success: true,
        messageId: 'SM-mock-123'
      });

      await sendTribunalWhatsAppAlert(baseParams);

      expect(mockFormatToWhatsApp).toHaveBeenCalledWith(barePhone);
    });

    it('should handle already formatted whatsapp: prefix', async () => {
      const formattedPhone = 'whatsapp:+526641234567';
      mockSupabase.single.mockResolvedValue({
        data: {
          phone: formattedPhone,
          whatsapp_enabled: true
        },
        error: null
      });

      const mockFormatToWhatsApp = vi.spyOn(whatsapp, 'formatToWhatsApp');
      mockFormatToWhatsApp.mockReturnValue(formattedPhone);

      vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert').mockResolvedValue({
        success: true,
        messageId: 'SM-mock-123'
      });

      await sendTribunalWhatsAppAlert(baseParams);

      expect(mockFormatToWhatsApp).toHaveBeenCalledWith(formattedPhone);
    });
  });

  describe('Parameter Mapping', () => {
    beforeEach(() => {
      mockSupabase.single.mockResolvedValue({
        data: {
          phone: '+526641234567',
          whatsapp_enabled: true
        },
        error: null
      });
    });

    it('should use aiSummary in fecha parameter when provided', async () => {
      const mockSend = vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert');
      mockSend.mockResolvedValue({
        success: true,
        messageId: 'SM-mock-123'
      });

      const aiSummary = 'resumen: documento legal importante';
      await sendTribunalWhatsAppAlert({
        ...baseParams,
        aiSummary
      });

      expect(mockSend).toHaveBeenCalledWith({
        to: expect.any(String),
        expediente: baseParams.expediente,
        juzgado: baseParams.juzgado,
        fecha: aiSummary // Should use AI summary, not fecha param
      });
    });

    it('should fallback to descripcion when aiSummary is undefined', async () => {
      const mockSend = vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert');
      mockSend.mockResolvedValue({
        success: true,
        messageId: 'SM-mock-123'
      });

      await sendTribunalWhatsAppAlert({
        ...baseParams,
        aiSummary: undefined
      });

      expect(mockSend).toHaveBeenCalledWith({
        to: expect.any(String),
        expediente: baseParams.expediente,
        juzgado: baseParams.juzgado,
        fecha: baseParams.descripcion // Should use descripcion when no AI summary
      });
    });

    it('should pass expediente and juzgado correctly', async () => {
      const mockSend = vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert');
      mockSend.mockResolvedValue({
        success: true,
        messageId: 'SM-mock-123'
      });

      await sendTribunalWhatsAppAlert(baseParams);

      expect(mockSend).toHaveBeenCalledWith(
        expect.objectContaining({
          expediente: '01234/2025',
          juzgado: 'JUZGADO PRIMERO CIVIL'
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should return failed status when sendTribunalElectronicoAlert fails', async () => {
      mockSupabase.single.mockResolvedValue({
        data: {
          phone: '+526641234567',
          whatsapp_enabled: true
        },
        error: null
      });

      vi.spyOn(whatsapp, 'sendTribunalElectronicoAlert').mockResolvedValue({
        success: false,
        error: 'Twilio API error'
      });

      const result = await sendTribunalWhatsAppAlert(baseParams);

      expect(result.success).toBe(false);
      expect(result.status).toBe('failed');
      expect(result.error).toBe('Twilio API error');
    });

    it('should catch and return error when exception is thrown', async () => {
      mockSupabase.single.mockRejectedValue(new Error('Database connection failed'));

      const result = await sendTribunalWhatsAppAlert(baseParams);

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toBe('Database connection failed');
    });

    it('should handle non-Error exceptions', async () => {
      mockSupabase.single.mockRejectedValue('String error');

      const result = await sendTribunalWhatsAppAlert(baseParams);

      expect(result.success).toBe(false);
      expect(result.status).toBe('error');
      expect(result.error).toBe('Error desconocido');
    });
  });
});
