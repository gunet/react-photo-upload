# @uphoto/photo-upload

Reusable React photo upload flow with crop, validation request, and review steps.
Includes plain compiled CSS; no Tailwind setup is required in consumer apps.

## Install

```bash
npm install @uphoto/photo-upload react react-dom axios
```

`react`, `react-dom`, and `axios` are peer dependencies.

## Usage

```jsx
import '@uphoto/photo-upload/styles.css'
import { PhotoUploadCard } from '@uphoto/photo-upload'

function Example({ uploadUrl }) {
  return (
    <PhotoUploadCard
      uploadUrl={uploadUrl}
      openInModal
      openButtonLabel="Upload photo"
      containerClassName="profile-photo-upload"
      openButtonClassName="w-full mt-3"
    />
  )
}
```

`uploadUrl` should point to your photo validation endpoint (for example: `https://api.example.com/photo`).

## Props

`PhotoUploadCard` props:

- `uploadUrl` (`string`, default `''`): endpoint used for photo validation.
- `openInModal` (`boolean`, default `false`): opens the flow in a modal.
- `openButtonLabel` (`string`, default `'Open Photo Upload'`): label for modal opener button.
- `openButtonVariant` (`'primary' | 'secondary'`, default `'primary'`): opener button style.
- `openButtonClassName` (`string`, default `''`): extra class for the opener button.
- `containerClassName` (`string`, default `''`): extra class on the root wrapper (`.uphoto-root`).
- `modalTitle` (`string`, default `'Photo Upload'`): screen-reader title inside modal.
- `modalAriaLabel` (`string`, default `'Upload and validate your photo'`): `aria-label` for modal dialog.

## Upload Contract

Validation submit behavior:

- Sends `POST` request to `uploadUrl` as `multipart/form-data`.
- Uses form field name `photo`.
- Sends cookies/credentials (`withCredentials: true`).
- Converts the cropped output to JPEG (`1200x1600`) with filename format `<original-name>-3x4.jpg`.
- Treats validation as accepted only when `response.data.report.accept === true`.

Minimal success response example:

```json
{
  "report": {
    "accept": true
  }
}
```

## File Rules

- Accepted formats: `PNG`, `JPG`, `JPEG`.
- Max size: `10 MB`.
- Minimum dimensions: `1200 x 1600`.
- Interactive preview frame: `300 x 400` (3:4).

## Current Limitation

- The `Save` action currently does not call an API yet. It shows a placeholder confirmation message.

## Styling

Theme colors are CSS variables on the library root wrapper. Override `.uphoto-root`
from the consuming app to style both the opener button and the upload flow:

```css
.uphoto-root {
  --uphoto-brand: #2563eb;
  --uphoto-brand-strong: #1e40af;
  --uphoto-line: #d1d5db;
  --uphoto-text: #0f172a;
  --uphoto-muted: #64748b;
  --uphoto-surface-soft: #dbe7ef;
}
```

Use `.uphoto-root` alone when you want one global theme for all upload instances.
Use `containerClassName` only when you want scoped/per-instance themes.

You can scope the theme with `containerClassName`:

```jsx
<PhotoUploadCard
  uploadUrl={uploadUrl}
  openInModal
  openButtonLabel="Upload photo"
  containerClassName="profile-photo-upload"
/>
```

```css
.profile-photo-upload.uphoto-root {
  --uphoto-brand: #7c3aed;
  --uphoto-brand-strong: #5b21b6;
}
```
