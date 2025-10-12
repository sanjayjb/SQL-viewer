/**
 * Global state management using Svelte 5 runes
 * Provides reactive stores for query tabs, results, and application state
 */

import { browser } from '$app/environment';
import { type QueryResult, type QueryTab, generateId, storage } from './utils/index.js';

/**
 * Query tabs state management using modern Svelte 5 runes
 */
function createQueryTabsStore() {
	// Svelte 5 runes for reactive state - initialize with empty state for SSR
	let tabs = $state<QueryTab[]>([]);
	let activeTabId = $state<string>('');

	// Initialize from SSR data (server-side only)
	function initializeSSR(initialTabs: QueryTab[], initialActiveId: string): void {
		if (browser) return; // Only for server-side
		tabs = initialTabs.map(tab => ({
			...tab,
			isActive: tab.id === initialActiveId,
			isSaved: true
		}));
		activeTabId = initialActiveId;
	}

	// Initialize from storage (called manually to avoid SSR issues)
	function initialize() {
		if (!browser) return;
		
		// Don't reinitialize if we already have tabs from SSR
		if (tabs.length > 0) {
			// Just load preferences from storage and sync
			const savedTabs = storage.get<QueryTab[]>('query-tabs', []);
			const savedActiveId = storage.get<string>('active-tab-id', '');
			
			if (savedTabs.length > 0) {
				tabs = savedTabs;
				activeTabId = savedActiveId || savedTabs[0]?.id || '';
			}
			return;
		}
		
		const savedTabs = storage.get<QueryTab[]>('query-tabs', []);
		const savedActiveId = storage.get<string>('active-tab-id', '');
		
		if (savedTabs.length === 0) {
			// Create default tab if none exist
			const defaultQuery = 'SELECT * FROM orders LIMIT 20';
			const defaultId = createTab('Sample Query', defaultQuery);
			activeTabId = defaultId;
		} else {
			tabs = savedTabs;
			activeTabId = savedActiveId || savedTabs[0]?.id || '';
		}
	}

	// Derived state using getters
	function getActiveTab() {
		return tabs.find(tab => tab.id === activeTabId) || null;
	}

	function getHasUnsavedChanges() {
		return tabs.some(tab => tab.hasChanges);
	}

	/**
	 * Creates a new query tab
	 */
	function createTab(name?: string, initialQuery?: string): string {
		const id = generateId();
		const newTab: QueryTab = {
			id,
			name: name || `Query ${tabs.length + 1}`,
			query: initialQuery || '',
			isActive: false,
			isSaved: false,
			hasChanges: false
		};

		tabs = [...tabs, newTab];
		setActiveTab(id);
		saveToStorage();
		return id;
	}

	/**
	 * Updates a tab's query content
	 */
	function updateTabQuery(tabId: string, query: string): void {
		tabs = tabs.map(tab => 
			tab.id === tabId 
				? { ...tab, query, hasChanges: !tab.isSaved || query !== '' }
				: tab
		);
		saveToStorage();
	}

	/**
	 * Updates a tab's name
	 */
	function updateTabName(tabId: string, name: string): void {
		tabs = tabs.map(tab => 
			tab.id === tabId 
				? { ...tab, name, hasChanges: true }
				: tab
		);
		saveToStorage();
	}

	/**
	 * Sets the active tab
	 */
	function setActiveTab(tabId: string): void {
		tabs = tabs.map(tab => ({ ...tab, isActive: tab.id === tabId }));
		activeTabId = tabId;
		saveToStorage();
	}

	/**
	 * Closes a tab
	 */
	function closeTab(tabId: string): void {
		const tabIndex = tabs.findIndex(t => t.id === tabId);
		if (tabIndex === -1) return;

		const wasActive = tabs[tabIndex].isActive;
		tabs = tabs.filter(tab => tab.id !== tabId);

		// If we closed the active tab, activate another one
		if (wasActive && tabs.length > 0) {
			const newActiveIndex = Math.min(tabIndex, tabs.length - 1);
			setActiveTab(tabs[newActiveIndex].id);
		} else if (tabs.length === 0) {
			createDefaultTab();
		}

		saveToStorage();
	}

	/**
	 * Marks a tab as saved
	 */
	function markTabAsSaved(tabId: string): void {
		tabs = tabs.map(tab => 
			tab.id === tabId 
				? { ...tab, isSaved: true, hasChanges: false }
				: tab
		);
		saveToStorage();
	}

	/**
	 * Duplicates a tab
	 */
	function duplicateTab(tabId: string): string {
		const sourceTab = tabs.find(t => t.id === tabId);
		if (!sourceTab) return '';

		const newId = generateId();
		const newTab: QueryTab = {
			...sourceTab,
			id: newId,
			name: `${sourceTab.name} (Copy)`,
			isActive: false,
			hasChanges: true
		};

		tabs = [...tabs, newTab];
		setActiveTab(newId);
		saveToStorage();
		return newId;
	}

	/**
	 * Creates a default tab
	 */
	function createDefaultTab(): string {
		const defaultQuery = 'SELECT * FROM orders LIMIT 20';
		return createTab('Sample Query', defaultQuery);
	}

	/**
	 * Reorders tabs
	 */
	function reorderTabs(fromIndex: number, toIndex: number): void {
		const newTabs = [...tabs];
		const [movedTab] = newTabs.splice(fromIndex, 1);
		newTabs.splice(toIndex, 0, movedTab);
		tabs = newTabs;
		saveToStorage();
	}

	/**
	 * Saves state to localStorage
	 */
	function saveToStorage(): void {
		if (!browser) return;
		storage.set('query-tabs', tabs);
		storage.set('active-tab-id', activeTabId);
	}

	return {
		// State
		get tabs() { return tabs; },
		get activeTabId() { return activeTabId; },
		get activeTab() { return getActiveTab(); },
		get hasUnsavedChanges() { return getHasUnsavedChanges(); },
		
		// Actions
		initialize,
		initializeSSR,
		createTab,
		updateTabQuery,
		updateTabName,
		setActiveTab,
		closeTab,
		markTabAsSaved,
		duplicateTab,
		createDefaultTab,
		reorderTabs
	};
}

/**
 * Query results state management using modern Svelte 5 runes
 */
function createQueryResultsStore() {
	let results = $state<Map<string, QueryResult>>(new Map());
	let isExecuting = $state<boolean>(false);
	let currentQueryId = $state<string>('');
	let currentResult = $state<QueryResult | null>(null);

	function initialize() {
		if (!browser) return;
		
		const savedResults = storage.get<Array<[string, QueryResult]>>('query-results', []);
		results = new Map(savedResults);
	}

	function getResult(tabId: string) {
		return results.get(tabId) || null;
	}

	function getIsExecuting() {
		return isExecuting;
	}

	function getCurrentQueryId() {
		return currentQueryId;
	}

	function getCurrentResult() {
		return currentResult;
	}

	function setCurrentResult(result: QueryResult | null): void {
		currentResult = result;
	}

	function getHistory() {
		return Array.from(results.values()).sort((a, b) => 
			new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
		);
	}

	async function executeQuery(tabId: string, query: string): Promise<void> {
		if (!query.trim()) return;

		isExecuting = true;
		currentQueryId = tabId;

		try {
			// Import executeQuery from utils
			const { executeQuery: utilExecuteQuery } = await import('./utils/index.js');
			const result = await utilExecuteQuery(query);
			
			results.set(tabId, result);
			currentResult = result;
			results = new Map(results); // Trigger reactivity
			saveToStorage();
		} catch (error) {
			console.error('Query execution failed:', error);
			const errorResult: QueryResult = {
				id: generateId(),
				name: 'Error',
				query,
				data: [],
				executionTime: 0,
				rowCount: 0,
				status: 'error',
				timestamp: new Date()
			};
			results.set(tabId, errorResult);
			currentResult = errorResult;
			results = new Map(results); // Trigger reactivity
		} finally {
			isExecuting = false;
			currentQueryId = '';
		}
	}

	function clearResult(tabId: string): void {
		results.delete(tabId);
		results = new Map(results); // Trigger reactivity
		saveToStorage();
	}

	function clearAllResults(): void {
		results.clear();
		results = new Map(results); // Trigger reactivity
		saveToStorage();
	}

	function saveToStorage(): void {
		if (!browser) return;
		storage.set('query-results', Array.from(results.entries()));
	}

	return {
		// State
		get results() { return results; },
		get isExecuting() { return isExecuting; },
		get currentQueryId() { return currentQueryId; },
		get currentResult() { return currentResult; },
		get history() { return getHistory(); },
		
		// Actions
		initialize,
		getResult,
		setCurrentResult,
		executeQuery,
		clearResult,
		clearAllResults
	};
}

/**
 * Application settings state management using modern Svelte 5 runes
 */
function createSettingsStore() {
	let theme = $state<'light' | 'dark'>('light');
	let fontSize = $state<number>(14);
	let autoSave = $state<boolean>(true);
	let showLineNumbers = $state<boolean>(true);
	let wordWrap = $state<boolean>(false);

	function initialize() {
		if (!browser) return;
		
		// Get the theme that was already set by the inline script to prevent flicker
		const currentTheme = document.documentElement.getAttribute('data-theme') as 'light' | 'dark' || 'light';
		
		const savedSettings = storage.get('app-settings', {}) as any;
		theme = savedSettings.theme || currentTheme;
		fontSize = savedSettings.fontSize || 14;
		autoSave = savedSettings.autoSave ?? true;
		showLineNumbers = savedSettings.showLineNumbers ?? true;
		wordWrap = savedSettings.wordWrap ?? false;
		
		// Ensure theme is applied (should already be set by inline script)
		applyTheme();
	}

	function initializeSSR(initialTheme: 'light' | 'dark' = 'light') {
		if (browser) return; // Only for server-side
		theme = initialTheme;
	}

	function applyTheme(): void {
		if (!browser) return;
		document.documentElement.setAttribute('data-theme', theme);
	}

	function setTheme(newTheme: 'light' | 'dark'): void {
		theme = newTheme;
		applyTheme();
		saveToStorage();
	}

	function setFontSize(size: number): void {
		fontSize = Math.max(10, Math.min(24, size));
		saveToStorage();
	}

	function setAutoSave(enabled: boolean): void {
		autoSave = enabled;
		saveToStorage();
	}

	function setShowLineNumbers(show: boolean): void {
		showLineNumbers = show;
		saveToStorage();
	}

	function setWordWrap(wrap: boolean): void {
		wordWrap = wrap;
		saveToStorage();
	}

	function toggleTheme(): void {
		setTheme(theme === 'light' ? 'dark' : 'light');
	}

	function saveToStorage(): void {
		if (!browser) return;
		storage.set('app-settings', {
			theme,
			fontSize,
			autoSave,
			showLineNumbers,
			wordWrap
		});
	}

	return {
		// State
		get theme() { return theme; },
		get fontSize() { return fontSize; },
		get autoSave() { return autoSave; },
		get showLineNumbers() { return showLineNumbers; },
		get wordWrap() { return wordWrap; },
		
		// Actions
		initialize,
		initializeSSR,
		setTheme,
		setFontSize,
		setAutoSave,
		setShowLineNumbers,
		setWordWrap,
		toggleTheme
	};
}

// Create and export store instances
export const queryTabsStore = createQueryTabsStore();
export const queryResultsStore = createQueryResultsStore();
export const settingsStore = createSettingsStore();
