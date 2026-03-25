# Student Attendance Management System - Setup Guide

## Overview
A complete Progressive Web App (PWA) for managing student attendance with offline support and Google Sheets synchronization.

## Features
- ✅ Works offline with local storage (IndexedDB)
- ✅ Auto-syncs with Google Sheets when online
- ✅ Installable on Android (Add to Home Screen)
- ✅ Student management (Add/Edit/Delete/Search)
- ✅ Attendance tracking with toggle switches
- ✅ Reports with filters and export options
- ✅ CSV and JSON backup/restore

---

## Prerequisites

1. **Google Account** - Required for Google Sheets and Apps Script
2. **Web Browser** - Chrome, Firefox, Safari, or Edge
3. **Android Device** (optional) - For mobile app installation

---

## Step 1: Set Up Google Sheets

### 1.1 Create the Spreadsheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Student Attendance System"

### 1.2 Create the Students Sheet
1. Rename "Sheet1" to "Students"
2. Add these headers in row 1:
   ```
   A1: ID
   B1: StudentID
   C1: Name
   D1: Course
   E1: Batch
   F1: Contact
   ```

### 1.3 Create the Attendance Sheet
1. Click the **+** button to add a new sheet
2. Name it "Attendance"
3. Add these headers in row 1:
   ```
   A1: Date
   B1: StudentID
   C1: Name
   D1: Course
   E1: Batch
   F1: Status
   ```

### 1.4 Get Your Sheet ID
1. Look at the URL in your browser
2. Copy the long string between `/d/` and `/edit`
   ```
   Example: https://docs.google.com/spreadsheets/d/SHEET_ID/edit
   ```
3. Save this ID - you'll need it for the Apps Script

---

## Step 2: Set Up Google Apps Script

### 2.1 Open Apps Script
1. In your Google Sheet, click **Extensions** → **Apps Script**
2. A new tab will open with the Apps Script editor

### 2.2 Add the Code
1. Delete any existing code in the editor
2. Copy the entire code from `GOOGLE_APPS_SCRIPT.gs` file
3. Paste it into the Apps Script editor

### 2.3 Update the Sheet ID
1. In the code, find this line:
   ```javascript
   const SHEET_ID = 'YOUR_SHEET_ID_HERE';
   ```
2. Replace `YOUR_SHEET_ID_HERE` with your actual Sheet ID from Step 1.4

### 2.4 Save the Project
1. Click **File** → **Save**
2. Name the project: "Attendance System Backend"

---

## Step 3: Deploy as Web App

### 3.1 Create Deployment
1. Click **Deploy** → **New deployment**
2. Click the gear icon (⚙️) next to "Type"
3. Select **Web app**

### 3.2 Configure Deployment
1. **Description**: Enter "Attendance API v1"
2. **Execute as**: Select **Me**
3. **Who has access**: Select **Anyone**
4. Click **Deploy**

### 3.3 Authorize Permissions
1. Click **Authorize access**
2. Select your Google account
3. Click **Advanced**
4. Click **Go to Attendance System Backend (unsafe)**
5. Click **Allow**

### 3.4 Copy the Web App URL
1. After deployment, you'll see a **Web app URL**
2. Copy this URL - it looks like:
   ```
   https://script.google.com/macros/s/AKfycb.../exec
   ```
3. Save this URL - you'll need it for the frontend

---

## Step 4: Deploy the Frontend

### Option A: Deploy to Netlify (Recommended - Free)

1. **Create a Netlify account**
   - Go to [Netlify](https://www.netlify.com/)
   - Sign up with your GitHub account or email

2. **Upload your files**
   - Drag and drop the entire `attendance-system` folder to Netlify
   - Or use "Deploy manually" option

3. **Get your site URL**
   - Netlify will give you a URL like `https://your-site.netlify.app`
   - Save this URL

### Option B: Deploy to GitHub Pages (Free)

1. **Create a GitHub repository**
   - Go to [GitHub](https://github.com)
   - Create a new repository named `attendance-system`

2. **Upload files**
   - Upload all files from the `attendance-system` folder

3. **Enable GitHub Pages**
   - Go to repository **Settings** → **Pages**
   - Select source: **Deploy from a branch**
   - Select branch: **main** / **root**
   - Click **Save**

4. **Get your site URL**
   - Your site will be at `https://yourusername.github.io/attendance-system`

### Option C: Deploy to Vercel (Free)

1. **Create a Vercel account**
   - Go to [Vercel](https://vercel.com)
   - Sign up with GitHub

2. **Import your project**
   - Connect your GitHub repository
   - Or drag and drop the folder

3. **Deploy**
   - Vercel will automatically deploy your site

---

## Step 5: Update Frontend Configuration

### 5.1 Update the Apps Script URL
1. Open `js/api.js` in your deployed site (or before deploying)
2. Find this line:
   ```javascript
   const APPS_SCRIPT_URL = 'YOUR_APPS_SCRIPT_URL_HERE';
   ```
3. Replace with your actual Web App URL from Step 3.4

### 5.2 Redeploy (if needed)
- If you made changes after initial deployment, redeploy to update

---

## Step 6: Install on Android

### 6.1 Using Chrome
1. Open your deployed site URL in Chrome on Android
2. Tap the **menu (⋮)** → **Add to Home screen**
3. Tap **Add**
4. The app icon will appear on your home screen

### 6.2 Using Samsung Internet
1. Open your site in Samsung Internet
2. Tap the **menu** → **Add page to** → **Home screen**

### 6.3 Using Firefox
1. Open your site in Firefox
2. Tap the **menu (⋮)** → **Install**

---

## Step 7: Test the Application

### 7.1 Test Online Mode
1. Open the app with internet connection
2. Add a test student
3. Take attendance for today
4. Check your Google Sheet - data should appear

### 7.2 Test Offline Mode
1. Turn on Airplane mode (or disconnect internet)
2. Add another student
3. Take attendance
4. Data should save locally
5. Turn internet back on
6. Data should sync automatically

### 7.3 Check Sync Status
- Look at the top-right corner of the app
- **Green check**: All synced
- **Yellow spinner**: Syncing in progress
- **Red slash**: Offline

---

## Troubleshooting

### Issue: Data not syncing to Google Sheets

**Solution 1: Check Apps Script URL**
- Make sure the URL in `api.js` is correct
- Redeploy if you made changes

**Solution 2: Check Permissions**
- Re-deploy the Apps Script with "Anyone" access
- Make sure you authorized all permissions

**Solution 3: Check Sheet Structure**
- Verify sheet names are exactly "Students" and "Attendance"
- Verify column headers match exactly

### Issue: App not working offline

**Solution 1: Check Service Worker**
- Open browser DevTools (F12)
- Go to Application → Service Workers
- Check if service worker is registered

**Solution 2: Clear Cache**
- In DevTools, go to Application → Clear storage
- Click "Clear site data"
- Reload the page

### Issue: Cannot install on Android

**Solution 1: Check HTTPS**
- PWA requires HTTPS (except localhost)
- Make sure your deployment uses HTTPS

**Solution 2: Check Manifest**
- In DevTools, go to Application → Manifest
- Check if manifest is detected
- Verify icons are loading

### Issue: App shows blank screen

**Solution 1: Check Console Errors**
- Open DevTools (F12) → Console
- Look for JavaScript errors

**Solution 2: Verify File Paths**
- Make sure all file paths in HTML are correct
- Check that JS and CSS files are loading

---

## File Structure

```
attendance-system/
├── index.html              # Dashboard page
├── students.html           # Student management
├── attendance.html         # Take attendance
├── reports.html            # View reports
├── manifest.json           # PWA manifest
├── service-worker.js       # Offline caching
├── GOOGLE_APPS_SCRIPT.gs   # Backend code (copy to Apps Script)
├── SETUP.md               # This file
├── css/
│   └── style.css          # All styles
├── js/
│   ├── db.js              # IndexedDB operations
│   ├── api.js             # Google Sheets API
│   ├── ui.js              # UI utilities
│   └── app.js             # Main application
└── icons/
    ├── icon-72x72.png
    ├── icon-96x96.png
    ├── icon-128x128.png
    ├── icon-144x144.png
    ├── icon-152x152.png
    ├── icon-192x192.png
    ├── icon-384x384.png
    └── icon-512x512.png
```

---

## Google Sheets Structure

### Students Sheet
| ID | StudentID | Name | Course | Batch | Contact |
|----|-----------|------|--------|-------|---------|
| STU_123 | ROLL001 | John Doe | Computer Science | 2024-A | +1234567890 |

### Attendance Sheet
| Date | StudentID | Name | Course | Batch | Status |
|------|-----------|------|--------|-------|--------|
| 2024-01-15 | STU_123 | John Doe | Computer Science | 2024-A | Present |

---

## API Endpoints (Google Apps Script)

The Apps Script handles these actions:

| Action | Description |
|--------|-------------|
| `addStudent` | Add a new student |
| `updateStudent` | Update existing student |
| `deleteStudent` | Delete a student |
| `getStudents` | Get all students |
| `saveAttendance` | Save attendance for a date |
| `updateAttendance` | Update single attendance |
| `deleteAttendance` | Delete attendance for a date |
| `getAttendance` | Get all attendance records |
| `getAttendanceByDate` | Get attendance for specific date |
| `getAttendanceByRange` | Get attendance for date range |
| `syncData` | Sync bulk data |
| `bulkSync` | Sync pending operations |

---

## Security Notes

1. **Apps Script Permissions**: The script runs with your Google account permissions
2. **Data Access**: Anyone with the Web App URL can read/write data
3. **Sheet Access**: The sheet should be private unless you want public access
4. **Backup**: Regularly backup your Google Sheet data

---

## Updates & Maintenance

### Updating the Apps Script
1. Open the Apps Script editor
2. Make your changes
3. Click **Deploy** → **Manage deployments**
4. Click **Edit** (pencil icon)
5. Select **New version**
6. Click **Deploy**

### Updating the Frontend
1. Make changes to your files
2. Redeploy to your hosting platform
3. Users will get updates automatically

---

## Support

If you encounter issues:
1. Check the browser console for errors
2. Verify all setup steps were followed
3. Check the troubleshooting section above
4. Ensure Google Sheets and Apps Script are accessible

---

## License

This project is provided as-is for educational purposes.

---

**Created**: 2024
**Version**: 1.0
