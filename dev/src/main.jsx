import React from 'react'
import { createRoot } from 'react-dom/client'
import { PhotoUploadCard } from '../../src/index.js'
import '../../src/styles.css'
import './styles.css'

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <main className="dev-shell">
      <PhotoUploadCard
        validationUrl="/api/validate-photo"
        saveUrl="/api/save-photo"
      />
    </main>
  </React.StrictMode>,
)
