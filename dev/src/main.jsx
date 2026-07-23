import React, { useState } from 'react'
import { createRoot } from 'react-dom/client'
import { PhotoUploadCard } from '../../src/index.js'
import '../../src/styles.css'
import './styles.css'

function App() {
  const [saveMessage, setSaveMessage] = useState('')

  return (
    <main className="dev-shell">
      <PhotoUploadCard
        openInModal
        openButtonLabel="Open photo upload"
        validationUrl="/api/validate-photo"
        saveUrl="/api/save-photo"
        onSaveSuccess={(response) => {
          setSaveMessage(response?.message || 'Photo saved successfully.')
        }}
      />

      {saveMessage ? (
        <p className="dev-save-message" role="status">
          {saveMessage}
        </p>
      ) : null}
    </main>
  )
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
