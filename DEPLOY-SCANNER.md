# פריסת סורק האוטומציות כאתר נפרד
## scanner.clix-automations.com → Firebase Hosting

---

## שלב 1 — התקנת Firebase CLI (פעם אחת)

```powershell
npm install -g firebase-tools
```

---

## שלב 2 — התחברות לגוגל

```powershell
firebase login
```
יפתח דפדפן לאימות עם חשבון Google שלך.

---

## שלב 3 — יצירת פרויקט Firebase

1. עבור אל https://console.firebase.google.com
2. לחץ **"Add project"** → בחר שם (למשל: `clix-scanner`)
3. **כבה Google Analytics** (לא נדרש)
4. המתן ליצירה → העתק את ה-**Project ID** (למשל: `clix-scanner-abc12`)

---

## שלב 4 — יצירת Hosting Site עם custom domain

בתוך הפרויקט שיצרת:
1. בתפריט שמאל → **Hosting**
2. לחץ **"Add another site"**
3. שם: `clix-scanner` (יקבל URL: `clix-scanner.web.app`)

---

## שלב 5 — עדכון .firebaserc

פתח את `.firebaserc` והחלף:

```json
{
  "projects": {
    "default": "clix-scanner-abc12"
  },
  "targets": {
    "clix-scanner-abc12": {
      "hosting": {
        "scanner": [
          "clix-scanner"
        ]
      }
    }
  }
}
```

- **`clix-scanner-abc12`** = Project ID שלך
- **`clix-scanner`** = שם ה-Hosting Site שיצרת

---

## שלב 6 — פריסה ראשונה

```powershell
firebase target:apply hosting scanner clix-scanner
npm run deploy:scanner
```

האתר יהיה זמין בכתובת: `https://clix-scanner.web.app`

---

## שלב 7 — חיבור הדומיין scanner.clix-automations.com

בפרויקט Firebase → Hosting → לחץ **"Add custom domain"**:

1. הכנס: `scanner.clix-automations.com`
2. Firebase יראה לך **שני רשומות DNS** להוסיף:
   - סוג `A` עם שני כתובות IP
   - או `CNAME` אם יש לך subdomains

3. עבור ל-DNS provider של clix-automations.com (Cloudflare / GoDaddy / וכו')
4. הוסף את הרשומות שהראה Firebase
5. המתן 10-30 דקות לפעילות SSL

---

## פריסת עדכונים (בעתיד)

כל שינוי ב-scanner.html דורש עדכון ידני:

```powershell
# העתק מחדש את scanner.html עם ההחלפות
node update-scanner-site.mjs

# פרוס
npm run deploy:scanner
```

---

## מבנה הקבצים שנוצרו

```
scanner-site/
├── index.html          ← scanner.html מותאם
├── cookie-consent.js
├── favicon.ico / .svg / -32.png / -192.png
└── brand_assets/
    ├── og-scanner.png
    └── icons/          ← כל אייקוני הכלים
```
