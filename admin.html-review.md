# Code Review — `server/front/admin.html` (JavaScript)

## Scope
JavaScript only. The only logic lives in the first `<script>` block (in `<head>`);
the second `<script>` in `<body>` is an empty placeholder. Review is based on
the backend endpoints this page calls:

- `POST /api/posts` → returns `201 { success, data: post, id }` (server-generated `id`)
- `POST /api/images/upload` (FormData: `postId`, `file`)

---

## 🔴 Critical

### 1. Progress bar is broken
`currentImageIndex` is overwritten in the `for` loop (it ends at the highest
selected index), and uploads are fired concurrently without being awaited.
So `progress` is computed from a value that doesn't describe which upload just
finished, and the last-resolved upload *overwrites* the others — progress can
jump backwards and won't track actual completion. It also divides by
`imageInputs.length` (4) rather than the number of files actually selected.

```js
// count real files, not inputs
let totalImages = 0, done = 0;
imageInputs.forEach(inp => totalImages += (inp.files ? inp.files.length : 0));

function setProgress() {
  progress = totalImages ? Math.round(done / totalImages * 100) : 0;
  progressBar.style.width = progress + '%';
}
// in each upload's then():  done++; setProgress();
```

### 2. "Post created successfully!" alert fires before images finish uploading
The alert fires immediately after the fire‑and‑forget `for` loop, not after the
uploads complete. The user is told success while images are still in flight,
and a later image failure pops a *second* alert. Decouple post success from
image success (e.g. resolve after all uploads settle, or track a failure count).

---

## 🟡 Correctness / Robustness

### 3. No `response.ok` check
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

### 4. No double‑submit guard
The submit button stays enabled during upload; a second click creates a second
post (and re‑uploads). Disable the button (and/or set a flag) until done.

### 5. Form never reset after a successful creation.

### 6. `#result-message` is declared in HTML but never written to
All feedback goes through `alert()` instead. Either wire it up or drop the
element.

### 7. `FileReader.onerror` unhandled
A read failure is silent.

### 8. No client‑side validation of image type/size
The server validates, so this is not a security hole — just better UX to
reject early.

---

## 🟢 Minor / Hygiene

- **`#upload-progress`** is a plain `<div>` with text, not a Bootstrap
  `.progress > .progress-bar`, so setting `style.width` produces no visible
  bar (JS/CSS mismatch).
- **Empty second `<script>` in `<body>`** — remove the placeholder.
- `progress` / `progressBar` are fine as IIFE‑scoped variables.

---

## Recommended priority
The two critical items are the only ones that affect user-visible behavior
or data integrity:

1. Make progress count‑based (fix #1).
2. Only show "success" after the post **and** the images are settled (fix #2).

The rest are polish/robustness.

## Fixed
- Client‑generated `postId` / orphaned images — resolved in commit `7bf53e1`
  ("fix post id bug"): uploads now use the server‑generated `data.id`, and the
  dead `postData` / client ID code (including the deprecated `substr` call) was
  removed.
