interface SyncPayload {
  action: 'checkin' | 'checkout' | 'sync_day' | 'sync_month';
  data: Record<string, unknown>;
}

interface SyncResponse {
  success: boolean;
  message?: string;
  data?: unknown;
}

/**
 * Send data to Google Apps Script Web App endpoint
 * This handles the Web → Sheets direction
 */
export async function syncToSheets(payload: SyncPayload): Promise<SyncResponse> {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  
  if (!scriptUrl) {
    console.warn('GOOGLE_APPS_SCRIPT_URL not configured, skipping sync');
    return { success: false, message: 'Sync URL not configured' };
  }

  try {
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Sync failed: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Google Sheets sync error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown sync error',
    };
  }
}

/**
 * Sync a check-in record to Google Sheets
 */
export async function syncCheckinToSheets(record: {
  teacher_name: string;
  date: string;
  check_in_time: string;
  shift_name: string;
  shift_type: string;
  late_minutes: number;
  note?: string;
}): Promise<SyncResponse> {
  return syncToSheets({
    action: 'checkin',
    data: record,
  });
}

/**
 * Sync a check-out record to Google Sheets
 */
export async function syncCheckoutToSheets(record: {
  teacher_name: string;
  date: string;
  check_out_time: string;
  shift_name: string;
  shift_type: string;
  overtime_minutes: number;
  overtime_amount: number;
  note?: string;
}): Promise<SyncResponse> {
  return syncToSheets({
    action: 'checkout',
    data: record,
  });
}

/**
 * Fetch data from Google Sheets (Sheets → Web direction)
 * Used for manual import by admin
 */
export async function fetchFromSheets(params: {
  action: string;
  month?: string;
  year?: string;
}): Promise<SyncResponse> {
  const scriptUrl = process.env.GOOGLE_APPS_SCRIPT_URL;
  
  if (!scriptUrl) {
    return { success: false, message: 'Sync URL not configured' };
  }

  try {
    const url = new URL(scriptUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });

    const response = await fetch(url.toString());
    if (!response.ok) {
      throw new Error(`Fetch failed: ${response.status}`);
    }

    const result = await response.json();
    return { success: true, data: result };
  } catch (error) {
    console.error('Google Sheets fetch error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown fetch error',
    };
  }
}
