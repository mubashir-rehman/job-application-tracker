import { supabase } from '../supabaseClient';

/**
 * Robust getter to retrieve the Google provider access token from the Supabase session
 * or fallback to inspecting localStorage.
 */
export async function getGoogleAccessToken(): Promise<string | null> {
  if (!supabase) return null;
  
  // 1. Check current session
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.provider_token) {
      return session.provider_token;
    }
  } catch (e) {
    console.error("Error getting session for provider_token:", e);
  }

  // 2. Fallback: inspect localStorage for Supabase persistent auth item
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('sb-') && key.endsWith('-auth-token')) {
        const item = localStorage.getItem(key);
        if (item) {
          const parsed = JSON.parse(item);
          if (parsed?.provider_token) {
            return parsed.provider_token;
          }
        }
      }
    }
  } catch (e) {
    console.error("Error reading provider_token from localStorage:", e);
  }

  return null;
}

/**
 * Searches for a folder named "HireTrack Resumes" in the user's Drive.
 * If not found, creates it.
 * Returns the folder's Google Drive ID.
 */
async function getOrCreateFolder(accessToken: string): Promise<string> {
  const folderName = "HireTrack Resumes";
  
  // 1. Search for existing folder
  const query = encodeURIComponent(`name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`);
  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`;
  
  const searchResponse = await fetch(searchUrl, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    }
  });

  if (!searchResponse.ok) {
    const errText = await searchResponse.text();
    throw new Error(`Failed to query Google Drive folder: ${errText}`);
  }

  const searchData = await searchResponse.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Folder does not exist, so create it
  const createUrl = 'https://www.googleapis.com/drive/v3/files';
  const createResponse = await fetch(createUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`Failed to create Google Drive folder: ${errText}`);
  }

  const folderData = await createResponse.json();
  return folderData.id;
}

interface UploadResult {
  fileId: string;
  viewLink: string;
}

/**
 * Uploads a file (PDF, DOCX, etc.) to the user's "HireTrack Resumes" Google Drive folder.
 * Returns the file ID and direct viewable Google Drive URL.
 */
export async function uploadResumeToDrive(file: File): Promise<UploadResult> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken) {
    throw new Error("Google access token not found. Please re-authenticate with Google.");
  }

  // Get or create the folder ID
  const folderId = await getOrCreateFolder(accessToken);

  // Set up multipart/related body
  const boundary = 'hiretrack_gdrive_upload_boundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const metadata = {
    name: file.name,
    parents: [folderId],
    mimeType: file.type || 'application/pdf'
  };

  const metadataPart = `${delimiter}Content-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n`;
  const mediaHeaderPart = `${delimiter}Content-Type: ${file.type || 'application/octet-stream'}\r\n\r\n`;

  // Construct binary payload
  const blob = new Blob([
    metadataPart,
    mediaHeaderPart,
    file,
    closeDelimiter
  ], { type: `multipart/related; boundary=${boundary}` });

  const uploadUrl = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink';
  const response = await fetch(uploadUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`
    },
    body: blob
  });

  if (!response.ok) {
    const errText = await response.text();
    // Check if unauthorized (token expired)
    if (response.status === 401) {
      throw new Error("Your Google session has expired. Please log out and sign in again using Google.");
    }
    throw new Error(`Upload failed: ${errText}`);
  }

  const responseData = await response.json();
  const fileId = responseData.id;
  
  // Return the file ID and a clean viewer link
  // Note: WebViewLink is perfect, but we can also use direct view URL
  const viewLink = responseData.webViewLink || `https://drive.google.com/file/d/${fileId}/view?usp=drivesdk`;

  return {
    fileId,
    viewLink
  };
}
