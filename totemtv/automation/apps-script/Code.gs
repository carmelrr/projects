// ============================================================
// TotemTV Automation — Google Apps Script
// ============================================================
// Watches "totemtv unedited" Drive folder for new videos,
// emails a Google Form link, and triggers GitHub Actions
// to process the video with FFmpeg.
// ============================================================

// ── CONFIGURATION ──────────────────────────────────────────
const CONFIG = {
  // Google Drive folder IDs (from folder URL)
  UNEDITED_FOLDER_ID: 'YOUR_UNEDITED_FOLDER_ID',   // "totemtv unedited"
  OUTPUT_FOLDER_ID:   'YOUR_OUTPUT_FOLDER_ID',      // "totemtv"

  // Google Form pre-filled URL base
  FORM_URL: 'YOUR_GOOGLE_FORM_URL',

  // GitHub — for triggering Actions workflow
  GITHUB_TOKEN: 'YOUR_GITHUB_PAT',                  // Personal Access Token (fine-grained)
  GITHUB_OWNER: 'carmelrr',
  GITHUB_REPO:  'projects',
  GITHUB_WORKFLOW: 'process-video.yml',

  // Notification email
  NOTIFICATION_EMAIL: 'YOUR_EMAIL@gmail.com',

  // Sheet
  SHEET_NAME: 'Tracking',

  // Video extensions
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

const STATUS = {
  NEW:        'new',
  PENDING:    'pending',
  PROCESSING: 'processing',
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

    // Add new row
    const now = new Date();
    sheet.appendRow([
      fileId, fileName, STATUS.NEW,
      '', '', '',
      now.toISOString(),
      '', '',
    ]);

    // Send email with form link
    const formUrl = buildFormUrl_(fileId, fileName);
    sendNotificationEmail_(fileName, fileId, formUrl);
    updateStatus_(sheet, fileId, STATUS.PENDING);

    newCount++;
    Logger.log('New video: ' + fileName + ' (' + fileId + ')');
  }

  if (newCount > 0) {
    Logger.log('Found ' + newCount + ' new video(s).');
  }
}

// ============================================================
// FORM SUBMIT HANDLER
// ============================================================
function onFormSubmit(e) {
  const responses = e.response.getItemResponses();

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
  const row = findRowByFileId_(sheet, fileId);
  if (row === -1) {
    Logger.log('ERROR: File ID not found in sheet: ' + fileId);
    return;
  }

  const fileName = sheet.getRange(row, COL.FILENAME + 1).getValue();

  // Save form data to sheet
  sheet.getRange(row, COL.CLIMBER + 1).setValue(climber);
  sheet.getRange(row, COL.ROUTE + 1).setValue(route);
  sheet.getRange(row, COL.GRADE + 1).setValue(grade);
  updateStatus_(sheet, fileId, STATUS.PROCESSING);

  // Trigger GitHub Actions
  triggerGitHubActions_(fileId, fileName, climber, route, grade, row);
}

// ============================================================
// GITHUB ACTIONS TRIGGER
// ============================================================
function triggerGitHubActions_(fileId, fileName, climber, route, grade, sheetRow) {
  const url = 'https://api.github.com/repos/'
    + CONFIG.GITHUB_OWNER + '/' + CONFIG.GITHUB_REPO
    + '/actions/workflows/' + CONFIG.GITHUB_WORKFLOW
    + '/dispatches';

  const payload = {
    ref: 'main',
    inputs: {
      file_id:      fileId,
      file_name:    fileName,
      climber_name: climber,
      route_name:   route,
      grade:        grade,
      sheet_row:    String(sheetRow),
    },
  };

  const options = {
    method: 'post',
    contentType: 'application/json',
    headers: {
      'Authorization': 'Bearer ' + CONFIG.GITHUB_TOKEN,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  };

  try {
    const response = UrlFetchApp.fetch(url, options);
    const code = response.getResponseCode();

    if (code === 204) {
      Logger.log('GitHub Actions triggered for: ' + fileId);
    } else {
      const body = response.getContentText();
      Logger.log('GitHub API error (' + code + '): ' + body);

      const sheet = getOrCreateSheet_();
      const row = findRowByFileId_(sheet, fileId);
      if (row !== -1) {
        sheet.getRange(row, COL.ERROR + 1).setValue('GitHub trigger error: ' + code);
        updateStatus_(sheet, fileId, STATUS.ERROR);
      }
    }
  } catch (err) {
    Logger.log('GitHub trigger exception: ' + err.message);
    const sheet = getOrCreateSheet_();
    const row = findRowByFileId_(sheet, fileId);
    if (row !== -1) {
      sheet.getRange(row, COL.ERROR + 1).setValue('Trigger error: ' + err.message);
      updateStatus_(sheet, fileId, STATUS.ERROR);
    }
  }
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
      'Timestamp', 'Output File ID', 'Error',
    ]);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, 9).setFontWeight('bold');
  }

  return sheet;
}

function getExistingFileIds_(sheet) {
  const ids = new Set();
  const data = sheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.FILE_ID]) ids.add(data[i][COL.FILE_ID]);
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
    if (data[i][COL.FILE_ID] === fileId) return i + 1;
  }
  return -1;
}

function updateStatus_(sheet, fileId, status) {
  const row = findRowByFileId_(sheet, fileId);
  if (row !== -1) sheet.getRange(row, COL.STATUS + 1).setValue(status);
}

function buildFormUrl_(fileId, fileName) {
  const baseUrl = CONFIG.FORM_URL;
  // Replace entry IDs with your actual form field entry IDs
  const params = new URLSearchParams({
    'entry.FILE_ID_FIELD': fileId,
    'entry.FILENAME_FIELD': fileName,
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

// ============================================================
// SETUP — run once
// ============================================================
function setupTriggers() {
  ScriptApp.getProjectTriggers().forEach(t => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger('checkForNewVideos')
    .timeBased()
    .everyMinutes(5)
    .create();

  Logger.log('Time trigger created.');
  Logger.log('IMPORTANT: Set up form submit trigger manually:');
  Logger.log('  Triggers → Add → onFormSubmit → From form → On form submit');
}

// ============================================================
// RETRY FAILED
// ============================================================
function retryFailed() {
  const sheet = getOrCreateSheet_();
  const data = sheet.getDataRange().getValues();

  for (let i = 1; i < data.length; i++) {
    if (data[i][COL.STATUS] === STATUS.ERROR) {
      const fileId   = data[i][COL.FILE_ID];
      const fileName = data[i][COL.FILENAME];
      const climber  = data[i][COL.CLIMBER];
      const route    = data[i][COL.ROUTE];
      const grade    = data[i][COL.GRADE];

      if (climber && route && grade) {
        updateStatus_(sheet, fileId, STATUS.PROCESSING);
        sheet.getRange(i + 1, COL.ERROR + 1).setValue('');
        triggerGitHubActions_(fileId, fileName, climber, route, grade, i + 1);
        Logger.log('Retrying: ' + fileName);
      }
    }
  }
}
