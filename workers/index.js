'use strict';

// Development/demo workers for the included BPMN. Notifications are logged to the
// console and allocation records are process variables only; replace these adapters
// with real email/database integrations before production use.
const { ZBClient } = require('zeebe-node');
const address = process.env.ZEEBE_ADDRESS || 'localhost:26500';
const zbc = new ZBClient(address, { useTLS: false });

const worker = (taskType, handler) => {
  zbc.createWorker({
    taskType,
    taskHandler: async (job) => {
      try {
        const result = await handler(job.variables || {}, job);
        console.log(`[${taskType}] completed job ${job.key}`);
        return result || {};
      } catch (err) {
        console.error(`[${taskType}] job ${job.key} failed:`, err.message);
        throw err;
      }
    }
  });
  console.log(`Registered worker: ${taskType}`);
};

worker('validate-proposal', async (v) => {
  const errors = [];
  if (!v.proposalId) errors.push('proposalId is required');
  if (!v.teamId) errors.push('teamId is required');
  if (!v.proposalDomain) errors.push('proposalDomain is required');
  if (!v.proposalTitle || String(v.proposalTitle).trim().length < 8) errors.push('proposalTitle must be at least 8 characters');
  if (!v.abstract || String(v.abstract).trim().length < 30) errors.push('abstract must be at least 30 characters');
  if (!Array.isArray(v.teamMembers) || v.teamMembers.length < 2 || v.teamMembers.length > 4) errors.push('teamMembers must contain 2–4 student IDs');
  const uniqueMembers = Array.isArray(v.teamMembers) ? new Set(v.teamMembers).size : 0;
  if (Array.isArray(v.teamMembers) && uniqueMembers !== v.teamMembers.length) errors.push('teamMembers must not contain duplicate student IDs');
  return {
    formValid: errors.length === 0,
    teamValid: Array.isArray(v.teamMembers) && v.teamMembers.length >= 2 && v.teamMembers.length <= 4 && uniqueMembers === v.teamMembers.length,
    errorList: errors,
    validationMessage: errors.length ? errors.join('; ') : 'Proposal form and team rules passed'
  };
});

worker('similarity-check', async (v) => {
  // Deterministic demo adapter. Replace with an actual topic index/similarity service.
  const score = Number.isFinite(Number(v.similarityScore)) ? Number(v.similarityScore) : 0.1;
  return { similarityScore: score, similarityThreshold: Number(v.similarityThreshold ?? 0.4) };
});

worker('load-guide-roster', async (v) => {
  const guides = Array.isArray(v.guides) ? v.guides : [];
  return { guides, excludedGuides: Array.isArray(v.excludedGuides) ? v.excludedGuides : [] };
});

worker('reserve-guide-slot', async (v) => {
  const allocation = v.allocation || {};
  const guides = Array.isArray(v.guides) ? v.guides : [];
  const guide = guides.find(g => g.id === allocation.guideId);
  if (!guide) throw new Error(`Cannot reserve slot: guide ${allocation.guideId || '(missing)'} not found in guides`);
  if (Number(guide.load || 0) >= Number(guide.maxLoad || 0)) throw new Error(`Cannot reserve slot: guide ${guide.id} is at capacity`);
  const updatedGuides = guides.map(g => g.id === guide.id ? { ...g, load: Number(g.load || 0) + 1 } : g);
  return { guides: updatedGuides, slotReserved: true, reservedGuideId: guide.id };
});

worker('release-guide-slot', async (v) => {
  const guideId = v.allocation?.guideId || v.reservedGuideId;
  const guides = Array.isArray(v.guides) ? v.guides : [];
  return {
    guides: guides.map(g => g.id === guideId ? { ...g, load: Math.max(0, Number(g.load || 0) - 1) } : g),
    slotReserved: false,
    releasedGuideId: guideId || null
  };
});

worker('record-guide-decline', async (v) => {
  const guideId = v.allocation?.guideId;
  const guides = Array.isArray(v.guides) ? v.guides : [];
  return {
    guides: guides.map(g => g.id === guideId ? { ...g, load: Math.max(0, Number(g.load || 0) - 1) } : g),
    slotReserved: false,
    lastDeclinedGuideId: guideId || null
  };
});

worker('record-allocation', async (v) => {
  if (!v.allocation?.guideId) throw new Error('allocation.guideId is required to record allocation');
  return { allocationRecorded: true, allocationRecord: { proposalId: v.proposalId, teamId: v.teamId, guideId: v.allocation.guideId, recordedAt: new Date().toISOString() } };
});

worker('record-withdrawal', async (v) => ({ withdrawalRecorded: true, withdrawalBy: v.withdrawalSource || 'none' }));

worker('send-notification', async (v, job) => {
  // Demo only: this logs the notification task. No email/message is sent.
  console.log('[notification demo]', JSON.stringify({
    taskType: job.type,
    proposalId: v.proposalId || null,
    teamId: v.teamId || null,
    taskKey: job.key,
    message: 'Replace this worker with your notification provider before production.'
  }));
  return { lastNotificationLogged: true };
});

process.on('SIGINT', async () => {
  console.log('Shutting down workers...');
  try { await zbc.close(); } finally { process.exit(0); }
});
