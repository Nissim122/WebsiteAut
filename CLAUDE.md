# CLAUDE.md — Frontend Website Rules

## Always Do First
- **Invoke the `frontend-design` skill** before writing any frontend code, every session, no exceptions.

## Reference Images
- If a reference image is provided: match layout, spacing, typography, and color exactly. Swap in placeholder content (images via `https://placehold.co/`, generic copy). Do not improve or add to the design.
- If no reference image: design from scratch with high craft (see guardrails below).
- Screenshot your output, compare against reference, fix mismatches, re-screenshot. Do at least 2 comparison rounds. Stop only when no visible differences remain or user says so.

## Local Server
- **Always serve on localhost** — never screenshot a `file:///` URL.
- Start the dev server: `node serve.mjs` (serves the project root at `http://localhost:3000`)
- `serve.mjs` lives in the project root. Start it in the background before taking any screenshots.
- If the server is already running, do not start a second instance.

## Screenshot Workflow
- Puppeteer is installed at `C:/Users/nateh/AppData/Local/Temp/puppeteer-test/`. Chrome cache is at `C:/Users/nateh/.cache/puppeteer/`.
- **Always screenshot from localhost:** `node screenshot.mjs http://localhost:3000`
- Screenshots are saved automatically to `./temporary screenshots/screenshot-N.png` (auto-incremented, never overwritten).
- Optional label suffix: `node screenshot.mjs http://localhost:3000 label` → saves as `screenshot-N-label.png`
- `screenshot.mjs` lives in the project root. Use it as-is.
- After screenshotting, read the PNG from `temporary screenshots/` with the Read tool — Claude can see and analyze the image directly.
- When comparing, be specific: "heading is 32px but reference shows ~24px", "card gap is 16px but should be 24px"
- Check: spacing/padding, font size/weight/line-height, colors (exact hex), alignment, border-radius, shadows, image sizing

## Output Defaults
- Single `index.html` file, all styles inline, unless user says otherwise
- Tailwind CSS via CDN: `<script src="https://cdn.tailwindcss.com"></script>`
- Placeholder images: `https://placehold.co/WIDTHxHEIGHT`
- Mobile-first responsive

## Brand Assets
- Always check the `brand_assets/` folder before designing. It may contain logos, color guides, style guides, or images.
- If assets exist there, use them. Do not use placeholders where real assets are available.
- If a logo is present, use it. If a color palette is defined, use those exact values — do not invent brand colors.

## Anti-Generic Guardrails
- **Colors:** Never use default Tailwind palette (indigo-500, blue-600, etc.). Pick a custom brand color and derive from it.
- **Shadows:** Never use flat `shadow-md`. Use layered, color-tinted shadows with low opacity.
- **Typography:** Never use the same font for headings and body. Pair a display/serif with a clean sans. Apply tight tracking (`-0.03em`) on large headings, generous line-height (`1.7`) on body.
- **Gradients:** Layer multiple radial gradients. Add grain/texture via SVG noise filter for depth.
- **Animations:** Only animate `transform` and `opacity`. Never `transition-all`. Use spring-style easing.
- **Interactive states:** Every clickable element needs hover, focus-visible, and active states. No exceptions.
- **Images:** Add a gradient overlay (`bg-gradient-to-t from-black/60`) and a color treatment layer with `mix-blend-multiply`.
- **Spacing:** Use intentional, consistent spacing tokens — not random Tailwind steps.
- **Depth:** Surfaces should have a layering system (base → elevated → floating), not all sit at the same z-plane.

## Hero Bubble Images — שינוי גודל
- בועות הלוגואים בהירו (`bubble-tag`) משתמשות ב-`display: flex` + `overflow: hidden` לחיתוך.
- Tailwind CDN מוסיף `max-width: 100%` + `height: auto` על כל `img`, שחוסם הגדלה מעבר לגודל הבועה.
- **לפני שינוי גודל תמונה בבועה** — לוודא שעל `.bubble-tag img` קיים:
  ```css
  flex-shrink: 0;
  max-width: none;
  max-height: none;
  ```
- גודל התמונה בפועל נקבע ב-`BUBBLES` array (בסוף ה-HTML), שדות `w` ו-`h`.
- **בועה עם תמונה אחת בלבד ב-pool לא תתחלף** — הקוד כבר מיישם זאת (`pool.length <= 1 → skip`). בעת הוספת תמונות ל-pool, לוודא שבועה "סטטית" נשארת עם פריט אחד בלבד.
- הגדלת `w`/`h` מעבר לגודל הבועה → זום-אין (נחתך מהצדדים, ממורכז).
- הקטנת `w`/`h` מתחת לגודל הבועה → רווח לבן סביב הלוגו.

## Scanner Deploy — Hard Rule
- **כל שינוי ב-`scanner.html` חייב להידחף לשני הריפואים** — ללא יוצא מן הכלל.
- לאחר כל עריכה ב-`scanner.html`: להריץ `.\deploy-scanner.ps1 "תיאור השינוי"` — הסקריפט מסנכרן ל-`scanner-site` ודוחף את שניהם.
- אין לסיים משימה שקשורה לסורק לפני שה-deploy רץ בהצלחה.

## Git — Hard Rules
- **אסור לדחוף (push) ללא בקשה מפורשת.** commit בלבד כברירת מחדל — push רק כשהמשתמש אומר "תדחוף" / "push".
- הכלל חל גם על scanner deploy: לא להריץ `git push` או `git -C scanner-site push` אוטומטית.

## Hard Rules
- Do not add sections, features, or content not in the reference
- Do not "improve" a reference design — match it
- Do not stop after one screenshot pass
- Do not use `transition-all`
- Do not use default Tailwind blue/indigo as primary color