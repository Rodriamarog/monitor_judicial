/**
 * Scraper Cron Job API Route
 *
 * Runs hourly during business hours (7am-7pm Tijuana time) via GitHub Actions
 * Downloads bulletins, parses them, finds matches, creates alerts
 */

import { NextRequest, NextResponse } from 'next/server';
import { scrapeAllBulletins } from '@/lib/scraper';
import { findAndCreateMatches, findAndCreateNameMatches, getUnsentAlerts, markAlertAsSent } from '@/lib/matcher';
import { sendBatchAlertEmail } from '@/lib/email';
import { sendWhatsAppAlert, formatToWhatsApp } from '@/lib/whatsapp';
import { createNotificationLogger } from '@/lib/notification-logger';

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

  // Initialize notification logger
  const logger = createNotificationLogger(supabaseUrl, supabaseKey);

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

    logger.info(`Starting scraper for ${targetDate}`, undefined, { dateParam });
    console.log(`Starting scraper for ${targetDate}`);

    // Step 1: Scrape all bulletins
    const scrapeResults = await scrapeAllBulletins(targetDate, supabaseUrl, supabaseKey);

    console.log('Scrape results:', {
      successful: scrapeResults.successful,
      failed: scrapeResults.failed,
      total_entries: scrapeResults.total_entries,
    });

    // Step 2: Find case matches and create alerts
    const matchResults = await findAndCreateMatches(targetDate, supabaseUrl, supabaseKey);

    console.log('Case match results:', {
      matches_found: matchResults.matches_found,
      alerts_created: matchResults.alerts_created,
    });

    // Step 3: Find name matches and create alerts (real-time, not historical)
    const nameMatchResults = await findAndCreateNameMatches(
      targetDate,
      supabaseUrl,
      supabaseKey,
      false // isHistorical = false, so notifications WILL be sent
    );

    console.log('Name match results:', {
      matches_found: nameMatchResults.matches_found,
      alerts_created: nameMatchResults.alerts_created,
    });

    // Historical bulletins retained indefinitely for analysis (removed 90-day cleanup 2026-01-14)

    // Step 3: Send email notifications for new alerts
    let emailResults = {
      sent: 0,
      failed: 0,
      errors: [] as string[],
    };

    if (matchResults.alerts_created > 0) {
      try {
        const unsentAlerts = await getUnsentAlerts(supabaseUrl, supabaseKey);
        logger.info(`Found ${unsentAlerts.length} unsent alerts to process`, undefined, {
          alertCount: unsentAlerts.length
        });
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
          // Get bulletin date from first bulletin entry (skip Tribunal alerts)
          const firstBulletinAlert = userAlerts.find(a => (a.bulletin_entries as any)?.bulletin_date);
          if (!firstBulletinAlert || !(firstBulletinAlert.bulletin_entries as any)?.bulletin_date) {
            console.warn(`Skipping ${userAlerts.length} alerts for user ${userId} - no bulletin entries (possibly Tribunal alerts)`);
            continue;
          }

          const bulletinDate = (firstBulletinAlert.bulletin_entries as any).bulletin_date;
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

          // Send consolidated email (only if user has email notifications enabled)
          let emailResult: { success: boolean; error?: string } = { success: true };
          if (userProfile.email_notifications_enabled !== false) {
            logger.info(`Sending email to ${userProfile.email}`, userAlerts[0].id, {
              alertCount: alerts.length,
              userEmail: userProfile.email
            });
            emailResult = await sendBatchAlertEmail({
              userEmail: userProfile.email,
              userName: userProfile.full_name,
              bulletinDate: bulletinDate,
              alerts: alerts,
            });

            if (emailResult.success) {
              logger.info(`✓ Email sent successfully to ${userProfile.email}`, userAlerts[0].id);
            } else {
              logger.error(`✗ Email failed to ${userProfile.email}`, userAlerts[0].id, {
                error: emailResult.error
              });
            }
          } else {
            logger.info(`Skipping email for ${userProfile.email} - notifications disabled`, userAlerts[0].id);
            console.log(`Skipping email for ${userProfile.email} - notifications disabled`);
          }

          // Send WhatsApp notification if user has it enabled and phone number
          let whatsappResult: { success: boolean; error?: string; messageId?: string } = {
            success: false,
            error: 'WhatsApp not enabled or no phone number'
          };

          if (userProfile.whatsapp_enabled && userProfile.phone) {
            try {
              const whatsappNumber = formatToWhatsApp(userProfile.phone);
              logger.info(`Sending WhatsApp to ${userProfile.phone}`, userAlerts[0].id, {
                alertCount: alerts.length,
                phone: userProfile.phone,
                formattedNumber: whatsappNumber
              });

              whatsappResult = await sendWhatsAppAlert({
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
                logger.info(`✓ WhatsApp sent successfully to ${userProfile.phone}`, userAlerts[0].id, {
                  messageId: whatsappResult.messageId
                });
                console.log(`✓ Sent WhatsApp to ${userProfile.phone} (${whatsappResult.messageId})`);
              } else {
                logger.error(`✗ WhatsApp send failed to ${userProfile.phone}`, userAlerts[0].id, {
                  error: whatsappResult.error,
                  phone: userProfile.phone
                });
                console.error(`✗ Failed WhatsApp to ${userProfile.phone}: ${whatsappResult.error}`);
              }
            } catch (whatsappError) {
              logger.error(`✗ WhatsApp exception for ${userProfile.phone}`, userAlerts[0].id, {
                error: whatsappError instanceof Error ? whatsappError.message : String(whatsappError),
                stack: whatsappError instanceof Error ? whatsappError.stack : undefined,
                phone: userProfile.phone
              });
              console.error(`WhatsApp error for ${userProfile.phone}:`, whatsappError);
              whatsappResult = {
                success: false,
                error: whatsappError instanceof Error ? whatsappError.message : 'Unknown WhatsApp error'
              };
            }
          } else {
            logger.info(`WhatsApp not enabled for user ${userProfile.email}`, userAlerts[0].id, {
              whatsappEnabled: userProfile.whatsapp_enabled,
              hasPhone: !!userProfile.phone
            });
            // WhatsApp not enabled, mark as success (no attempt needed)
            whatsappResult = { success: true };
          }

          // Send to collaborators (email only - no WhatsApp to protect infrastructure)
          // Build set of unique collaborator emails who are assigned to at least one alert
          const assignedCollaboratorsSet = new Set<string>();

          for (const alert of userAlerts) {
            const monitoredCase = alert.monitored_cases as any;
            const monitoredName = alert.monitored_names as any;

            // Get assigned_collaborators from the monitored case or name
            const assignedCollaborators = monitoredCase?.assigned_collaborators ||
                                         monitoredName?.assigned_collaborators ||
                                         [];

            // Add each to set (deduplicates automatically)
            for (const email of assignedCollaborators) {
              assignedCollaboratorsSet.add(email);
            }
          }

          // Get current valid collaborators from profile (for validation)
          const currentValidCollaborators = userProfile.collaborator_emails || [];

          // Filter to only include collaborators still in profile (handles removed collaborators)
          const collaboratorsToNotify = Array.from(assignedCollaboratorsSet).filter(
            email => currentValidCollaborators.includes(email)
          );

          logger.info(
            `Sending to ${collaboratorsToNotify.length} assigned collaborators`,
            userAlerts[0].id,
            { collaborators: collaboratorsToNotify }
          );

          // Send emails to assigned collaborators only
          for (const collabEmail of collaboratorsToNotify) {
            try {
              logger.info(`Sending email to assigned collaborator ${collabEmail}`, userAlerts[0].id, {
                alertCount: alerts.length
              });

              const collabEmailResult = await sendBatchAlertEmail({
                userEmail: collabEmail,
                userName: undefined, // No name for collaborators
                bulletinDate: bulletinDate,
                alerts: alerts,
              });

              if (collabEmailResult.success) {
                logger.info(`✓ Collaborator email sent to ${collabEmail}`, userAlerts[0].id);
                console.log(`✓ Sent collaborator email to ${collabEmail}`);
              } else {
                logger.error(`✗ Collaborator email failed to ${collabEmail}`, userAlerts[0].id, {
                  error: collabEmailResult.error
                });
                console.error(`✗ Failed collaborator email to ${collabEmail}: ${collabEmailResult.error}`);
              }

              // Small delay between collaborator emails
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (collabEmailError) {
              logger.error(`✗ Collaborator email exception for ${collabEmail}`, userAlerts[0].id, {
                error: collabEmailError instanceof Error ? collabEmailError.message : String(collabEmailError)
              });
              console.error(`Collaborator email error for ${collabEmail}:`, collabEmailError);
            }
          }

          // Mark all alerts for this user as sent (or failed)
          for (const alert of userAlerts) {
            await markAlertAsSent(
              alert.id,
              emailResult.success,
              emailResult.error || null,
              whatsappResult.success,
              whatsappResult.error || null,
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

        logger.info('Notification sending completed', undefined, {
          emailsSent: emailResults.sent,
          emailsFailed: emailResults.failed
        });
        console.log('Email results:', emailResults);

        // Flush all logs to database
        await logger.flush();
      } catch (error) {
        logger.error('Error sending notifications', undefined, {
          error: error instanceof Error ? error.message : String(error),
          stack: error instanceof Error ? error.stack : undefined
        });
        await logger.flush();
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
        case_matches_found: matchResults.matches_found,
        case_alerts_created: matchResults.alerts_created,
        name_matches_found: nameMatchResults.matches_found,
        name_alerts_created: nameMatchResults.alerts_created,
        sample_case_matches: matchResults.details.slice(0, 5),
        sample_name_matches: nameMatchResults.details.slice(0, 5),
      },
      notifications: {
        emails_sent: emailResults.sent,
        emails_failed: emailResults.failed,
        errors: emailResults.errors.slice(0, 5),
      },
    });
  } catch (error) {
    logger.error('Scraper fatal error', undefined, {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    });
    await logger.flush();
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
