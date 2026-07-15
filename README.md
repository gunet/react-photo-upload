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

function Example({ validationUrl, saveUrl }) {
  return (
    <PhotoUploadCard
      validationUrl={validationUrl}
      saveUrl={saveUrl}
      openInModal
      openButtonLabel="Upload photo"
      containerClassName="profile-photo-upload"
      openButtonClassName="w-full mt-3"
    />
  )
}
```

`validationUrl` and `saveUrl` should point to the validation and persistence endpoints.

## Props

`PhotoUploadCard` props:

- `validationUrl` (`string`, default `''`): endpoint used for photo validation.
- `saveUrl` (`string`, default `''`): endpoint used to persist an accepted photo.
- `openInModal` (`boolean`, default `false`): opens the flow in a modal.
- `openButtonLabel` (`string`, default `'Open Photo Upload'`): label for modal opener button.
- `openButtonVariant` (`'primary' | 'secondary'`, default `'primary'`): opener button style.
- `openButtonClassName` (`string`, default `''`): extra class for the opener button.
- `containerClassName` (`string`, default `''`): extra class on the root wrapper (`.uphoto-root`).
- `modalTitle` (`string`, default `'Photo Upload'`): screen-reader title inside modal.
- `modalAriaLabel` (`string`, default `'Upload and validate your photo'`): `aria-label` for modal dialog.
- `onSaveSuccess` (`(payload) => void`, optional): called after a successful save, with the
  parsed save response body. Fires before the modal auto-closes, so use it to refetch or
  update whatever image/profile data the consuming app displays.

## Upload Contract

Validation submit behavior:

- Sends a `POST` request to `validationUrl` as `multipart/form-data`.
- Uses form field name `photo`.
- Sends cookies/credentials (`withCredentials: true`).
- Converts the cropped output to JPEG (`1200x1600`) with filename format `<original-name>-3x4.jpg`.
- Treats validation as accepted only when `response.data.report.accept === true`, or, if the
  response body wraps its payload in a `data` envelope, `response.data.data.report.accept === true`.

Minimal success response example (flat):

```json
{
  "report": {
    "accept": true
  }
}
```

Minimal success response example (wrapped in a `data` envelope, e.g. a generic API response wrapper):

```json
{
  "status": "SUCCESS",
  "message": "Photo is valid.",
  "data": {
    "report": {
      "accept": true
    }
  }
}
```

Save behavior:

- Is enabled only after validation returns `report.accept === true` (flat or `data`-wrapped, as above).
- Sends a `POST` request to `saveUrl` as `multipart/form-data`.
- Uses form field name `photo` and sends the same cropped JPEG that passed validation.
- Sends cookies/credentials (`withCredentials: true`).
- Treats any `2xx` response as successful.
- Closes the upload modal automatically after a successful save. Inline flows remain open.

## File Rules

- Accepted formats: `PNG`, `JPG`, `JPEG`.
- Max size: `10 MB`.
- Minimum dimensions: `1200 x 1600`.
- Interactive preview frame: `300 x 400` (3:4).

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
  validationUrl={validationUrl}
  saveUrl={saveUrl}
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
