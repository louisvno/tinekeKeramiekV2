# Image Upload Flow — Bugs Found & Fixes

## Overview

The image upload flow spans three layers: the admin frontend (`server/front/admin.html`), the API route (`server/src/routes/images.js`), and the storage layer (`server/src/storage/images.js`). Multiple bugs were found that prevented uploads from working end-to-end.

---

## Bug 1 — Frontend: `e.target.file` is `undefined`

**File:** `server/front/admin.html` (in `uploadImage`)

**Problem:** The code used a `FileReader` with `readAsArrayBuffer()`, then read the file in the `onload` handler via `e.target.file`. A `FileReader`'s `onload` event exposes the result as `e.target.result` (an `ArrayBuffer`), **not** `e.target.file`. So `file` was always `undefined` and the upload was skipped.

**Fix:** Removed the `FileReader` entirely (it was unnecessary) and used the real `File` object directly:

```js
const file = fileInput.files[0];
if (!file) return resolve();
const formData = new FormData();
formData.append('postId', postId);
formData.append('file', file);
```

---

## Bug 2 — Backend: multer middleware never applied

**File:** `server/src/routes/images.js`

**Problem:** The `upload` (multer) middleware was defined but **never attached** to the route. Without it, multipart form data is not parsed, so both `req.file` and `req.body.postId` were `undefined`. The route would always fail with `"postId is required"`.

**Fix:** Applied the middleware to the route:

```js
router.post('/upload', upload.single('file'), (req, res) => {
```

(The frontend sends the file under the field name `file`, so `upload.single('file')` is correct.)

---

## Bug 3 — Backend: `file.arrayBuffer()` is not a function

**File:** `server/src/storage/images.js` (in `uploadImage`)

**Problem:** With `multer.memoryStorage()`, `req.file` is a **plain object** with a `.buffer` property (a `Buffer`) — it has **no** `arrayBuffer()` method. Calling `file.arrayBuffer()` threw:

```
TypeError: file.arrayBuffer is not a function
```

**Fix:** Use the buffer directly:

```js
const buffer = file.buffer;
```

---

## Bug 4 — Backend: `source` directory never created

**File:** `server/src/storage/images.js` (in `uploadImage`)

**Problem:** `sourceDir` was declared but never used, and the directory-creation loop only created `thumbnails`, `x500`, and `x1000`. The `source` directory was missing, so `fs.writeFileSync(paths.source, buffer)` threw:

```
ENOENT: no such file or directory, open '.../source/...'
```

**Fix:** Added `'source'` to the sizes array (and removed the unused `sourceDir` declaration).

---

## Bug 5 — Backend: Outdated folder structure

**File:** `server/src/storage/images.js` (in `uploadImage` and `deleteImage`)

**Problem:** The code wrote images into **subfolders**:

```
server/uploads/posts/<postId>/
  source/<filename>
  thumbnails/<imgId>/<filename>
  x500/<imgId>/<filename>
  x1000/<imgId>/<filename>
```

But the **real** structure (seen in existing post folders) has files **directly in the post folder**, with a **prefix in the filename** indicating the size:

```
server/uploads/posts/<postId>/
  thumb_<originalname>.png      <- thumbnail, always PNG
  x500_<originalname>.jpg       <- 500px, keeps original extension
  x1000_<originalname>.jpg      <- 1000px, keeps original extension
```

**Fix (pending / in progress):** Rewrite `uploadImage` (and `deleteImage`) to write flat files with the `thumb_` / `x500_` / `x1000_` prefixes, matching the existing folders.

---

## Frontend path conventions (for reference)

The frontend (`server/front/assets/scripts/main.js` and `index.html`) expects these URL shapes, which the storage layer must produce:

| Consumer | URL shape |
|----------|-----------|
| Post cards (`index.html`) | `/api/images/<storagePath>` where `storagePath = <postId>/<imgId>` |
| `GET /api/images/:postId/:imgId` | redirects to `/uploads/posts/<postId>/<imgId>` |
| `loadThumbs` | `thumb.path = /uploads/posts/<postId>/thumb_<originalname>.png` |
| `data-img-id` | `thumb.path.replace("thumb_", "x500_")` → `.../x500_<originalname>.png` |
| Click handler | `imgx500path.replace(".png", "")` → `.../x500_<originalname>` |

**Note:** The click handler strips a trailing `.png` to derive the x500 URL. This only works if the x500 file's extension is `.png` **or** if the thumb→x500 swap is followed by the `.png` removal. Verify the exact extension convention when implementing Bug 5 so the click handler resolves to a real file.

---

## Verification

After the fixes, a fresh server + `curl` upload of a test PNG returned a successful upload (the remaining failure was the outdated folder structure, Bug 5, and the `sharp` "unsupported image format" error on the 1x1 test PNG).
