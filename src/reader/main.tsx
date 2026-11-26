import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@radix-ui/themes/styles.css'
import '../styles/reader.css'
import { ReaderPage } from './ReaderPage'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ReaderPage />
  </StrictMode>,
)
