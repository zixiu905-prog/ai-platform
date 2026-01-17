import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 确保 DOM 已加载
document.addEventListener('DOMContentLoaded', () => {
  const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
  );
  
  root.render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  );
});

// 防止右键菜单
document.addEventListener('contextmenu', (e) => {
  e.preventDefault();
});

// 防止拖拽文件到窗口
document.addEventListener('dragover', (e) => {
  e.preventDefault();
  e.dataTransfer!.dropEffect = 'copy';
});

document.addEventListener('drop', (e) => {
  e.preventDefault();
});