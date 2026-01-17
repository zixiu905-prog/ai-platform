/**
 * 现代简约UI主题配置
 * 提供统一的颜色、字体、间距和动画系统
 */

export interface ThemeConfig {
  colors: {
    primary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    secondary: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    neutral: {
      50: string;
      100: string;
      200: string;
      300: string;
      400: string;
      500: string;
      600: string;
      700: string;
      800: string;
      900: string;
    };
    background: {
      primary: string;
      secondary: string;
      tertiary: string;
      overlay: string;
    };
    surface: {
      primary: string;
      secondary: string;
      elevated: string;
      border: string;
    };
    text: {
      primary: string;
      secondary: string;
      tertiary: string;
      inverse: string;
    };
    success: string;
    warning: string;
    error: string;
    info: string;
  };
  typography: {
    fontFamily: {
      primary: string;
      secondary: string;
      mono: string;
    };
    fontSize: {
      xs: string;
      sm: string;
      base: string;
      lg: string;
      xl: string;
      '2xl': string;
      '3xl': string;
      '4xl': string;
    };
    fontWeight: {
      light: number;
      normal: number;
      medium: number;
      semibold: number;
      bold: number;
    };
    lineHeight: {
      tight: number;
      normal: number;
      relaxed: number;
    };
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    '3xl': string;
    '4xl': string;
  };
  borderRadius: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
  animation: {
    duration: {
      fast: string;
      normal: string;
      slow: string;
    };
    easing: {
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
  breakpoints: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    '2xl': string;
  };
}

export const modernLightTheme: ThemeConfig = {
  colors: {
    primary: {
      50: '#eff6ff',
      100: '#dbeafe',
      200: '#bfdbfe',
      300: '#93c5fd',
      400: '#60a5fa',
      500: '#3b82f6',
      600: '#2563eb',
      700: '#1d4ed8',
      800: '#1e40af',
      900: '#1e3a8a',
    },
    secondary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e',
    },
    neutral: {
      50: '#f9fafb',
      100: '#f3f4f6',
      200: '#e5e7eb',
      300: '#d1d5db',
      400: '#9ca3af',
      500: '#6b7280',
      600: '#4b5563',
      700: '#374151',
      800: '#1f2937',
      900: '#111827',
    },
    background: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      tertiary: '#f1f5f9',
      overlay: 'rgba(15, 23, 42, 0.75)',
    },
    surface: {
      primary: '#ffffff',
      secondary: '#f8fafc',
      elevated: '#ffffff',
      border: '#e2e8f0',
    },
    text: {
      primary: '#0f172a',
      secondary: '#475569',
      tertiary: '#94a3b8',
      inverse: '#ffffff',
    },
    success: '#10b981',
    warning: '#f59e0b',
    error: '#ef4444',
    info: '#3b82f6',
  },
  typography: {
    fontFamily: {
      primary: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      secondary: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      mono: '"SF Mono", "Fira Code", "Fira Mono", "Roboto Mono", monospace',
    },
    fontSize: {
      xs: '0.75rem',
      sm: '0.875rem',
      base: '1rem',
      lg: '1.125rem',
      xl: '1.25rem',
      '2xl': '1.5rem',
      '3xl': '1.875rem',
      '4xl': '2.25rem',
    },
    fontWeight: {
      light: 300,
      normal: 400,
      medium: 500,
      semibold: 600,
      bold: 700,
    },
    lineHeight: {
      tight: 1.25,
      normal: 1.5,
      relaxed: 1.75,
    },
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem',
    '4xl': '6rem',
  },
  borderRadius: {
    none: '0',
    sm: '0.25rem',
    md: '0.5rem',
    lg: '0.75rem',
    xl: '1rem',
    '2xl': '1.5rem',
    full: '9999px',
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
  },
  animation: {
    duration: {
      fast: '150ms',
      normal: '250ms',
      slow: '350ms',
    },
    easing: {
      ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
      easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
      easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
      easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    },
  },
  breakpoints: {
    sm: '640px',
    md: '768px',
    lg: '1024px',
    xl: '1280px',
    '2xl': '1536px',
  },
};

export const modernDarkTheme: ThemeConfig = {
  ...modernLightTheme,
  colors: {
    ...modernLightTheme.colors,
    background: {
      primary: '#0f172a',
      secondary: '#1e293b',
      tertiary: '#334155',
      overlay: 'rgba(15, 23, 42, 0.95)',
    },
    surface: {
      primary: '#1e293b',
      secondary: '#334155',
      elevated: '#475569',
      border: '#475569',
    },
    text: {
      primary: '#f8fafc',
      secondary: '#cbd5e1',
      tertiary: '#94a3b8',
      inverse: '#0f172a',
    },
    neutral: {
      50: '#0f172a',
      100: '#1e293b',
      200: '#334155',
      300: '#475569',
      400: '#64748b',
      500: '#94a3b8',
      600: '#cbd5e1',
      700: '#e2e8f0',
      800: '#f1f5f9',
      900: '#f8fafc',
    },
  },
};

export const themeManager = {
  /**
   * 应用主题到CSS变量
   */
  applyTheme: (theme: ThemeConfig, isDark = false): void => {
    const root = document.documentElement;
    
    // 设置主题类型
    root.setAttribute('data-theme', isDark ? 'dark' : 'light');
    
    // 应用颜色变量
    this.applyColorVariables(root, theme.colors);
    
    // 应用字体变量
    this.applyTypographyVariables(root, theme.typography);
    
    // 应用间距变量
    this.applySpacingVariables(root, theme.spacing);
    
    // 应用圆角变量
    this.applyBorderRadiusVariables(root, theme.borderRadius);
    
    // 应用阴影变量
    this.applyShadowVariables(root, theme.shadows);
    
    // 应用动画变量
    this.applyAnimationVariables(root, theme.animation);
    
    // 应用断点变量
    this.applyBreakpointVariables(root, theme.breakpoints);
  },

  applyColorVariables: (element: HTMLElement, colors: ThemeConfig['colors']): void => {
    // 主色调
    Object.entries(colors.primary).forEach(([key, value]) => {
      element.style.setProperty(`--color-primary-${key}`, value);
    });
    
    // 次要色调
    Object.entries(colors.secondary).forEach(([key, value]) => {
      element.style.setProperty(`--color-secondary-${key}`, value);
    });
    
    // 中性色
    Object.entries(colors.neutral).forEach(([key, value]) => {
      element.style.setProperty(`--color-neutral-${key}`, value);
    });
    
    // 背景色
    Object.entries(colors.background).forEach(([key, value]) => {
      element.style.setProperty(`--color-background-${key}`, value);
    });
    
    // 表面色
    Object.entries(colors.surface).forEach(([key, value]) => {
      element.style.setProperty(`--color-surface-${key}`, value);
    });
    
    // 文字色
    Object.entries(colors.text).forEach(([key, value]) => {
      element.style.setProperty(`--color-text-${key}`, value);
    });
    
    // 状态色
    element.style.setProperty('--color-success', colors.success);
    element.style.setProperty('--color-warning', colors.warning);
    element.style.setProperty('--color-error', colors.error);
    element.style.setProperty('--color-info', colors.info);
  },

  applyTypographyVariables: (element: HTMLElement, typography: ThemeConfig['typography']): void => {
    // 字体
    Object.entries(typography.fontFamily).forEach(([key, value]) => {
      element.style.setProperty(`--font-family-${key}`, value);
    });
    
    // 字号
    Object.entries(typography.fontSize).forEach(([key, value]) => {
      element.style.setProperty(`--font-size-${key}`, value);
    });
    
    // 字重
    Object.entries(typography.fontWeight).forEach(([key, value]) => {
      element.style.setProperty(`--font-weight-${key}`, value.toString());
    });
    
    // 行高
    Object.entries(typography.lineHeight).forEach(([key, value]) => {
      element.style.setProperty(`--line-height-${key}`, value.toString());
    });
  },

  applySpacingVariables: (element: HTMLElement, spacing: ThemeConfig['spacing']): void => {
    Object.entries(spacing).forEach(([key, value]) => {
      element.style.setProperty(`--spacing-${key}`, value);
    });
  },

  applyBorderRadiusVariables: (element: HTMLElement, borderRadius: ThemeConfig['borderRadius']): void => {
    Object.entries(borderRadius).forEach(([key, value]) => {
      element.style.setProperty(`--border-radius-${key}`, value);
    });
  },

  applyShadowVariables: (element: HTMLElement, shadows: ThemeConfig['shadows']): void => {
    Object.entries(shadows).forEach(([key, value]) => {
      element.style.setProperty(`--shadow-${key}`, value);
    });
  },

  applyAnimationVariables: (element: HTMLElement, animation: ThemeConfig['animation']): void => {
    // 持续时间
    Object.entries(animation.duration).forEach(([key, value]) => {
      element.style.setProperty(`--animation-duration-${key}`, value);
    });
    
    // 缓动函数
    Object.entries(animation.easing).forEach(([key, value]) => {
      element.style.setProperty(`--animation-easing-${key}`, value);
    });
  },

  applyBreakpointVariables: (element: HTMLElement, breakpoints: ThemeConfig['breakpoints']): void => {
    Object.entries(breakpoints).forEach(([key, value]) => {
      element.style.setProperty(`--breakpoint-${key}`, value);
    });
  },

  /**
   * 切换主题
   */
  toggleTheme: (isDark: boolean): void => {
    const theme = isDark ? modernDarkTheme : modernLightTheme;
    this.applyTheme(theme, isDark);
    
    // 保存主题偏好
    localStorage.setItem('theme-preference', isDark ? 'dark' : 'light');
  },

  /**
   * 初始化主题
   */
  initTheme: (): void => {
    const savedTheme = localStorage.getItem('theme-preference');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const isDark = savedTheme === 'dark' || (!savedTheme && prefersDark);
    
    this.toggleTheme(isDark);
  },
};

// 默认导出现代浅色主题
export default modernLightTheme;