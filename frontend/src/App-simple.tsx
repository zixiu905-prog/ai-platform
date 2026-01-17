import React from 'react'
import ErrorBoundary from "./ErrorBoundary"
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import DesktopDownloadPage from './pages/DesktopDownloadPage'

function App() {
  return (
    <ErrorBoundary><Router>
      <Routes>
        <Route path="/" element={<h1>主页</h1>} />
        <Route path="/desktop/download" element={<DesktopDownloadPage />} />
        <Route path="*" element={<h1>404 - 页面不存在</h1>} />
      </Routes>
    </Router></ErrorBoundary>
  )
}

export default App
