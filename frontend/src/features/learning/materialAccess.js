import { materialService } from './api.js';

export async function performMaterialAccess({
  materialId,
  filename,
  mode = 'view',
}, dependencies = {}) {
  const browser = dependencies.browser || window;
  const documentRef = dependencies.document || document;
  const createObjectUrl = dependencies.createObjectUrl || materialService.createDownloadObjectUrl;
  const previewWindow = mode === 'view' ? browser.open('about:blank', '_blank') : null;
  if (previewWindow) previewWindow.opener = null;

  try {
    const objectUrl = await createObjectUrl(materialId, { view: mode === 'view' });
    if (mode === 'view') {
      if (previewWindow) previewWindow.location.href = objectUrl;
      else browser.open(objectUrl, '_blank', 'noopener,noreferrer');
    } else {
      const anchor = documentRef.createElement('a');
      anchor.href = objectUrl;
      anchor.download = filename || 'material';
      documentRef.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
    }
    browser.setTimeout(() => browser.URL.revokeObjectURL(objectUrl), 60_000);
  } catch (error) {
    previewWindow?.close();
    throw error;
  }
}
