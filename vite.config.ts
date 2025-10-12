import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [sveltekit()],
	build: {
		// Use Terser for maximum minification in production
		minify: 'terser',
		
		// Terser options for aggressive minification
		terserOptions: {
			compress: {
				// Remove console.log statements in production
				drop_console: true,
				// Remove debugger statements
				drop_debugger: true,
				// Remove unused functions
				unused: true,
				// Remove dead code
				dead_code: true,
				// Use shorter variable names
				passes: 2
			},
			mangle: {
				// Mangle all variable names for smaller output
				toplevel: true,
				// Keep function names for better debugging if needed
				keep_fnames: false
			},
			format: {
				// Remove all comments
				comments: false
			}
		},
		
		// Additional build optimizations
		cssMinify: true,
		
		// Target modern browsers for smaller output
		target: 'es2020',
		
		// Disable source maps for smaller production builds
		sourcemap: false,
		
		// Additional compression settings
		reportCompressedSize: true,
		chunkSizeWarningLimit: 500 // Warn for chunks larger than 500kb
	},
	
	// Optimize dependency pre-bundling
	optimizeDeps: {
		include: ['svelte']
	}
});
