import { AgnesClient } from '@agnes/core';

let _client = null;
let _config = null;

export function setAgnesConfig(cfg) { _config = cfg; _client = null; }

export function getAgnesClient() {
  if (!_client && _config) _client = new AgnesClient(_config);
  if (!_client) throw new Error('AgnesClient not initialized. Call setAgnesConfig first.');
  return _client;
}
