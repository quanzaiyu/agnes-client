import { logger } from '../utils/logger.js';

export function setupSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  if (typeof res.flushHeaders === 'function') res.flushHeaders();
}

export function writeSse(res, event, data) {
  const payload = typeof data === 'string' ? data : JSON.stringify(data);
  res.write(`event: ${event}\ndata: ${payload}\n\n`);
}

export function endSse(res) {
  res.write('event: end\ndata: [DONE]\n\n');
  res.end();
}

/**
 * Drain a streaming source to a function. Supports both async iterables
 * (Symbol.asyncIterator) and Node Readable streams (EventEmitter 'data' API).
 * Resolves when the stream ends. Calls onAbort if the consumer signals abort.
 */
function consumeStream(stream, onChunk, onAbort) {
  return new Promise((resolve, reject) => {
    if (stream && typeof stream[Symbol.asyncIterator] === 'function') {
      // Async iterable path
      (async () => {
        try {
          for await (const chunk of stream) {
            if (onAbort && onAbort()) break;
            onChunk(chunk);
          }
          resolve();
        } catch (err) {
          reject(err);
        }
      })();
      return;
    }
    if (stream && typeof stream.on === 'function') {
      // Node Readable / EventEmitter path
      stream.on('data', (chunk) => {
        if (onAbort && onAbort()) return;
        onChunk(chunk);
      });
      stream.on('end', () => resolve());
      stream.on('error', (err) => reject(err));
      return;
    }
    reject(new Error('streamChat: unsupported stream type from client.chat'));
  });
}

export async function streamChat({ req, res, client, params, onStart, onEnd, onError }) {
  setupSseHeaders(res);
  if (onStart) await onStart();
  let aborted = false;
  try {
    const stream = await client.chat({ ...params, stream: true });
    req.on('close', () => { aborted = true; });

    await consumeStream(
      stream,
      (chunk) => res.write(chunk),
      () => aborted
    );
    if (onEnd) await onEnd({ aborted });
  } catch (err) {
    logger.error('streamChat error', err);
    if (onError) await onError(err);
    res.write(`event: error\ndata: ${JSON.stringify({ error: err.message })}\n\n`);
  } finally {
    res.end();
  }
}
