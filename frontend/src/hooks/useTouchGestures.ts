import { useState, useEffect, useRef } from 'react';

interface TouchGesture {
  type: 'tap' | 'doubleTap' | 'longPress' | 'swipe' | 'pinch' | 'rotate';
  timestamp: number;
  distance?: number;
  direction?: 'up' | 'down' | 'left' | 'right';
  scale?: number;
  rotation?: number;
  position: { x: number; y: number };
}

interface TouchGesturesOptions {
  onTap?: (gesture: TouchGesture) => void;
  onDoubleTap?: (gesture: TouchGesture) => void;
  onLongPress?: (gesture: TouchGesture) => void;
  onSwipe?: (gesture: TouchGesture) => void;
  onPinch?: (gesture: TouchGesture) => void;
  onRotate?: (gesture: TouchGesture) => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
}

export const useTouchGestures = (options: TouchGesturesOptions = {}) => {
  const {
    onTap,
    onDoubleTap,
    onLongPress,
    onSwipe,
    onPinch,
    onRotate,
    swipeThreshold = 50,
    longPressDelay = 500,
    doubleTapDelay = 300
  } = options;

  const [isTracking, setIsTracking] = useState(false);
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const lastTapRef = useRef<{ time: number } | null>(null);
  const touchesRef = useRef<TouchList | null>(null);
  const initialDistanceRef = useRef<number>(0);
  const initialAngleRef = useRef<number>(0);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    
    const touch = e.touches[0];
    if (!touch) return;

    const currentTime = Date.now();
    const position = { x: touch.clientX, y: touch.clientY };

    touchStartRef.current = {
      ...position,
      time: currentTime
    };

    // 检查双击
    if (lastTapRef.current && currentTime - lastTapRef.current.time < doubleTapDelay) {
      const gesture: TouchGesture = {
        type: 'doubleTap',
        timestamp: currentTime,
        position
      };
      onDoubleTap?.(gesture);
      lastTapRef.current = null;
      return;
    }

    setIsTracking(true);
    
    // 设置长按定时器
    longPressTimerRef.current = setTimeout(() => {
      const gesture: TouchGesture = {
        type: 'longPress',
        timestamp: currentTime,
        position
      };
      onLongPress?.(gesture);
    }, longPressDelay);

    // 处理多点触控（缩放和旋转）
    const touches = e.touches as any;
    if (touches.length === 2) {
      touchesRef.current = touches;
      const touch1 = touches[0];
      const touch2 = touches[1];
      
      initialDistanceRef.current = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      initialAngleRef.current = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();

    const touch = e.touches[0];
    if (!touch || !touchStartRef.current) return;

    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 处理缩放
    if (e.touches.length === 2 && touchesRef.current) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      
      const currentDistance = Math.hypot(
        touch2.clientX - touch1.clientX,
        touch2.clientY - touch1.clientY
      );
      
      const scale = currentDistance / initialDistanceRef.current;
      
      if (Math.abs(scale - 1) > 0.1) {
        const gesture: TouchGesture = {
          type: 'pinch',
          timestamp: Date.now(),
          scale,
          position: {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          }
        };
        onPinch?.(gesture);
      }

      // 处理旋转
      const currentAngle = Math.atan2(
        touch2.clientY - touch1.clientY,
        touch2.clientX - touch1.clientX
      ) * 180 / Math.PI;
      
      const rotation = currentAngle - initialAngleRef.current;
      
      if (Math.abs(rotation) > 5) {
        const gesture: TouchGesture = {
          type: 'rotate',
          timestamp: Date.now(),
          rotation,
          position: {
            x: (touch1.clientX + touch2.clientX) / 2,
            y: (touch1.clientY + touch2.clientY) / 2
          }
        };
        onRotate?.(gesture);
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    
    const touch = e.changedTouches[0];
    if (!touch || !touchStartRef.current) return;

    const currentTime = Date.now();
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const deltaTime = currentTime - touchStartRef.current.time;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // 清除长按定时器
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // 检查滑动
    if (distance > swipeThreshold && deltaTime < 1000) {
      let direction: 'up' | 'down' | 'left' | 'right';
      
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        direction = deltaX > 0 ? 'right' : 'left';
      } else {
        direction = deltaY > 0 ? 'down' : 'up';
      }

      const gesture: TouchGesture = {
        type: 'swipe',
        timestamp: currentTime,
        distance,
        direction,
        position: { x: touch.clientX, y: touch.clientY }
      };
      onSwipe?.(gesture);
    } 
    // 检查点击（非滑动）
    else if (distance < 10 && deltaTime < 200) {
      const gesture: TouchGesture = {
        type: 'tap',
        timestamp: currentTime,
        position: { x: touch.clientX, y: touch.clientY }
      };
      onTap?.(gesture);
      
      lastTapRef.current = { time: currentTime };
    }

    setIsTracking(false);
    touchStartRef.current = null;
    touchesRef.current = null;
  };

  return {
    isTracking,
    handlers: {
      onTouchStart: handleTouchStart,
      onTouchMove: handleTouchMove,
      onTouchEnd: handleTouchEnd
    }
  };
};

/**
 * 简化的触摸手势Hook
 */
export const useSimpleTouchGestures = () => {
  const [gesture, setGesture] = useState<string | null>(null);

  const handlers = {
    onTouchStart: () => setGesture('touch-start'),
    onTouchMove: () => setGesture('touch-move'),
    onTouchEnd: () => {
      setGesture('touch-end');
      setTimeout(() => setGesture(null), 100);
    }
  };

  return { gesture, handlers };
};