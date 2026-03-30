// ============================================================
// TotemTV Automation — Google Apps Script
// ============================================================
// This script watches the "totemtv unedited" Drive folder for
// new videos, emails you a Google Form link to fill in details,
// and triggers a Cloud Run service to process the video.
// ============================================================

// ── CONFIGURATION ──────────────────────────────────────────
const CONFIG = {
  // Google Drive folder IDs (get from the folder URL)
  UNEDITED_FOLDER_ID: 'YOUR_UNEDITED_FOLDER_ID',   // "totemtv unedited"
  OUTPUT_FOLDER_ID:   'YOUR_OUTPUT_FOLDER_ID',      // "totemtv"

  // Google Form URL (the edit URL, NOT the published URL)
  FORM_URL: 'YOUR_GOOGLE_FORM_URL',

  // Cloud Run service URL
  CLOUD_RUN_URL: 'YOUR_CLOUD_RUN_URL',

  // Your email address for notifications
  NOTIFICATION_EMAIL: 'YOUR_EMAIL@gmail.com',

  // Sheet tab name for tracking
  SHEET_NAME: 'Tracking',

  // Video file extensions to watch
  VIDEO_EXTENSIONS: ['mp4', 'webm', 'mov', 'avi', 'mkv', '3gp'],
};

// ── SHEET COLUMNS (0-indexed) ──────────────────────────────
const COL = {
  FILE_ID:    0,  // A
  FILENAME:   1,  // B
  STATUS:     2,  // C
  CLIMBER:    3,  // D
  ROUTE:      4,  // E
  GRADE:      5,  // F
  TIMESTAMP:  6,  // G
  OUTPUT_ID:  7,  // H
  ERROR:      8,  // I
};

// Status values
const STATUS = {
  NEW:        'new',
  PENDING:    'pending',      // email sent, waiting for form
  PROCESSING: 'processing',   // Cloud Run is working
  DONE:       'done',
  ERROR:      'error',
};

// ============================================================
// FOLDER WATCHER — runs every 5 minutes via time trigger
// ============================================================
function checkForNewVideos() {
  const sheet = getOrCreateSheet_();
  const folder = DriveApp.getFolderById(CONFIG.UNEDITED_FOLDER_ID);
  const existingIds = getExistingFileIds_(sheet);

  const files = folder.getFiles();
  let newCount = 0;

  while (files.hasNext()) {
    const file = files.next();
    const fileName = file.getName();
    const fileId = file.getId();

    // Skip non-video files and the background image
    if (!isVideoFile_(fileName)) continue;
    if (fileName.toLowerCase().includes('video_background')) continue;

    // Skip already tracked files
    if (existingIds.has(fileId)) continue;

    // Add new row to sheet
    const now = new Date();
    sheet.appendRow([
      fileId,
      fileName,
      STATUS.NEW,
      '', '', '', // climber, route, grade (empty)
      now.toISOString(),
      '', '',     // output ID, error
    ]);

    // Build pre-filled form URL
    const formUrl = buildFormUrl_(fileId, fileName);

    // Send email notification
    sendNotificationEmail_(fileName, fileId, formUrl);

    // Update status to pending
    updateStatus_(sheet, fileId, STATUS.PENDING);

    newCount++;
    Logger.log('New video found: ' + fileName + ' (' + fileId + ')');
  }

  if (newCount > 0) {
    Logger.log('Found ' + newCount + ' new video(s).');
  }
}

// ============================================================
// FORM SUBMIT HANDLER — triggered when the Google Form is submitted
// ============================================================
function onFormSubmit(e) {
  const responses = e.response.getItemResponses();

  // Parse form responses
  // Form fields order: Video File ID, Climber Name, Route Name, Grade
  let fileId = '';
  let climber = '';
  let route = '';
  let grade = '';

  for (const resp of responses) {
    const title = resp.getItem().getTitle().trim();
    const value = resp.getResponse().trim();

    if (title === 'Video File ID' || title === 'מזהה סרטון') {
      fileId = value;
    } else if (title === 'Climber Name' || title === 'שם מטפס') {
      climber = value;
    } else if (title === 'Route Name' || title === 'שם מסלול') {
      route = value;
    } else if (title === 'Grade' || title === 'דירוג') {
      grade = value;
    }
  }

  if (!fileId) {
    Logger.log('ERROR: No file ID in form submission');
    return;
  }

  const sheet = getOrCreateSheet_();

  // Update sheet with form data
  const row = findRowByFileId_(sheet, fileId);
  if (row === -1) {
    Logger.log('ERROR: File ID not found in sheet: ' + fileId);
    return;
  }

  sheet.getRange(row, COL.CLIMBER + 1).setValue(climber);
  sheet.getRange(row, COL.ROUTE + 1).setValue(route);
  sheet.getRange(row, COL.GRADE + 1).setValue(grade);
  updateStatus_(sheet, fileId, STATUS.PROCESSING);

  // Trigger Cloud Run processing
  triggerCloudRun_(fileId, climber, route, grade);
}

// ============================================================
// CLOUD RUN CALLBACK — called by Cloud Run when processing is done
// ============================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheet = getOrCreateSheet_();

    if (data.status === 'done') {
      const row = findRowByFileId_(sheet, data.fileId);
      if (row !== -1) {
        sheet.getRange(row, COL.OUTPUT_ID + 1).setValue(data.outputFileId || '');
        updateStatus_(sheet, data.fileId, STATUS.DONE);
      }
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    if (data.status === 'error') {
      const row = findRowByFileId_(sheet, data.fileId);
      if (row !== -1) {
        sheet.getRange(row, COL.ERROR + 1).setValue(data.error || 'Unknown error');
        updateStatus_(sheet, data.fileId, STATUS.ERROR);
      }
      // Send error email
      MailApp.sendEmail(
        CONFIG.NOTIFICATION_EMAIL,
        'TotemTV Error: ' + data.fileId,
        'Error processing video: ' + (data.error || 'Unknown error')
      );
      return ContentService.createTextOutput(JSON.stringify({ success: true }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    return ContentService.createTextOutput(JSON.stringify({ error: 'Unknown status' }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    Logger.log('doPost error: ' + err.message);
    return ContentService.createTextOutput(JSON.stringify({ error: err.message }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// Allow GET for health check
function doGet() {
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================
// HELPER FUNCTIONS
// ============================================================

function getOrCreateSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(CONFIG.SHEET_NAME);

  if (!sheet) {
    sheet = ss.insertSheet(CONFIG.SHEET_NAME);
    sheet.appendRow([
      'File ID', 'Filename', 'Status', 'Climber', 'Route', 'Grade',
      'Timestamp', 'Output File ID', 'Error'
    ]);
    // Freeze header row
    sheet.setFrozenRows(1);
    // Bold header
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  return sheet;
}

function getExistingFileIds_(sheet) {
  const ids = new Set();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) { // skip header
    if (data[i][COL.FILE_ID]) {
      ids.add(data[i][COL.FILE_ID]);
    }
  }
  return ids;
}

function isVideoFile_(name) {
  const ext = name.split('.').pop().toLowerCase();
  return CONFIG.VIDEO_EXTENSIONS.includes(ext);
}

function findRowByFileId_(sheet, fileId) {
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.FILE_ID] === fileId) {
      return i + 1; // 1-indexed for sheet
    }
  }
  return -1;
}

function updateStatus_(sheet, fileId, status) {
  const row = findRowByFileId_(sheet, fileId);
  if (row !== -1) {
    sheet.getRange(row, COL.STATUS + 1).setValue(status);
  }
}

function buildFormUrl_(fileId, fileName) {
  // Pre-fill the form with file ID and filename
  // You need to replace these entry IDs with your actual form field entry IDs
  // To find them: open the form, click "Get pre-filled link", inspect the URL
  const baseUrl = CONFIG.FORM_URL;

  // These entry IDs will be replaced after creating the form
  // Format: entry.XXXXXXXXX=value
  const params = new URLSearchParams({
    'entry.FILE_ID_FIELD': fileId,        // Replace with actual entry ID
    'entry.FILENAME_FIELD': fileName,     // Replace with actual entry ID
  });

  return baseUrl + '?' + params.toString();
}

function sendNotificationEmail_(fileName, fileId, formUrl) {
  const subject = '🎬 TotemTV: סרטון חדש — ' + fileName;
  const body = [
    'סרטון חדש נמצא בתקיית "totemtv unedited":',
    '',
    '📹 שם קובץ: ' + fileName,
    '🆔 File ID: ' + fileId,
    '',
    '👉 מלא את הפרטים כדי לערוך את הסרטון:',
    formUrl,
    '',
    'לאחר מילוי הטופס, הסרטון יעובד אוטומטית ויועלה לתקיית "totemtv".',
  ].join('\n');

  MailApp.sendEmail(CONFIG.NOTIFICATION_EMAIL, subject, body);
}

function triggerCloudRun_(fileId, climber, route, grade) {
  const payload = {
    fileId: fileId,
    climber: climber,
    route: route,
    grade: grade,
    uneditedFolderId: CONFIG.UNEDITED_FOLDER_ID,
    outputFolderId: CONFIG.OUTPUT_FOLDER_ID,
    callbackUrl: ScriptApp.getService().getUrl(), // Web app URL for callback
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
    // If Cloud Run requires authentication, add:
    // headers: { 'Authorization': 'Bearer ' + ScriptApp.getIdentityToken() }
  };

  try {
    const response = UrlFetchApp.fetch(CONFIG.CLOUD_RUN_URL, options);
    Logger.log('Cloud Run response: ' + response.getContentText());
  } catch (err) {
    Logger.log('Cloud Run trigger error: ' + err.message);
    const sheet = getOrCreateSheet_();
    const row = findRowByFileId_(sheet, fileId);
    if (row !== -1) {
      sheet.getRange(row, COL.ERROR + 1).setValue('Trigger error: ' + err.message);
      updateStatus_(sheet, fileId, STATUS.ERROR);
    }
  }
}

// ============================================================
// SETUP — run once to create triggers
// ============================================================
function setupTriggers() {
  // Remove existing triggers
  const triggers = ScriptApp.getProjectTriggers();
  for (const trigger of triggers) {
    ScriptApp.deleteTrigger(trigger);
  }

  // Create time-based trigger for folder watcher (every 5 minutes)
  ScriptApp.newTrigger('checkForNewVideos')
    .timeBased()
    .everyMinutes(5)
    .create();

  // Create form submit trigger
  // NOTE: This needs to be set up after linking the form to the script
  // Go to the form → Script Editor → Triggers → Add trigger → onFormSubmit → From form → On form submit
  Logger.log('Time trigger created. Set up form submit trigger manually in the Form script editor.');
}

// ============================================================
// MANUAL REPROCESS — retry failed videos
// ============================================================
function retryFailed() {
  const sheet = getOrCreateSheet_();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.STATUS] === STATUS.ERROR) {
      const fileId = data[i][COL.FILE_ID];
      const climber = data[i][COL.CLIMBER];
      const route = data[i][COL.ROUTE];
      const grade = data[i][COL.GRADE];

      if (climber && route && grade) {
        updateStatus_(sheet, fileId, STATUS.PROCESSING);
        sheet.getRange(i + 1, COL.ERROR + 1).setValue('');
        triggerCloudRun_(fileId, climber, route, grade);
        Logger.log('Retrying: ' + data[i][COL.FILENAME]);
      }
    }
  }
}
