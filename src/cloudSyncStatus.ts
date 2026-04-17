export type CloudSyncStatus =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'load_success' }
  | { kind: 'saving' }
  | { kind: 'save_success' }
  | { kind: 'auth_error' }
  | { kind: 'error' };

export type OnCloudSyncStatusChange = (status: CloudSyncStatus) => void;
