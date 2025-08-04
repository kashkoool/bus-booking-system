import { useEffect } from 'react';

const PerformanceMonitor = () => {
  useEffect(() => {
    // Only run in development and if explicitly enabled
    if (process.env.NODE_ENV !== 'development' || !process.env.REACT_APP_ENABLE_PERFORMANCE_MONITOR) {
      return;
    }

    // Monitor Core Web Vitals
    if ('PerformanceObserver' in window) {
      // Monitor Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        
        if (lastEntry.startTime > 2500) {
          console.warn('⚠️ LCP is too slow:', lastEntry.startTime);
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

      // Monitor First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          const delay = entry.processingStart - entry.startTime;
          if (delay > 100) {
            console.warn('⚠️ FID is too slow:', delay);
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });

      // Monitor Cumulative Layout Shift (CLS)
      let clsValue = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
            
            if (clsValue > 0.1) {
              console.warn('⚠️ CLS is too high:', clsValue);
            }
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
    }

    // Monitor API response times
    const originalFetch = window.fetch;
    window.fetch = function(...args) {
      const startTime = performance.now();
      return originalFetch.apply(this, args).then((response) => {
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        if (duration > 1000) {
          console.warn('⚠️ Slow API call:', args[0], duration + 'ms');
        }
        
        return response;
      });
    };

    // Monitor excessive React renders (only log if too frequent)
    let renderCount = 0;
    let lastRenderTime = Date.now();
    
    const originalConsoleLog = console.log;
    console.log = function(...args) {
      if (args[0] && typeof args[0] === 'string' && args[0].includes('render')) {
        renderCount++;
        const now = Date.now();
        const timeSinceLastRender = now - lastRenderTime;
        
        // Only warn if renders are happening too frequently
        if (timeSinceLastRender < 100 && renderCount > 10) {
          console.warn('⚠️ Excessive React renders detected:', renderCount, 'in', timeSinceLastRender, 'ms');
          renderCount = 0;
        }
        
        lastRenderTime = now;
      }
      originalConsoleLog.apply(console, args);
    };
  }, []);

  return null; // This component doesn't render anything
};

export default PerformanceMonitor; 