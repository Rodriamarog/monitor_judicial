/**
 * Scraper Cron Job API Route
 *
 * Runs every 30 minutes during business hours (6am-2pm Tijuana time)
 * Downloads bulletins, parses them, finds matches, creates alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllBulletins } from '@/lib/scraper';
import { findAndCreateMatches, getUnsentAlerts, markAlertAsSent } from '@/lib/matcher';
import { sendBatchAlertEmail } from '@/lib/email';
import { sendWhatsAppAlert, formatToWhatsApp } from '@/lib/whatsapp';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes max execution time

export async function GET(request: NextRequest) {
  // Verify cron secret to prevent unauthorized access
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Missing Supabase configuration' },
      { status: 500 }
    );
  }

  try {
    // Get date parameter from query (?date=tomorrow or ?date=YYYY-MM-DD)
    const { searchParams } = new URL(request.url);
    const dateParam = searchParams.get('date');

    // Calculate target date
    let targetDate: string;
    if (dateParam === 'tomorrow') {
      // Get tomorrow's date in Tijuana timezone
      const now = new Date();
      const tijuanaDate = new Date(now.toLocaleString('en-US', { timeZone: 'America/Tijuana' }));
      tijuanaDate.setDate(tijuanaDate.getDate() + 1);
      targetDate = tijuanaDate.toISOString().split('T')[0];
    } else if (dateParam) {
      // Use provided date (format: YYYY-MM-DD)
      targetDate = dateParam;
    } else {
      // Default: today's date in Tijuana timezone
      targetDate = new Date().toLocaleDateString('en-CA', {
        timeZone: 'America/Tijuana',
      });
    }

    console.log(`Starting scraper for ${targetDate}`);

    // Step 1: Scrape all bulletins
    const scrapeResults = await scrapeAllBulletins(targetDate, supabaseUrl, supabaseKey);

    console.log('Scrape results:', {
      successful: scrapeResults.successful,
      failed: scrapeResults.failed,
      total_entries: scrapeResults.total_entries,
    });

    // Step 2: Find matches and create alerts
    const matchResults = await findAndCreateMatches(targetDate, supabaseUrl, supabaseKey);

    console.log('Match results:', {
      matches_found: matchResults.matches_found,
      alerts_created: matchResults.alerts_created,
    });

    // Step 3: Send email notifications for new alerts
    let emailResults = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (matchResults.alerts_created > 0) {
      try {
        const unsentAlerts = await getUnsentAlerts(supabaseUrl, supabaseKey);
        console.log(`Found ${unsentAlerts.length} unsent alerts to process`);

        // Group alerts by user_id
        const alertsByUser = new Map<string, typeof unsentAlerts>();
        for (const alert of unsentAlerts) {
          const userId = alert.user_id;
          if (!alertsByUser.has(userId)) {
            alertsByUser.set(userId, []);
          }
          alertsByUser.get(userId)!.push(alert);
        }

        console.log(`Grouped into ${alertsByUser.size} users`);

        // Send one consolidated email per user
        for (const [userId, userAlerts] of alertsByUser.entries()) {
          const firstAlert = userAlerts[0];
          const userProfile = firstAlert.user_profiles as any;

          if (!userProfile?.email) {
            console.warn(`Skipping ${userAlerts.length} alerts for user ${userId} - no email`);
            continue;
          }

          // Prepare consolidated alert data
          const bulletinDate = (firstAlert.bulletin_entries as any).bulletin_date;
          const alerts = userAlerts.map(alert => {
            const monitoredCase = alert.monitored_cases as any;
            const bulletinEntry = alert.bulletin_entries as any;
            return {
              caseNumber: monitoredCase.case_number,
              juzgado: monitoredCase.juzgado,
              caseName: monitoredCase.nombre,
              rawText: bulletinEntry.raw_text,
              bulletinUrl: bulletinEntry.bulletin_url,
            };
          });

          // Send consolidated email
          const emailResult = await sendBatchAlertEmail({
            userEmail: userProfile.email,
            userName: userProfile.full_name,
            bulletinDate: bulletinDate,
            alerts: alerts,
          });

          // Send WhatsApp notification if user has it enabled and phone number
          if (userProfile.whatsapp_enabled && userProfile.phone) {
            try {
              const whatsappNumber = formatToWhatsApp(userProfile.phone);
              const whatsappResult = await sendWhatsAppAlert({
                to: whatsappNumber,
                userName: userProfile.full_name,
                bulletinDate: bulletinDate,
                alerts: alerts.map(a => ({
                  caseNumber: a.caseNumber,
                  juzgado: a.juzgado,
                  caseName: a.caseName,
                  rawText: a.rawText,
                })),
              });

              if (whatsappResult.success) {
                console.log(`✓ Sent WhatsApp to ${userProfile.phone} (${whatsappResult.messageId})`);
              } else {
                console.error(`✗ Failed WhatsApp to ${userProfile.phone}: ${whatsappResult.error}`);
              }
            } catch (whatsappError) {
              console.error(`WhatsApp error for ${userProfile.phone}:`, whatsappError);
            }
          }

          // Mark all alerts for this user as sent (or failed)
          for (const alert of userAlerts) {
            await markAlertAsSent(
              alert.id,
              emailResult.success,
              emailResult.error || null,
              supabaseUrl,
              supabaseKey
            );
          }

          if (emailResult.success) {
            emailResults.sent++;
            console.log(`✓ Sent consolidated email to ${userProfile.email} with ${alerts.length} alerts`);
          } else {
            emailResults.failed++;
            if (emailResult.error) {
              emailResults.errors.push(emailResult.error);
            }
            console.error(`✗ Failed to send to ${userProfile.email}: ${emailResult.error}`);
          }

          // Small delay to avoid rate limiting
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        console.log('Email results:', emailResults);
      } catch (error) {
        console.error('Error sending emails:', error);
        emailResults.errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    return NextResponse.json({
      success: true,
      date: targetDate,
      scraping: {
        sources_scraped: scrapeResults.successful,
        sources_failed: scrapeResults.failed,
        total_entries: scrapeResults.total_entries,
        details: scrapeResults.details,
      },
      matching: {
        total_new_entries: matchResults.total_new_entries,
        total_monitored_cases: matchResults.total_monitored_cases,
        matches_found: matchResults.matches_found,
        alerts_created: matchResults.alerts_created,
        sample_matches: matchResults.details.slice(0, 5),
      },
      notifications: {
        emails_sent: emailResults.sent,
        emails_failed: emailResults.failed,
        errors: emailResults.errors.slice(0, 5),
      },
    });
  } catch (error) {
    console.error('Scraper error:', error);
    return NextResponse.json(
      {
        error: 'Scraper failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
