# TotemTV Video Automation — מדריך התקנה

## סקירה כללית

אוטומציה לעריכת סרטוני טיפוס:
1. סרטון חדש ב-Drive → מייל עם לינק לטופס
2. מילוי פרטים (מטפס, מסלול, דירוג)
3. GitHub Actions מעבד את הסרטון (FFmpeg + overlay + טקסט)
4. סרטון ערוך מועלה לתקיית "totemtv"

**עלות: חינם לחלוטין** (GitHub Actions free tier = 2,000 דקות/חודש)

---

## שלב 1: הגדרת Google Drive

1. פתח את תקיית **"totemtv unedited"** ב-Google Drive
2. העתק את ה-Folder ID מה-URL:
   ```
   https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXXX
                                          ^^^^^^^^^^^^^^^^^ = Folder ID
   ```
3. חזור על זה עבור תקיית **"totemtv"**
4. שמור את שני ה-IDs — תצטרך אותם בשלבים הבאים

---

## שלב 2: יצירת Service Account ל-Google Drive

1. לך ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש: `totemtv-automation`
3. הפעל **Google Drive API** ו-**Google Sheets API**:
   ```
   Console → APIs & Services → Enable APIs → חפש "Drive" / "Sheets" → Enable
   ```
4. צור Service Account:
   ```
   Console → IAM & Admin → Service Accounts → Create
   שם: totemtv-processor
   ```
5. צור מפתח JSON:
   ```
   לחץ על ה-Service Account → Keys → Add Key → JSON
   ```
6. **שמור את ה-JSON שהורדת** — תצטרך אותו בשלב 5
7. שתף את **שתי** התקיות ב-Drive עם ה-Service Account email:
   ```
   totemtv-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```
   - תן הרשאות **Editor** (עורך)

---

## שלב 3: הגדרת Google Form + Sheet

### יצירת Google Sheet
1. צור Google Sheet חדש בשם: **"TotemTV Tracking"**
2. העתק את ה-Sheet ID מה-URL:
   ```
   https://docs.google.com/spreadsheets/d/XXXXXXXXXXXXXXXXX/edit
                                           ^^^^^^^^^^^^^^^^^ = Sheet ID
   ```
3. שתף את ה-Sheet עם ה-Service Account email (Editor)

### יצירת Google Form
1. צור Google Form חדש בשם: **"TotemTV — פרטי סרטון"**
2. הוסף את השדות הבאים (בדיוק בסדר הזה):
   - **מזהה סרטון** (Video File ID) — תשובה קצרה
   - **שם קובץ** (Filename) — תשובה קצרה
   - **שם מטפס** (Climber Name) — תשובה קצרה, **חובה**
   - **שם מסלול** (Route Name) — תשובה קצרה, **חובה**
   - **דירוג** (Grade) — תשובה קצרה, **חובה**

3. מצא את ה-entry IDs לטופס:
   - לחץ על ⋮ → "קבל קישור שמולא מראש"
   - מלא ערכי דוגמה ולחץ "קבל קישור"
   - בדוק את ה-URL — תמצא פרמטרים כמו `entry.123456789=value`
   - רשום את ה-entry IDs עבור **מזהה סרטון** ו-**שם קובץ**

---

## שלב 4: הגדרת GitHub Secrets

ב-GitHub repo (`carmelrr/projects`):

1. לך ל-**Settings → Secrets and variables → Actions**
2. הוסף את ה-Secrets הבאים:

| Secret Name | ערך |
|-------------|------|
| `GOOGLE_CREDENTIALS` | תוכן ה-JSON של ה-Service Account (כל הקובץ) |
| `UNEDITED_FOLDER_ID` | ה-Folder ID של "totemtv unedited" |
| `OUTPUT_FOLDER_ID` | ה-Folder ID של "totemtv" |
| `SHEET_ID` | ה-Sheet ID של "TotemTV Tracking" |

---

## שלב 5: יצירת GitHub Personal Access Token

GitHub Actions צריך PAT כדי ש-Apps Script יוכל להפעיל workflows:

1. לך ל-GitHub → **Settings → Developer settings → Personal access tokens → Fine-grained tokens**
2. צור token חדש:
   - **שם:** `totemtv-automation`
   - **Repository access:** Only select repositories → `carmelrr/projects`
   - **Permissions:**
     - **Actions:** Read and write
   - **Expiration:** 1 year (או custom)
3. העתק את ה-token — תצטרך אותו ב-Apps Script

---

## שלב 6: הגדרת Google Apps Script

1. פתח את ה-Google Sheet **"TotemTV Tracking"**
2. לך ל-**Extensions → Apps Script**
3. מחק את הקוד הקיים
4. העתק את **כל** התוכן מ-`automation/apps-script/Code.gs`
5. עדכן את הקונפיגורציה:
   ```javascript
   const CONFIG = {
     UNEDITED_FOLDER_ID: 'YOUR_FOLDER_ID_HERE',
     OUTPUT_FOLDER_ID:   'YOUR_FOLDER_ID_HERE',
     FORM_URL: 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform',
     GITHUB_TOKEN: 'github_pat_YOUR_TOKEN_HERE',
     GITHUB_OWNER: 'carmelrr',
     GITHUB_REPO:  'projects',
     GITHUB_WORKFLOW: 'process-video.yml',
     NOTIFICATION_EMAIL: 'YOUR_EMAIL@gmail.com',
   };
   ```
6. עדכן את ה-entry IDs בפונקציה `buildFormUrl_()`:
   ```javascript
   const params = new URLSearchParams({
     'entry.YOUR_FILE_ID_ENTRY': fileId,
     'entry.YOUR_FILENAME_ENTRY': fileName,
   });
   ```

7. הגדר manifest:
   - ⚙️ Project Settings → סמן "Show 'appsscript.json' manifest file"
   - העתק את התוכן מ-`automation/apps-script/appsscript.json`

8. הרץ `setupTriggers()`:
   - בחר הפונקציה → ▶ Run → אשר הרשאות

9. הגדר trigger לטופס:
   - ⏰ Triggers → Add Trigger
   - Function: `onFormSubmit`
   - Event source: From form
   - Event type: On form submit

---

## שלב 7: Push לגיטהאב

ודא שהקבצים הבאים נמצאים ב-repo:
```
.github/
├── workflows/
│   └── process-video.yml    # GitHub Actions workflow
└── scripts/
    └── process_video.py     # סקריפט עיבוד הסרטון
```

```bash
git add .github/
git commit -m "Add video processing automation"
git push
```

---

## שלב 8: בדיקה

1. **העלה סרטון** לתקיית "totemtv unedited" ב-Google Drive
2. **המתן עד 5 דקות** — תקבל מייל עם לינק לטופס
3. **מלא את הטופס** — שם מטפס, שם מסלול, דירוג
4. **בדוק ב-GitHub:** Actions tab → תראה workflow רץ
5. **בדוק ב-Drive:** תקיית "totemtv" → הסרטון הערוך מופיע
6. **בדוק ב-Sheet:** סטטוס משתנה ל-"done"

### אם משהו נכשל
- **Apps Script logs:** Extensions → Apps Script → Executions
- **GitHub Actions logs:** Actions tab → לחץ על ה-workflow run
- **Google Sheet:** עמודת Error תראה את הבעיה
- **Retry:** הרץ `retryFailed()` ב-Apps Script

---

## כיוונון טקסט

אם הטקסט לא ממוקם נכון, ערוך את הקבועים ב-`.github/scripts/process_video.py`:

```python
BANNER_HEIGHT_RATIO = 0.10    # גובה הבאנר (אחוז מגובה הסרטון)
TEXT_Y_OFFSET_RATIO = 0.04    # מיקום טקסט מתחילת הבאנר
FONT_SIZE_RATIO = 0.035       # גודל פונט
MARGIN_X_RATIO = 0.05         # שוליים צדדיים
```

---

## מבנה קבצים

```
.github/
├── workflows/
│   └── process-video.yml        # GitHub Actions workflow
└── scripts/
    └── process_video.py         # Python — עיבוד סרטון (FFmpeg)

automation/
├── SETUP.md                     # מדריך התקנה (הקובץ הזה)
└── apps-script/
    ├── Code.gs                  # Apps Script — folder watcher + GitHub trigger
    └── appsscript.json          # Apps Script manifest
```

---

## עלויות

| שירות | עלות |
|--------|-------|
| Google Apps Script | חינם |
| Google Form / Sheet | חינם |
| GitHub Actions | חינם (2,000 דק'/חודש) |
| Google Drive API | חינם |
| **סה"כ** | **חינם** ✓ |
