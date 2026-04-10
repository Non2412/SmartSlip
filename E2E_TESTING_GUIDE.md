# 🧪 SmartSlip Google Drive Integration - E2E Testing Guide

## 📋 Pre-Testing Verification

### Step 0: Configuration Check ✅
- [ ] GOOGLE_CLIENT_SECRET filled in `.env.local` (not placeholder)
- [ ] NEXTAUTH_SECRET configured
- [ ] GOOGLE_CLIENT_ID correct (46467631136-...)
- [ ] Backend API accessible
- [ ] Frontend port 3000 available

---

## 🧪 Testing Flow

### Step 1: Start Frontend Server
```bash
cd C:\Users\Notebook Lenovo\Documents\Nextjs_proj\Project_end
npm run dev
```

Expected: Server starts on `http://localhost:3000`

### Step 2: Test OAuth Authorization
1. Open browser → `http://localhost:3000/dashboard`
2. Sidebar → Look for "Cloud Storage" section
3. Click **"Authorize Google Drive"** button
4. Google OAuth dialog should appear
5. Select your Google account
6. Click "Continue"
7. Review permissions (email, profile, drive.file)
8. Click "Allow"
9. Button should change to **"✅ Google Drive Connected"**

**Expected Result:** ✅ shows with green checkmark

### Step 3: Prepare Receipt Image
- Have a receipt/invoice image ready (JPG or PNG)
- Image should be clear and readable
- Max size: 20MB

### Step 4: Upload & Extract Receipt
1. In Dashboard, find upload section (e.g., "เพิ่มใบเสร็จ")
2. Select your receipt image
3. Click "Upload" or "Extract"
4. Wait for extraction (should take 3-5 seconds)

**Expected Result:** Receipt data extracted successfully

### Step 5: Verify Dual Upload
Check that image was uploaded to **TWO places:**

#### Location 1: Cloud Storage (Existing)
- Response includes `imageURL` (Google Cloud Storage link)

#### Location 2: Google Drive (NEW!)
- Response includes `driveFileId` 
- Should be UUID like: `1a2b3c4d5e6f...`

### Step 6: Manual Verification in Google Drive
1. Open `https://drive.google.com` in browser
2. Look for `SmartSlip` folder
3. Navigate: `SmartSlip → [Your User ID] → Receipts → [Year] → [Month]`
4. Receipt image should be visible!

**Expected Path Example:**
```
SmartSlip
└── user-6789abcd
    └── Receipts
        └── 2026
            └── 04-April 2026
                └── receipt-1500.00-2026-04-10T15-30-45-123Z.jpg ✅
```

### Step 7: Database Verification
Check MongoDB receipt record:

**Expected Fields:**
```javascript
{
  _id: ObjectId,
  userId: "user-6789abcd",
  imageURL: "https://storage.googleapis.com/...",
  driveFileId: "1a2b3c4d5e6f...",
  amount: 1500.00,
  status: "approved",
  createdAt: ISODate,
  // ... other fields
}
```

---

## 🔍 Troubleshooting

### Issue 1: "Authorize Google Drive" button doesn't appear
**Solution:**
- [ ] Refresh page (Ctrl+F5)
- [ ] Check console for errors (F12 → Console tab)
- [ ] Verify auth.ts has GoogleDriveAuth import

### Issue 2: OAuth dialog doesn't appear
**Solution:**
```
Possible causes:
- GOOGLE_CLIENT_ID invalid
- GOOGLE_CLIENT_SECRET wrong
- Redirect URI not whitelisted in Google Cloud

Check: Have you saved .env.local?
       Did you restart npm run dev?
```

### Issue 3: Upload succeeds but driveFileId is null
**Solution:**
```
Means: Frontend sent token, but Backend didn't receive it
- Check: receiptApi.extract() is using FormData (not JSON)
- Check: Backend has googleAccessToken in formData
- Check: uploadToUserGoogleDrive() is being called

Backend logs should show:
  "📤 Uploading to user's Google Drive: receipt-..."
```

### Issue 4: Image in Cloud Storage but NOT in Google Drive
**Solution:**
```
Possible causes:
- Token expired
- Token missing Drive scope
- User hasn't authorized Drive yet
- Backend googleDrive.ts not imported

Check: Button shows "Google Drive Connected"?
       Try re-authorizing (sign out and sign in again)
```

### Issue 5: MongoDB has driveFileId but folder structure wrong
**Solution:**
```
Backend creates: SmartSlip → [userId] → Receipts → [Year] → [Month]

Check your Google Drive folder structure matches above
If wrong format: Check getUserMonthFolder() in googleDrive.ts
```

---

## ✅ Success Criteria

All of these should be TRUE:

- [ ] OAuth authorization works (✅ button shows)
- [ ] Receipt image uploads to Cloud Storage
- [ ] Receipt image **also** uploads to Google Drive
- [ ] Receipt driveFileId saved in MongoDB
- [ ] Folder structure exists: `SmartSlip/[UserID]/Receipts/[Year]/[Month]`
- [ ] Image file visible when browsing Google Drive web UI
- [ ] Can download receipt from Drive and it opens correctly

---

## 📊 Testing Results Summary

After completing all steps, you should have:

```
✅ Frontend OAuth Working
✅ Google Drive Authorization
✅ Dual Upload (Cloud Storage + Drive)
✅ Folder Structure Auto-Created
✅ MongoDB Record Updated
✅ User Can Access via Drive UI

🎯 Full Integration Complete!
```

---

## 🚀 Next Steps (After Successful Testing)

1. **Deploy to Production** → Update `.env` on Vercel
2. **Add More Features:**
   - Let user choose upload destination (Cloud Storage only vs Drive)
   - Add Drive file deletion (when receipt deleted)
   - Share Drive folder with team members
3. **Monitor:**
   - Check API logs for errors
   - Monitor Google Drive quota usage
   - Track upload success rate

---

**Ready?** Let me know:
- ✅ Google Client Secret obtained?
- ✅ `.env.local` updated?
- ✅ Ready to run `npm run dev`?

I'll help troubleshoot any issues! 🔧
