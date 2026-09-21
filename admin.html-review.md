# Code Review — `server/front/admin.html` (JavaScript)

## Scope
JavaScript only. The only logic lives in the first `<script>` block (in `<head>`);
the second `<script>` in `<body>` is an empty placeholder. Review is based on
the backend endpoints this page calls:

- `POST /api/posts` → returns `201 { success, data: post, id }` (server-generated `id`)
- `POST /api/images/upload` (FormData: `postId`, `file`)

---

## 🟡 Correctness / Robustness

### 1. No `response.ok` check
`response.json()` is called unconditionally on both the post-creation and image
uploads; on 400/403/500 you only notice via `data.success === false`. If the
body isn't valid JSON the promise rejects and your `catch` shows a misleading
message.

```js
// fragile:
const data = await (await fetch(...)).json();

// better:
const res = await fetch(...);
if (!res.ok) throw new Error(`HTTP ${res.status}`);
const data = await res.json();
```

### 2. No double‑submit guard
The submit button stays enabled during upload; a second click creates a second
post (and re‑uploads). Disable the button (and/or set a flag) until done.

### 3. Form never reset after a successful creation.

### 4. `#result-message` is declared in HTML but never written to
All feedback goes through `alert()` instead. Either wire it up or drop the
element.

### 5. No client‑side validation of image type/size
The server validates, so this is not a security hole — just better UX to
reject early.

---

## 🟢 Minor / Hygiene

- **`#upload-progress`** is a plain `<div>` with text, not a Bootstrap
  `.progress > .progress-bar`, so setting `style.width` produces no visible
  bar (JS/CSS mismatch).
- Empty second `<script>` in `<body>` — remove the placeholder.
- `progress` / `progressBar` are fine as IIFE‑scoped variables.

---

## Recommended priority
The remaining items are robustness/polish, ordered by user impact:

1. Add `response.ok` checks (fix #1) — avoids misleading alerts on HTTP errors.
2. Double‑submit guard (fix #2) — prevents duplicate posts from a second
   click during a long upload.
3. Form reset + `#result-message` wiring (fixes #3–4) — UX polish.

## Fixed
- **Progress bar was broken** (was Critical #1) — fixed: `totalImages` now
  counts real selected files (not input slots), `setProgress()` divides by that
  count, and uploads are awaited with `Promise.all`, so `done` always describes
  the upload that just settled. Progress can no longer jump backwards.
- **"Post created successfully!" alert fired before images finished**
  (was Critical #2) — fixed: the alert is now shown only after
  `Promise.all(uploadPromises)` settles, with a failure count shown when some
  uploads failed.
- **`FileReader.onerror` unhandled** (was #7) — fixed: read failures now
  increment `failed`, alert, and resolve the upload promise.
- Client‑generated `postId` / orphaned images — resolved in commit `7bf53e1`
  ("fix post id bug"): uploads now use the server‑generated `data.id`, and the
  dead `postData` / client ID code (including the deprecated `substr` call) was
  removed.
