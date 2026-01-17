import { useState, useEffect } from 'react';

interface MobileDetectionResult {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  screenWidth: number;
  screenHeight: number;
  orientation: 'portrait' | 'landscape';
  deviceInfo: {
    userAgent: string;
    vendor: string;
    model: string;
    platform: string;
  };
  capabilities: {
    touchSupport: boolean;
    multiTouch: boolean;
    devicePixelRatio: number;
  };
}

export const useMobileDetection = (): MobileDetectionResult => {
  const [deviceInfo, setDeviceInfo] = useState<MobileDetectionResult>({
    isMobile: false,
    isTablet: false,
    isDesktop: true,
    screenWidth: 1920,
    screenHeight: 1080,
    orientation: 'landscape',
    deviceInfo: {
      userAgent: '',
      vendor: '',
      model: '',
      platform: ''
    },
    capabilities: {
      touchSupport: false,
      multiTouch: false,
      devicePixelRatio: 1
    }
  });

  useEffect(() => {
    const updateDeviceInfo = () => {
      const ua = navigator.userAgent;
      const width = window.innerWidth;
      const height = window.innerHeight;
      
      // 设备检测
      const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua) && width < 768;
      const isTablet = /iPad|Android(?!.*Mobile)|Tablet/i.test(ua) || (width >= 768 && width < 1024);
      const isDesktop = !isMobile && !isTablet;
      
      // 屏幕方向
      const orientation = width > height ? 'landscape' : 'portrait';
      
      // 设备信息
      const vendor = navigator.vendor || 'Unknown';
      const platform = navigator.platform || 'Unknown';
      const model = getDeviceModel(ua);
      
      // 能力检测
      const touchSupport = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const multiTouch = navigator.maxTouchPoints > 1;
      const devicePixelRatio = window.devicePixelRatio || 1;
      
      setDeviceInfo({
        isMobile,
        isTablet,
        isDesktop,
        screenWidth: width,
        screenHeight: height,
        orientation,
        deviceInfo: {
          userAgent: ua,
          vendor,
          model,
          platform
        },
        capabilities: {
          touchSupport,
          multiTouch,
          devicePixelRatio
        }
      });
    };

    // 初始检测
    updateDeviceInfo();

    // 监听窗口变化
    window.addEventListener('resize', updateDeviceInfo);
    window.addEventListener('orientationchange', updateDeviceInfo);

    // 清理监听器
    return () => {
      window.removeEventListener('resize', updateDeviceInfo);
      window.removeEventListener('orientationchange', updateDeviceInfo);
    };
  }, []);

  const getDeviceModel = (ua: string): string => {
    const models: Record<string, string> = {
      'iPhone': 'iPhone',
      'iPad': 'iPad',
      'Android': 'Android Device',
      'Windows Phone': 'Windows Phone',
      'BlackBerry': 'BlackBerry',
      'Mac': 'Mac',
      'Windows': 'Windows',
      'Linux': 'Linux'
    };

    for (const [key, value] of Object.entries(models)) {
      if (ua.includes(key)) {
        return value;
      }
    }

    return 'Unknown';
  };

  return deviceInfo;
};