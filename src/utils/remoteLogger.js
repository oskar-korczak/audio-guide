// remoteLogger.js - Send logs to ntfy.sh for remote viewing
// View logs: curl -s ntfy.sh/audio-guide-logs-oskar/raw

const TOPIC = 'audio-guide-logs-oskar';
const NTFY_URL = `https://ntfy.sh/${TOPIC}`;

const logBuffer = [];
let flushTimeout = null;

/**
 * Send log to remote server
 */
async function sendLog(level, ...args) {
  const message = args.map(arg =>
    typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
  ).join(' ');

  const entry = {
    ts: new Date().toISOString(),
    level,
    msg: message,
    ua: navigator.userAgent.slice(0, 50)
  };

  logBuffer.push(entry);

  // Debounce: flush after 500ms of no new logs
  clearTimeout(flushTimeout);
  flushTimeout = setTimeout(flushLogs, 500);
}

/**
 * Flush buffered logs to ntfy
 */
async function flushLogs() {
  if (logBuffer.length === 0) return;

  const logs = logBuffer.splice(0, logBuffer.length);
  const body = logs.map(l => `[${l.ts.slice(11, 19)}] ${l.level}: ${l.msg}`).join('\n');

  try {
    await fetch(NTFY_URL, {
      method: 'POST',
      body: body,
      headers: { 'Title': `AudioGuide ${logs[0].level}` }
    });
  } catch (e) {
    // Silently fail - don't break the app
  }
}

/**
 * Remote logger interface
 */
export const rlog = {
  log: (...args) => sendLog('INFO', ...args),
  info: (...args) => sendLog('INFO', ...args),
  warn: (...args) => sendLog('WARN', ...args),
  error: (...args) => sendLog('ERROR', ...args),
  debug: (...args) => sendLog('DEBUG', ...args),
};

// Also capture uncaught errors
window.addEventListener('error', (e) => {
  sendLog('ERROR', `Uncaught: ${e.message} at ${e.filename}:${e.lineno}`);
});

window.addEventListener('unhandledrejection', (e) => {
  sendLog('ERROR', `Unhandled rejection: ${e.reason}`);
});

// Log page load
sendLog('INFO', 'Page loaded', window.location.href);
