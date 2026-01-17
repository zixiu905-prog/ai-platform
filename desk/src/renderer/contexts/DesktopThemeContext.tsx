import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark' | 'auto';

interface DesktopThemeContextType {
  theme: Theme;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
  systemTheme: 'light' | 'dark';
}

const DesktopThemeContext = createContext<DesktopThemeContextType | undefined>(undefined);

export const DesktopThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>('auto');
  const [systemTheme, setSystemTheme] = useState<'light' | 'dark'>('dark');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('dark');

  // 检测系统主题
  useEffect(() => {
    const detectSystemTheme = () => {
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setSystemTheme('dark');
      } else {
        setSystemTheme('light');
      }
    };

    detectSystemTheme();

    // 监听系统主题变化
    if (window.matchMedia) {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      mediaQuery.addEventListener('change', detectSystemTheme);
      return () => mediaQuery.removeEventListener('change', detectSystemTheme);
    }
  }, []);

  // 从Electron存储加载主题设置
  useEffect(() => {
    const loadTheme = async () => {
      try {
        if (window.electronAPI && window.electronAPI.store) {
          const savedTheme = await window.electronAPI.store.get('preferences.theme');
          if (savedTheme) {
            setThemeState(savedTheme);
          }
        }
      } catch (error) {
        console.error('加载主题设置失败:', error);
      }
    };

    loadTheme();
  }, []);

  // 保存主题设置到Electron存储
  const setTheme = async (newTheme: Theme) => {
    setThemeState(newTheme);
    
    try {
      if (window.electronAPI && window.electronAPI.store) {
        await window.electronAPI.store.set('preferences.theme', newTheme);
      }
    } catch (error) {
      console.error('保存主题设置失败:', error);
    }
  };

  // 切换主题
  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'auto' : 'light';
    setTheme(nextTheme);
  };

  // 计算最终应用的主题
  useEffect(() => {
    let finalTheme: 'light' | 'dark';
    
    switch (theme) {
      case 'light':
        finalTheme = 'light';
        break;
      case 'dark':
        finalTheme = 'dark';
        break;
      case 'auto':
      default:
        finalTheme = systemTheme;
        break;
    }
    
    setResolvedTheme(finalTheme);
    
    // 应用主题到DOM
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(finalTheme);
    
    // 设置CSS变量
    if (finalTheme === 'dark') {
      document.documentElement.style.setProperty('--bg-primary', '#0a0e1a');
      document.documentElement.style.setProperty('--bg-secondary', '#1a1f36');
      document.documentElement.style.setProperty('--bg-tertiary', '#2d1b69');
      document.documentElement.style.setProperty('--text-primary', '#e2e8f0');
      document.documentElement.style.setProperty('--text-secondary', '#94a3b8');
      document.documentElement.style.setProperty('--border-primary', 'rgba(255, 255, 255, 0.1)');
      document.documentElement.style.setProperty('--border-secondary', 'rgba(255, 255, 255, 0.05)');
    } else {
      document.documentElement.style.setProperty('--bg-primary', '#ffffff');
      document.documentElement.style.setProperty('--bg-secondary', '#f8fafc');
      document.documentElement.style.setProperty('--bg-tertiary', '#e2e8f0');
      document.documentElement.style.setProperty('--text-primary', '#0f172a');
      document.documentElement.style.setProperty('--text-secondary', '#475569');
      document.documentElement.style.setProperty('--border-primary', 'rgba(0, 0, 0, 0.1)');
      document.documentElement.style.setProperty('--border-secondary', 'rgba(0, 0, 0, 0.05)');
    }
  }, [theme, systemTheme]);

  const value: DesktopThemeContextType = {
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    systemTheme
  };

  return (
    <DesktopThemeContext.Provider value={value}>
      {children}
    </DesktopThemeContext.Provider>
  );
};

export const useDesktopTheme = (): DesktopThemeContextType => {
  const context = useContext(DesktopThemeContext);
  
  if (context === undefined) {
    throw new Error('useDesktopTheme must be used within DesktopThemeProvider');
  }
  
  return context;
};

export default DesktopThemeContext;