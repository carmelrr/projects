# TotemTV Video Automation — מדריך התקנה

## סקירה כללית

אוטומציה לעריכת סרטוני טיפוס:  
1. סרטון חדש ב-Drive → מייל עם לינק לטופס  
2. מילוי פרטים (מטפס, מסלול, דירוג)  
3. עיבוד אוטומטי (overlay + טקסט)  
4. סרטון ערוך מועלה לתקיית "totemtv"  

---

## שלב 1: הגדרת Google Cloud Project

1. לך ל-[Google Cloud Console](https://console.cloud.google.com/)
2. צור פרויקט חדש (או השתמש בקיים): `totemtv-automation`
3. הפעל את ה-APIs הבאים:
   - **Google Drive API**
   - **Cloud Run API**
   - **Cloud Build API** (לבנייה אוטומטית של Docker)
   - **Artifact Registry API**

```bash
gcloud services enable drive.googleapis.com run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

4. צור Service Account:
```bash
gcloud iam service-accounts create totemtv-processor --display-name="TotemTV Video Processor"
```

5. צור מפתח JSON ל-Service Account:
```bash
gcloud iam service-accounts keys create service-account-key.json --iam-account=totemtv-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com
```

6. **שמור את הקובץ `service-account-key.json` במקום בטוח** — תצטרך אותו בשלב 4.

---

## שלב 2: הגדרת Google Drive

1. פתח את תקיית **"totemtv unedited"** ב-Google Drive
2. העתק את ה-Folder ID מה-URL:
   ```
   https://drive.google.com/drive/folders/XXXXXXXXXXXXXXXXX
                                          ^^^^^^^^^^^^^^^^^ = Folder ID
   ```
3. חזור על זה עבור תקיית **"totemtv"**
4. שתף את **שתי** התקיות עם ה-Service Account email:
   ```
   totemtv-processor@YOUR_PROJECT_ID.iam.gserviceaccount.com
   ```
   - תן הרשאות **Editor** (עורך)

---

## שלב 3: הגדרת Google Form + Sheet

### יצירת Google Sheet
1. צור Google Sheet חדש בשם: **"TotemTV Tracking"**
2. העתק את ה-Sheet ID מה-URL

### יצירת Google Form
1. צור Google Form חדש בשם: **"TotemTV — פרטי סרטון"**
2. הוסף את השדות הבאים (בדיוק בסדר הזה):
   - **מזהה סרטון** (Video File ID) — תשובה קצרה
   - **שם קובץ** (Filename) — תשובה קצרה  
   - **שם מטפס** (Climber Name) — תשובה קצרה, **חובה**
   - **שם מסלול** (Route Name) — תשובה קצרה, **חובה**
   - **דירוג** (Grade) — תשובה קצרה, **חובה**

3. צור pre-filled link לטופס:
   - לחץ על ⋮ (שלוש נקודות) → "קבל קישור שמולא מראש"
   - מלא ערכי דוגמה
   - העתק את ה-URL
   - בדוק את ה-URL — תמצא פרמטרים כמו `entry.123456789=value`
   - רשום את ה-entry IDs עבור "מזהה סרטון" ו-"שם קובץ"

4. חבר את התשובות ל-Google Sheet (בטאב "Responses" → לינק ל-Sheet)

### מציאת ה-entry IDs לטופס
פתח את ה-pre-filled URL ותמצא משהו כזה:
```
https://docs.google.com/forms/d/e/FORM_ID/viewform?entry.111111=test1&entry.222222=test2&...
```
- `entry.111111` = מזהה סרטון
- `entry.222222` = שם קובץ

עדכן את הערכים ב-`Code.gs` בפונקציה `buildFormUrl_()`.

---

## שלב 4: הגדרת Google Apps Script

1. פתח את ה-Google Sheet שיצרת
2. לך ל-**Extensions → Apps Script**
3. מחק את הקוד הקיים
4. העתק את **כל** התוכן מ-`automation/apps-script/Code.gs`
5. עדכן את הקונפיגורציה ב-`CONFIG`:
   ```javascript
   const CONFIG = {
     UNEDITED_FOLDER_ID: 'PASTE_YOUR_UNEDITED_FOLDER_ID',
     OUTPUT_FOLDER_ID:   'PASTE_YOUR_OUTPUT_FOLDER_ID',      
     FORM_URL: 'https://docs.google.com/forms/d/e/YOUR_FORM_ID/viewform',
     CLOUD_RUN_URL: 'https://YOUR_CLOUD_RUN_URL/process',
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

7. הגדר את ה-manifest:
   - לחץ על ⚙️ (Project Settings)
   - סמן "Show 'appsscript.json' manifest file"
   - העתק את התוכן מ-`automation/apps-script/appsscript.json`

8. הרץ את `setupTriggers()`:
   - בחר את הפונקציה `setupTriggers` בתפריט
   - לחץ ▶ Run
   - אשר הרשאות כשנשאל

9. הגדר trigger ל-form submit:
   - לך ל-⏰ Triggers (בצד שמאל)
   - לחץ "Add Trigger"
   - Function: `onFormSubmit`
   - Event source: From form
   - Event type: On form submit
   - שמור

---

## שלב 5: Deploy Cloud Run

### אפשרות א' — Deploy עם gcloud CLI

```bash
# התחבר ל-Google Cloud
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# צור Artifact Registry repository
gcloud artifacts repositories create totemtv --repository-format=docker --location=me-west1

# Build and deploy
cd automation/cloud-run

gcloud run deploy totemtv-processor \
  --source . \
  --region me-west1 \
  --memory 2Gi \
  --timeout 600 \
  --set-env-vars "GOOGLE_CREDENTIALS=$(cat ../../service-account-key.json | base64)" \
  --allow-unauthenticated
```

> **הערה:** `me-west1` הוא אזור תל אביב. אפשר לבחור אזור אחר.

### אפשרות ב' — Deploy עם deploy.sh

```bash
cd automation/cloud-run
chmod +x deploy.sh
./deploy.sh YOUR_PROJECT_ID me-west1
```

### לאחר Deploy
1. העתק את ה-URL שקיבלת (למשל: `https://totemtv-processor-xxxxx-xx.a.run.app`)
2. עדכן את `CLOUD_RUN_URL` ב-Apps Script:
   ```javascript
   CLOUD_RUN_URL: 'https://totemtv-processor-xxxxx-xx.a.run.app/process',
   ```

---

## שלב 6: בדיקה

1. **העלה סרטון** לתקיית "totemtv unedited" ב-Google Drive
2. **המתן עד 5 דקות** — תקבל מייל עם לינק לטופס
3. **מלא את הטופס** — שם מטפס, שם מסלול, דירוג
4. **המתן לעיבוד** — תלוי בגודל הסרטון (בד"כ 1-3 דקות)
5. **בדוק את תקיית "totemtv"** — הסרטון הערוך יופיע שם

### בדיקת ב-Google Sheet
- פתח את ה-Sheet
- בטאב "Tracking" תראה את כל הסרטונים והסטטוס שלהם

### אם משהו נכשל
- בדוק את הלוגים ב-Apps Script: Extensions → Apps Script → Executions
- בדוק לוגים ב-Cloud Run: Google Cloud Console → Cloud Run → Logs
- הרץ `retryFailed()` ב-Apps Script כדי לנסות מחדש סרטונים שנכשלו

---

## מבנה קבצים

```
automation/
├── apps-script/
│   ├── Code.gs              # Apps Script — folder watcher + form handler
│   └── appsscript.json      # Apps Script manifest (permissions)
└── cloud-run/
    ├── Dockerfile            # Docker image with Python + FFmpeg
    ├── main.py               # Cloud Run service — video processing
    ├── requirements.txt      # Python dependencies
    └── deploy.sh             # Deployment script
```

---

## כיוונון טקסט (אחרי בדיקה ראשונה)

אם הטקסט לא ממוקם נכון על הבאנר, ערוך את הקבועים ב-`main.py`:

```python
# גובה הבאנר (אחוז מגובה הסרטון)
BANNER_HEIGHT_RATIO = 0.10

# מיקום הטקסט (מרחק מתחילת הבאנר)
TEXT_Y_OFFSET_RATIO = 0.04

# גודל פונט (אחוז מגובה הסרטון)
FONT_SIZE_RATIO = 0.035

# שוליים צדדיים
MARGIN_LEFT_RATIO = 0.05
MARGIN_RIGHT_RATIO = 0.05
```

לאחר שינוי, עשה deploy מחדש:
```bash
cd automation/cloud-run
gcloud run deploy totemtv-processor --source . --region me-west1
```

---

## עלויות

| שירות | עלות |
|--------|-------|
| Google Apps Script | חינם |
| Google Form / Sheet | חינם |
| Google Cloud Run | ~$0.01-0.05 לסרטון |
| Google Drive API | חינם |
| **סה"כ** | **כמעט חינם** |
