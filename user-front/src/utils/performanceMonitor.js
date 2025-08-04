// Performance monitoring utility for the booking system
class PerformanceMonitor {
  constructor() {
    this.apiCallCount = new Map();
    this.renderCount = new Map();
    this.lastLogTime = 0;
    this.logThrottle = 10000; // Log every 10 seconds
    this.warnings = new Set();
    this.enabled = false; // Disable performance monitoring temporarily
  }

  // Track API calls
  trackApiCall(endpoint) {
    if (!this.enabled) return;
    
    const count = this.apiCallCount.get(endpoint) || 0;
    this.apiCallCount.set(endpoint, count + 1);
    
    // Warn if too many calls to the same endpoint
    if (count > 10) {
      this.warnings.add(`Excessive API calls to ${endpoint}: ${count} calls`);
    }
    
    this.logPerformance();
  }

  // Track component renders
  trackRender(componentName) {
    if (!this.enabled) return;
    
    const count = this.renderCount.get(componentName) || 0;
    this.renderCount.set(componentName, count + 1);
    
    // Warn if too many renders
    if (count > 50) {
      this.warnings.add(`Excessive renders for ${componentName}: ${count} renders`);
    }
    
    this.logPerformance();
  }

  // Log performance metrics
  logPerformance() {
    if (!this.enabled) return;
    
    const now = Date.now();
    if (now - this.lastLogTime < this.logThrottle) {
      return;
    }
    
    this.lastLogTime = now;
    
    console.group('🚀 Performance Monitor');
    
    // Log API call counts
    if (this.apiCallCount.size > 0) {
      console.log('📡 API Calls:');
      this.apiCallCount.forEach((count, endpoint) => {
        console.log(`  ${endpoint}: ${count} calls`);
      });
    }
    
    // Log render counts
    if (this.renderCount.size > 0) {
      console.log('🎨 Component Renders:');
      this.renderCount.forEach((count, component) => {
        console.log(`  ${component}: ${count} renders`);
      });
    }
    
    // Log warnings
    if (this.warnings.size > 0) {
      console.warn('⚠️ Performance Warnings:');
      this.warnings.forEach(warning => {
        console.warn(`  ${warning}`);
      });
    }
    
    console.groupEnd();
    
    // Clear counts after logging
    this.apiCallCount.clear();
    this.renderCount.clear();
    this.warnings.clear();
  }

  // Reset all counters
  reset() {
    this.apiCallCount.clear();
    this.renderCount.clear();
    this.warnings.clear();
    this.lastLogTime = 0;
  }

  // Get current metrics
  getMetrics() {
    return {
      apiCalls: Object.fromEntries(this.apiCallCount),
      renders: Object.fromEntries(this.renderCount),
      warnings: Array.from(this.warnings)
    };
  }

  // Enable/disable performance monitoring
  setEnabled(enabled) {
    this.enabled = enabled;
  }
}

// Create singleton instance
const performanceMonitor = new PerformanceMonitor();

// Export for use in components
export default performanceMonitor;

// Auto-log performance every 30 seconds in development (disabled)
// if (process.env.NODE_ENV === 'development') {
//   setInterval(() => {
//     performanceMonitor.logPerformance();
//   }, 30000);
// } 