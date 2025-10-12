import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	// Try to detect theme preference from headers or default to system preference
	// Since we can't access localStorage on server, we'll default to 'light' 
	// and let the client-side script handle the actual preference
	const initialTheme = 'light';
	
	// Provide initial state for SSR
	return {
		initialTabs: [
			{
				id: 'default-tab',
				name: 'Sample Query',
				query: 'SELECT * FROM orders LIMIT 20',
				hasChanges: false,
				isExecuting: false,
				lastModified: new Date()
			}
		],
		activeTabId: 'default-tab',
		sidebarWidth: 320,
		editorHeight: 50,
		initialTheme
	};
};
