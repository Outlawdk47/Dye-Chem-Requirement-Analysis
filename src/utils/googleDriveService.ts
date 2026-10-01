// Google Drive API Integration Helper Service (Client-Side)

const FOLDER_NAME = 'ProcurePlan ERP';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

let cachedAccessToken: string | null = null;

export function getStoredAccessToken(): string | null {
  return cachedAccessToken;
}

export function saveAccessToken(token: string) {
  cachedAccessToken = token;
}

export function clearAccessToken() {
  cachedAccessToken = null;
}

/**
 * Ensures a dedicated folder named "ProcurePlan ERP" exists in Google Drive.
 * Returns the folder ID.
 */
export async function searchOrCreateFolder(token: string): Promise<string> {
  // 1. Search for existing folder
  const query = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;

  const searchRes = await fetch(searchUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!searchRes.ok) {
    if (searchRes.status === 401) {
      throw new Error('UNAUTHORIZED');
    }
    throw new Error(`Google Drive API search failed: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Create the folder if not found
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createRes = await fetch(createUrl, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder',
    }),
  });

  if (!createRes.ok) {
    throw new Error(`Failed to create Google Drive folder: ${createRes.statusText}`);
  }

  const createData = await createRes.json();
  return createData.id;
}

/**
 * Lists all active spreadsheet files in the folder.
 */
export async function listFilesInFolder(token: string, folderId: string): Promise<DriveFile[]> {
  const query = encodeURIComponent(`'${folderId}' in parents and trashed=false`);
  const url = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,mimeType)`;

  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to list files in Google Drive folder: ${res.statusText}`);
  }

  const data = await res.json();
  return data.files || [];
}

/**
 * Deletes a file from Google Drive.
 */
export async function deleteFile(token: string, fileId: string): Promise<void> {
  const url = `https://www.googleapis.com/drive/v3/files/${fileId}`;
  const res = await fetch(url, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok && res.status !== 404) {
    throw new Error(`Failed to delete file ${fileId} from Google Drive: ${res.statusText}`);
  }
}

/**
 * Uploads a spreadsheet file to the specified Google Drive folder.
 * Returns the uploaded file ID.
 */
export async function uploadFileToFolder(token: string, folderId: string, file: File): Promise<string> {
  const metadata = {
    name: file.name,
    parents: [folderId],
  };

  const formData = new FormData();
  formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  formData.append('file', file);

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });

  if (!res.ok) {
    throw new Error(`Failed to upload file to Google Drive: ${res.statusText}`);
  }

  const data = await res.json();
  return data.id;
}

/**
 * Downloads a file's binary content from Google Drive.
 */
export async function downloadFileContent(token: string, fileId: string): Promise<Blob> {
  const downloadUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`;
  const res = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!res.ok) {
    throw new Error(`Failed to download file content from Google Drive: ${res.statusText}`);
  }

  return await res.blob();
}
