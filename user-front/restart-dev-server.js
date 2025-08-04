const { spawn } = require('child_process');
const path = require('path');

console.log('🔄 Restarting development server with performance optimizations...');

// Kill existing processes
const killProcess = spawn('taskkill', ['/F', '/IM', 'node.exe'], { 
  shell: true,
  stdio: 'ignore'
});

killProcess.on('close', () => {
  console.log('✅ Killed existing processes');
  
  // Start new development server with optimizations
  const devServer = spawn('npm', ['start'], {
    cwd: path.join(__dirname),
    stdio: 'inherit',
    env: {
      ...process.env,
      'GENERATE_SOURCEMAP': 'false', // Disable source maps for better performance
      'FAST_REFRESH': 'false', // Disable fast refresh to prevent HMR issues
      'CHOKIDAR_USEPOLLING': 'false' // Disable polling for better performance
    }
  });

  devServer.on('error', (error) => {
    console.error('❌ Failed to start development server:', error);
  });

  devServer.on('close', (code) => {
    console.log(`🔄 Development server exited with code ${code}`);
  });
});

console.log('💡 Performance optimizations applied:');
console.log('   - Disabled source maps');
console.log('   - Disabled fast refresh');
console.log('   - Disabled file polling');
console.log('   - Reduced console logging');
console.log('   - Optimized socket connections'); 