# Clix Automations — Brand Guide

> **גישה מהירה:** העתק CSS Variables מ-Section 1 לכל פרויקט חדש.  
> עותק גלובלי שמור גם ב-`C:\Users\nisim\clix-brand-guide.md`

---

## 1. CSS Variables — הדבק בתחילת כל `<style>`

```css
:root {
  /* ── Backgrounds ── */
  --bg:       #0e1628;   /* רקע ראשי */
  --bg-e:     #141d35;   /* elevated — כרטיסים */
  --bg-f:     #1a2540;   /* floating — מודלים, inputs */

  /* ── Brand Colors ── */
  --blue:     #2196b0;
  --blue-l:   #2db3cd;   /* lighter — הדגשות, icons */
  --blue-g:   rgba(33,150,176,0.28);   /* glow */
  --blue-bg:  rgba(33,150,176,0.08);   /* רקע עדין */

  --pink:     #e0176b;   /* CTA, accent */
  --pink-g:   rgba(224,23,107,0.28);   /* glow */
  --pink-bg:  rgba(224,23,107,0.08);   /* רקע עדין */

  /* ── Text ── */
  --text:     #ffffff;
  --muted:    rgba(255,255,255,0.5);
  --subtle:   rgba(255,255,255,0.28);

  /* ── Borders ── */
  --border:        rgba(255,255,255,0.09);
  --border-strong: rgba(255,255,255,0.18);
  --border-blue:   rgba(33,150,176,0.28);
  --border-pink:   rgba(224,23,107,0.28);

  /* ── Extra ── */
  --star:  #f5c842;   /* דירוג כוכבים */
  --green: #28c76f;   /* הצלחה / success */
  --error: #ef4444;   /* שגיאה */
}
```

---

## 2. Fonts

### Import (Google Fonts)
```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Heebo:wght@400;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
```

### שימוש
| יישום | פונט | משקל |
|-------|------|------|
| Body / כל הטקסט בעברית | `Heebo` | 400 / 600 |
| כותרות גדולות | `Heebo` | 800 / 900 |
| לוגו "Clix" | `Inter` | 700 |
| מספרים / קוד / LTR | `Inter` | 400–600 |

```css
body { font-family: 'Heebo', sans-serif; }
.logo-clix { font-family: 'Inter', sans-serif; font-weight: 700; }
```

---

## 3. Typography Scale

```css
/* Hero / Page Title */
.h1 {
  font-size: clamp(22px, 5.5vw, 34px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

/* Section Title */
.h2 {
  font-size: clamp(26px, 4vw, 42px);
  font-weight: 800;
  letter-spacing: -0.03em;
  line-height: 1.25;
}

/* Card Title */
.h3 {
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 700;
  letter-spacing: -0.02em;
  line-height: 1.3;
}

/* Body */
p {
  font-size: 15px;      /* mobile */
  font-size: 1rem;      /* desktop */
  line-height: 1.7;
  color: rgba(255,255,255,0.8);
}

/* Muted / Subtitle */
.subtitle {
  font-size: 14px;
  color: rgba(255,255,255,0.5);
  line-height: 1.6;
}

/* Label / Uppercase tag */
.label-sm {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.55);
}
```

---

## 4. Backgrounds & Gradients

### רקע ראשי עם gradient + grain
```html
<div class="bg-grad"></div>
<div class="grain"></div>
```
```css
body { background: #0e1628; }

.bg-grad {
  position: fixed; inset: 0; z-index: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 70% 50% at 10% 10%, rgba(33,150,176,0.07) 0%, transparent 65%),
    radial-gradient(ellipse 50% 45% at 90% 85%, rgba(224,23,107,0.05) 0%, transparent 65%),
    #0e1628;
}

.grain {
  position: fixed; inset: 0; z-index: 1; pointer-events: none; opacity: 0.025;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
  background-size: 256px 256px;
}
```

---

## 5. Buttons

### Primary — ורוד (CTA ראשי)
```css
.btn-p {
  background: #e0176b;
  color: #fff;
  font-family: 'Heebo', sans-serif;
  font-weight: 700;
  font-size: 15px;
  padding: 13px 30px;
  border-radius: 12px;
  border: none;
  cursor: pointer;
  display: inline-flex; align-items: center; gap: 7px;
  box-shadow: 0 4px 22px rgba(224,23,107,0.3);
  transition: transform 0.22s cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 0.22s ease;
}
.btn-p:hover  { transform: translateY(-2px); box-shadow: 0 8px 32px rgba(224,23,107,0.38); }
.btn-p:active { transform: translateY(0); }
.btn-p:focus-visible { outline: 2px solid #e0176b; outline-offset: 3px; }
.btn-p:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
```

### Secondary — שקוף עם border
```css
.btn-s {
  background: transparent;
  color: rgba(255,255,255,0.5);
  font-family: 'Heebo', sans-serif;
  font-weight: 500;
  font-size: 14px;
  padding: 12px 22px;
  border-radius: 12px;
  border: 1.5px solid rgba(255,255,255,0.09);
  cursor: pointer;
  transition: border-color 0.2s ease, color 0.2s ease,
              transform 0.22s cubic-bezier(0.34,1.56,0.64,1);
}
.btn-s:hover  { border-color: rgba(255,255,255,0.28); color: #fff; transform: translateY(-1px); }
.btn-s:active { transform: translateY(0); }
```

### Nav CTA — ורוד קטן
```css
.btn-cta {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.55rem 1.4rem;
  background: #e0176b; color: #fff;
  font-family: 'Heebo', sans-serif; font-weight: 700; font-size: 0.9rem;
  border-radius: 10px; border: none; cursor: pointer; text-decoration: none;
}
/* Arrow animates left on hover (RTL) */
.btn-cta:hover .btn-arrow { transform: translateX(-5px); }
.btn-arrow { display: inline-block; transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1); }
```

### Outline — כחול
```css
.btn-outline {
  display: inline-flex; align-items: center; gap: 0.4rem;
  padding: 0.6rem 1.6rem;
  background: transparent; color: #fff;
  font-family: 'Heebo', sans-serif; font-weight: 600; font-size: 1rem;
  border-radius: 8px; border: 1.5px solid rgba(255,255,255,0.4);
  cursor: pointer; text-decoration: none;
  transition: border-color 0.2s, background 0.2s;
}
.btn-outline:hover { border-color: #2196b0; background: rgba(33,150,176,0.08); }
```

---

## 6. Cards

### כרטיס רגיל
```css
.card {
  background: #141d35;
  border: 1.5px solid rgba(255,255,255,0.09);
  border-radius: 18px;
  padding: 22px 18px;
  transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1),
              box-shadow 0.2s ease;
}
.card:hover {
  transform: translateY(-4px);
  border-color: rgba(255,255,255,0.2);
  box-shadow: 0 10px 36px rgba(0,0,0,0.28);
}
```

### כרטיס selected — כחול
```css
.card.sel {
  border-color: #2196b0;
  box-shadow: 0 0 0 3px rgba(33,150,176,0.28), 0 8px 28px rgba(33,150,176,0.15);
}
```

### כרטיס selected — ורוד
```css
.card.sel-pink {
  border-color: #e0176b;
  box-shadow: 0 0 0 3px rgba(224,23,107,0.28);
}
```

### כרטיס עם glow — כחול (process nodes)
```css
.card-glow {
  background: rgba(33,150,176,0.08);
  border: 1.5px solid rgba(33,150,176,0.28);
  border-radius: 20px;
  padding: 1.25rem 1.5rem;
  box-shadow: 0 0 30px rgba(33,150,176,0.2), inset 0 0 20px rgba(33,150,176,0.07);
}
.card-glow:hover {
  border-color: rgba(33,150,176,0.55);
  box-shadow: 0 0 45px rgba(33,150,176,0.32), inset 0 0 24px rgba(33,150,176,0.12);
}
```

### Testimonial card
```css
.testi-card {
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 14px;
  padding: 1.1rem 1.5rem;
  transition: border-color 0.25s;
}
.testi-card:hover { border-color: rgba(33,150,176,0.4); }
```

---

## 7. Navigation

```html
<nav>
  <div class="nav-inner">
    <!-- Logo -->
    <a href="/" style="text-decoration:none; display:flex; align-items:baseline; gap:0.15rem; direction:ltr;">
      <span style="font-family:'Inter',sans-serif; font-weight:700; font-size:1.75rem; letter-spacing:-0.04em; color:#ffffff;">Clix</span>
      <span style="font-family:'Inter',sans-serif; font-weight:400; font-size:1.35rem; letter-spacing:-0.02em; color:#e0176b;">Automations</span>
    </a>
    <!-- Links -->
    <div class="nav-links-desktop">
      <a href="/">דף הבית</a>
      <a href="/#process">תהליך</a>
      <a href="/scanner.html" class="nav-active">רדאר העסק</a>
    </div>
    <!-- CTA -->
    <a href="/#contact" class="btn-cta">לפרטים נוספים <span class="btn-arrow">◄</span></a>
  </div>
</nav>
```

```css
nav {
  position: fixed; top: 0; left: 0; right: 0;
  width: 100%; z-index: 100;
  background: transparent; padding: 0.75rem 1rem;
}
.nav-inner {
  width: calc(75% - 2rem); max-width: calc(75% - 2rem);
  margin: 0 auto;
  background: rgba(14,16,28,0.55);
  backdrop-filter: blur(22px); -webkit-backdrop-filter: blur(22px);
  border-radius: 16px; border: 1.5px solid rgba(255,255,255,0.10);
  padding: 0 1.25rem; height: 100px;
  display: flex; align-items: center; justify-content: space-between;
  box-shadow: 0 4px 28px rgba(0,0,0,0.35);
}
nav a { color: rgba(255,255,255,0.75); text-decoration: none; font-weight: 500; }
nav a:hover { color: #fff; }
nav a.nav-active { color: #e0176b !important; font-weight: 700; }

/* Mobile nav */
@media (max-width: 767px) {
  .nav-inner {
    width: calc(100% - 2rem) !important;
    border: 1.5px solid #e0176b !important;
    background: rgba(14,22,40,0.88) !important;
    height: 80px !important;
    border-radius: 14px !important;
  }
  nav { padding: 0.6rem 1rem !important; }
}
```

---

## 8. Tag Chips & Badges

```css
/* כחול — label/category */
.tag-chip {
  display: inline-flex; align-items: center;
  padding: 0.3rem 0.8rem;
  background: rgba(33,150,176,0.15);
  border: 1px solid rgba(33,150,176,0.3);
  border-radius: 999px;
  font-size: 0.78rem; font-weight: 600;
  color: #5dc8e0;
}

/* Section label tag */
.s4-tag {
  display: inline-flex; align-items: center; gap: 6px;
  background: rgba(33,150,176,0.12); border: 1px solid rgba(33,150,176,0.3);
  border-radius: 20px; padding: 4px 13px;
  font-size: 11px; font-weight: 700; color: #2db3cd;
  margin-bottom: 12px;
}
```

---

## 9. Form Inputs

```css
.form-input {
  width: 100%;
  background: #1a2540;
  border: 1.5px solid rgba(255,255,255,0.09);
  border-radius: 12px;
  padding: 13px 15px;
  font-family: 'Heebo', sans-serif;
  font-size: 15px; /* ≥16px on mobile to prevent iOS zoom */
  color: #fff;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.form-input:focus {
  border-color: #2196b0;
  box-shadow: 0 0 0 3px rgba(33,150,176,0.22);
}
.form-input::placeholder { color: rgba(255,255,255,0.3); }
.form-input.err {
  border-color: #e0176b;
  box-shadow: 0 0 0 3px rgba(224,23,107,0.2);
}

/* iOS zoom fix — all inputs on mobile */
@media (max-width: 767px) {
  input, textarea, select { font-size: 16px !important; }
}
```

---

## 10. Animations

```css
/* ── עיקרון: רק transform ו-opacity — לעולם לא transition-all ── */

/* Fade + slide up — reveal on scroll */
.reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.6s ease, transform 0.6s cubic-bezier(0.22,1,0.36,1);
}
.reveal.visible { opacity: 1; transform: translateY(0); }

/* Screen transition */
@keyframes fadeUp {
  from { opacity: 0; transform: translateY(5px); }
  to   { opacity: 1; transform: translateY(0); }
}
.screen.active { animation: fadeUp 0.3s ease-out; }

/* Spring pop — כפתורים, כרטיסים */
/* easing: cubic-bezier(0.34, 1.56, 0.64, 1) */

/* Float — bubble animations */
@keyframes floatBubble {
  0%   { transform: translateY(0px); }
  40%  { transform: translateY(-14px); }
  60%  { transform: translateY(-12px); }
  100% { transform: translateY(0px); }
}

/* Glow pulse — live/active nodes */
@keyframes tlGlow {
  0%,100% { box-shadow: 0 0 16px rgba(33,150,176,0.22), 0 0 32px rgba(33,150,176,0.08); }
  50%      { box-shadow: 0 0 30px rgba(33,150,176,0.44), 0 0 56px rgba(33,150,176,0.16); }
}

/* Loading dots */
@keyframes dotBounce {
  0%, 60%, 100% { transform: translateY(0); opacity: 0.25; }
  30%            { transform: translateY(-7px); opacity: 1; }
}
.dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #2196b0;
  animation: dotBounce 1.1s infinite cubic-bezier(0.45, 0.05, 0.55, 0.95);
}
```

---

## 11. Depth / Layering System

```
Layer 0 — body background:  #0e1628
Layer 1 — כרטיסים רגילים:   #141d35  (--bg-e)
Layer 2 — inputs, modals:    #1a2540  (--bg-f)
Layer 3 — floating / sticky: glassmorphism — rgba(14,16,28,0.55) + blur(22px)
```

**כלל:** אל תשים שני אלמנטים בגובה שכבה זהה.  
Nav = floating layer 3. Card = layer 1. Input inside card = layer 2.

---

## 12. RTL / Hebrew Rules

```html
<html lang="he" dir="rtl">
```

```css
/* Arrow in CTA buttons — מצביע שמאלה (RTL) */
.btn-cta:hover .btn-arrow { transform: translateX(-5px); }

/* Inputs — תמיד RTL */
input[type="text"], textarea { direction: rtl; text-align: right; }
/* טלפון / מייל — LTR */
input[type="tel"], input[type="email"] { direction: ltr; }
```

---

## 13. Section Spacing Template

```css
/* Section wrapper */
.section {
  max-width: 1120px;
  margin: 0 auto;
  padding: 5rem 1.5rem;
}

/* Divider between sections */
.section-divider {
  height: 1px;
  background: rgba(255,255,255,0.12);
}

/* Mobile */
@media (max-width: 767px) {
  .section { padding: 3rem 1.25rem; }
}
```

---

## 14. Step Pill (מספור שלבים)

```css
.step-pill {
  display: inline-flex; align-items: center; justify-content: center;
  width: 28px; height: 28px;
  border-radius: 50%;
  background: rgba(33,150,176,0.2);
  border: 1.5px solid #2196b0;
  font-size: 0.75rem; font-weight: 800;
  color: #2196b0;
  flex-shrink: 0;
}
```

---

## 15. Quick Reference — Hex Palette

| Token | Hex | שימוש |
|-------|-----|-------|
| `--bg` | `#0e1628` | רקע ראשי |
| `--bg-e` | `#141d35` | כרטיסים |
| `--bg-f` | `#1a2540` | inputs, modals |
| `--blue` | `#2196b0` | primary blue |
| `--blue-l` | `#2db3cd` | lighter blue, icons |
| `--pink` | `#e0176b` | CTA, accent |
| `--green` | `#28c76f` | success |
| `--star` | `#f5c842` | star ratings |
| `--error` | `#ef4444` | שגיאות |
| White muted | `rgba(255,255,255,0.5)` | טקסט משני |
| White subtle | `rgba(255,255,255,0.28)` | placeholder |
| Border | `rgba(255,255,255,0.09)` | גבולות כרטיסים |

---

## 16. Logo Markup

```html
<!-- לוגו Clix Automations — תמיד LTR, גם בדף RTL -->
<a href="/" style="text-decoration:none; display:flex; align-items:baseline; gap:0.15rem; direction:ltr;">
  <span style="font-family:'Inter',sans-serif; font-weight:700; font-size:1.75rem; letter-spacing:-0.04em; color:#ffffff;">Clix</span>
  <span style="font-family:'Inter',sans-serif; font-weight:400; font-size:1.35rem; letter-spacing:-0.02em; color:#e0176b;">Automations</span>
</a>
```

> **ניסים בנגייב** — Clix Automations  
> clix-automations.com
