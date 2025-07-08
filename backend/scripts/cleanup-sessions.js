#!/usr/bin/env node
const mongoose = require('mongoose');
const SessionCleanupService = require('../services/sessionCleanupService');
require('dotenv').config();
const args = process.argv.slice(2);
const options = {
  type: 'daily',
  dryRun: false,
  days: 30,
  verbose: false,
  help: false
};
for (let i = 0; i < args.length; i++) {
  switch (args[i]) {
    case '--type':
      options.type = args[++i];
      break;
    case '--dry-run':
      options.dryRun = true;
      break;
    case '--days':
      options.days = parseInt(args[++i]) || 30;
      break;
    case '--verbose':
      options.verbose = true;
      break;
    case '--help':
      options.help = true;
      break;
    default:
      console.warn(`Unknown option: ${args[i]}`);
  }
}
if (options.help) {
  console.log(`
Session Cleanup Script
Usage: node scripts/cleanup-sessions.js [options]
Options:
  --type <type>     Type of cleanup: daily, weekly, monthly (default: daily)
  --dry-run         Show what would be cleaned without making changes
  --days <number>   Custom expiration threshold in days (default: 30)
  --verbose         Show detailed output
  --help            Show this help message
Examples:
  node scripts/cleanup-sessions.js
  node scripts/cleanup-sessions.js --type weekly --verbose
  node scripts/cleanup-sessions.js --dry-run --days 14
  node scripts/cleanup-sessions.js --type monthly
`);
  process.exit(0);
}
if (!['daily', 'weekly', 'monthly'].includes(options.type)) {
  console.error('❌ Invalid cleanup type. Must be: daily, weekly, or monthly');
  process.exit(1);
}
if (options.days < 1 || options.days > 365) {
  console.error('❌ Invalid days value. Must be between 1 and 365');
  process.exit(1);
}
async function runCleanup() {
  let connection;
  try {
    console.log('🔌 Connecting to MongoDB...');
    connection = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    if (options.verbose) {
      console.log('✅ Connected to MongoDB successfully');
    }
    const cleanupService = new SessionCleanupService();
    if (options.verbose) {
      console.log(`🧹 Starting ${options.type} cleanup...`);
      console.log(`📅 Expiration threshold: ${options.days} days`);
      console.log(`🔍 Dry run mode: ${options.dryRun ? 'ON' : 'OFF'}`);
    }
    let results;
    switch (options.type) {
      case 'daily':
        if (options.dryRun) {
          results = await performDryRunCleanup(cleanupService, options.days);
        } else {
          results = await cleanupService.performDailyCleanup();
        }
        break;
      case 'weekly':
        if (options.dryRun) {
          console.log('ℹ️ Dry run mode not supported for weekly compression');
          results = await cleanupService.performWeeklyCompression();
        } else {
          results = await cleanupService.performWeeklyCompression();
        }
        break;
      case 'monthly':
        results = await cleanupService.generateMonthlyReport();
        break;
      default:
        throw new Error(`Unsupported cleanup type: ${options.type}`);
    }
    displayResults(results, options);
    console.log('✅ Cleanup completed successfully');
  } catch (error) {
    console.error('❌ Cleanup failed:', error.message);
    if (options.verbose) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  } finally {
    if (connection) {
      await mongoose.connection.close();
      if (options.verbose) {
        console.log('🔌 Database connection closed');
      }
    }
  }
}
async function performDryRunCleanup(cleanupService, daysOld) {
  const Lead = require('../models/Lead');
  console.log('🔍 Performing dry run analysis...');
  const cutoffDate = new Date(Date.now() - (daysOld * 24 * 60 * 60 * 1000));
  const leadsWithExpiredSessions = await Lead.find({
    $or: [
      { 'browserSession.createdAt': { $lt: cutoffDate } },
      { 'sessionHistory.createdAt': { $lt: cutoffDate } }
    ]
  });
  let totalSessionsToRemove = 0;
  let leadsToClean = 0;
  for (const lead of leadsWithExpiredSessions) {
    let leadSessionsToRemove = 0;
    if (lead.browserSession && lead.browserSession.createdAt < cutoffDate) {
      leadSessionsToRemove++;
    }
    if (lead.sessionHistory) {
      const expiredHistorySessions = lead.sessionHistory.filter(
        session => session.createdAt < cutoffDate
      );
      leadSessionsToRemove += expiredHistorySessions.length;
    }
    if (leadSessionsToRemove > 0) {
      leadsToClean++;
      totalSessionsToRemove += leadSessionsToRemove;
      if (options.verbose) {
        console.log(`   Lead ${lead._id}: ${leadSessionsToRemove} sessions to remove`);
      }
    }
  }
  const leadsWithSessions = await Lead.find({
    $or: [
      { 'browserSession.sessionId': { $exists: true } },
      { 'sessionHistory.0': { $exists: true } }
    ]
  });
  let orphanedSessions = 0;
  for (const lead of leadsWithSessions) {
    if (lead.browserSession && (!lead.browserSession.sessionId || !lead.browserSession.createdAt)) {
      orphanedSessions++;
    }
    if (lead.sessionHistory) {
      const invalidSessions = lead.sessionHistory.filter(
        session => !session.sessionId || !session.createdAt
      );
      orphanedSessions += invalidSessions.length;
    }
  }
  return {
    dryRun: true,
    timestamp: new Date(),
    expiredSessions: {
      leadsProcessed: leadsWithExpiredSessions.length,
      leadsCleaned: leadsToClean,
      totalSessionsRemoved: totalSessionsToRemove,
      daysThreshold: daysOld,
      cutoffDate
    },
    orphanedSessions: {
      totalSessionsRemoved: orphanedSessions
    },
    totalSessionsToRemove: totalSessionsToRemove + orphanedSessions
  };
}
function displayResults(results, options) {
  console.log('\n📊 Cleanup Results:');
  console.log('==================');
  if (results.dryRun) {
    console.log('🔍 DRY RUN - No changes made');
    console.log(`📅 Sessions older than ${results.expiredSessions.daysThreshold} days would be removed`);
    console.log(`🧹 Total sessions to remove: ${results.totalSessionsToRemove}`);
    console.log(`📂 Leads to clean: ${results.expiredSessions.leadsCleaned}`);
    console.log(`🗑️ Orphaned sessions to remove: ${results.orphanedSessions.totalSessionsRemoved}`);
    return;
  }
  switch (options.type) {
    case 'daily':
      displayDailyResults(results, options);
      break;
    case 'weekly':
      displayWeeklyResults(results, options);
      break;
    case 'monthly':
      displayMonthlyResults(results, options);
      break;
  }
}
function displayDailyResults(results, options) {
  console.log(`⏱️ Duration: ${results.duration}ms`);
  console.log(`📅 Timestamp: ${results.timestamp}`);
  console.log();
  console.log('🗑️ Expired Sessions:');
  console.log(`   Leads processed: ${results.expiredSessions.leadsProcessed}`);
  console.log(`   Leads cleaned: ${results.expiredSessions.leadsCleaned}`);
  console.log(`   Sessions removed: ${results.expiredSessions.totalSessionsRemoved}`);
  console.log(`   Age threshold: ${results.expiredSessions.daysThreshold} days`);
  console.log();
  console.log('🔧 Orphaned Sessions:');
  console.log(`   Sessions removed: ${results.orphanedSessions.totalSessionsRemoved}`);
  console.log();
  console.log('📊 Session Limits:');
  console.log(`   Leads processed: ${results.limitEnforcement.leadsProcessed}`);
  console.log(`   Sessions removed: ${results.limitEnforcement.totalSessionsRemoved}`);
  console.log();
  console.log('❌ Invalid Sessions:');
  console.log(`   Leads processed: ${results.invalidSessions.leadsProcessed}`);
  console.log(`   Sessions removed: ${results.invalidSessions.totalSessionsRemoved}`);
  console.log();
  console.log(`🎯 Total Sessions Removed: ${results.totalSessionsRemoved}`);
}
function displayWeeklyResults(results, options) {
  console.log(`⏱️ Duration: ${results.duration}ms`);
  console.log(`📅 Timestamp: ${results.timestamp}`);
  console.log();
  console.log('🗜️ Compression Results:');
  console.log(`   Leads processed: ${results.compression.leadsProcessed}`);
  console.log(`   Sessions compressed: ${results.compression.sessionsCompressed}`);
  console.log(`   Space saved: ${results.compression.spaceSavedMB} MB`);
  console.log(`   Compression threshold: ${results.compression.compressionThresholdDays} days`);
  console.log();
  console.log('⚡ Optimization Results:');
  console.log(`   Leads processed: ${results.optimization.leadsProcessed}`);
  console.log(`   Leads optimized: ${results.optimization.leadsOptimized}`);
}
function displayMonthlyResults(results, options) {
  console.log(`⏱️ Duration: ${results.duration}ms`);
  console.log(`📅 Report Period: ${results.reportPeriod.month}`);
  console.log();
  console.log('📊 Session Summary:');
  console.log(`   Total leads with sessions: ${results.summary.totalLeadsWithSessions}`);
  console.log(`   Active sessions: ${results.summary.activeSessions}`);
  console.log(`   Total sessions: ${results.summary.totalSessions}`);
  console.log(`   Average sessions per lead: ${results.summary.averageSessionsPerLead.toFixed(2)}`);
  console.log();
  console.log('📈 Usage Analytics:');
  console.log(`   Session utilization rate: ${results.usageAnalytics.sessionUtilizationRate}%`);
  console.log(`   Recent session access: ${results.usageAnalytics.leadsWithRecentAccess} leads`);
  console.log(`   Average session age: ${results.usageAnalytics.averageSessionAgeInDays} days`);
  console.log();
  console.log('🏥 Health Metrics:');
  console.log(`   Session health score: ${results.healthMetrics.sessionHealthScore}%`);
  console.log(`   Expired sessions: ${results.healthMetrics.leadsWithExpiredSessions}`);
  console.log(`   Expiring soon: ${results.healthMetrics.leadsWithExpiringSessions}`);
  console.log();
  if (results.recommendations.length > 0) {
    console.log('💡 Recommendations:');
    results.recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. [${rec.priority.toUpperCase()}] ${rec.title}`);
      if (options.verbose) {
        console.log(`      ${rec.description}`);
        console.log(`      Action: ${rec.action}`);
      }
    });
  }
}
process.on('SIGINT', async () => {
  console.log('\n⚠️ Cleanup interrupted by user');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});
process.on('SIGTERM', async () => {
  console.log('\n⚠️ Cleanup terminated');
  if (mongoose.connection.readyState === 1) {
    await mongoose.connection.close();
  }
  process.exit(0);
});
if (require.main === module) {
  runCleanup().catch(error => {
    console.error('❌ Fatal error:', error.message);
    process.exit(1);
  });
}
module.exports = { runCleanup, performDryRunCleanup };