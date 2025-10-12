<!--
  QueryEditor Component
  Main SQL query input area with syntax highlighting and execution controls
  Optimized for performance with debounced input handling
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { queryTabsStore, queryResultsStore } from '$lib/stores.svelte';
	import { debounce, executeQuery } from '$lib/utils/index.js';

	// Reactive store values
	$: activeTab = queryTabsStore.activeTab;
	$: isExecuting = queryResultsStore.isExecuting;
	$: currentTabResult = activeTab ? queryResultsStore.getResult(activeTab.id) : null;

	// Update current result when active tab changes
	$: if (activeTab) {
		const tabResult = queryResultsStore.getResult(activeTab.id);
		queryResultsStore.setCurrentResult(tabResult);
		queryInput = activeTab.query;
	}

	// Local state
	let queryInput = '';
	let showExamplesDropdown = false;
	let dropdownButtonRef: HTMLButtonElement;
	let dropdownPosition = { top: 0, left: 0, right: 0 };

	// Debounced auto-save
	const debouncedUpdate = debounce((query: string) => {
		if (activeTab) {
			queryTabsStore.updateTabQuery(activeTab.id, query);
		}
	}, 300);

	// Update local state when active tab changes
	$: if (activeTab) {
		queryInput = activeTab.query;
	}

	/**
	 * Handles query input changes with debounced updates
	 */
	function handleQueryInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		queryInput = target.value;
		debouncedUpdate(queryInput);
	}

	/**
	 * Executes the current query
	 */
	async function runQuery() {
		// Try to get activeTab from store directly if local reactive value is null
		const currentActiveTab = activeTab || queryTabsStore.activeTab;
		
		if (!currentActiveTab || !queryInput.trim()) {
			return;
		}

		try {
			await queryResultsStore.executeQuery(currentActiveTab.id, queryInput);
			queryTabsStore.markTabAsSaved(currentActiveTab.id);
		} catch (error) {
			console.error('Query execution failed:', error);
		}
	}

	/**
	 * Saves the current query
	 */
	function saveQuery() {
		if (!activeTab) return;
		queryTabsStore.markTabAsSaved(activeTab.id);
		// In a real app, you might save to a backend here
	}

	/**
	 * Clears the query editor
	 */
	function clearEditor() {
		if (!activeTab) return;
		
		const confirmClear = confirm('Are you sure you want to clear the query?');
		if (confirmClear) {
			queryInput = '';
			queryTabsStore.updateTabQuery(activeTab.id, '');
		}
	}

	/**
	 * Sample queries for the orders dataset
	 */
	const sampleQueries = [
		{
			name: 'All Orders',
			query: `SELECT * FROM orders LIMIT 200`
		},
		{
			name: 'All Orders (No Limit)',
			query: `SELECT * FROM orders`
		},
		{
			name: 'Orders by Country',
			query: `SELECT orderID, customerID, orderDate, shipCountry, freight
FROM orders 
WHERE shipCountry = 'France'
ORDER BY freight DESC
LIMIT 50`
		},
		{
			name: 'High Value Orders',
			query: `SELECT orderID, customerID, shipName, freight, shipCountry
FROM orders 
WHERE freight > 100
ORDER BY freight DESC
LIMIT 50`
		},
		{
			name: 'Recent Orders',
			query: `SELECT orderID, customerID, orderDate, shipName, shipCity, shipCountry
FROM orders 
ORDER BY orderDate DESC
LIMIT 100`
		},
		{
			name: 'Orders by Employee',
			query: `SELECT orderID, customerID, employeeID, orderDate, freight
FROM orders
WHERE employeeID = 5
ORDER BY orderDate DESC
LIMIT 50`
		}
	];

	/**
	 * Inserts a sample query into the editor
	 */
	function insertSampleQuery(query: string) {
		if (!activeTab) {
			// If no active tab, create a new one
			queryTabsStore.createTab('Sample Query', query);
		} else {
			queryTabsStore.updateTabQuery(activeTab.id, query);
		}
		
		queryInput = query;
		showExamplesDropdown = false;
	}

	/**
	 * Toggles the examples dropdown
	 */
	function toggleExamplesDropdown() {
		showExamplesDropdown = !showExamplesDropdown;
		
		if (showExamplesDropdown && dropdownButtonRef) {
			const rect = dropdownButtonRef.getBoundingClientRect();
			const scrollX = window.scrollX || window.pageXOffset;
			const scrollY = window.scrollY || window.pageYOffset;
			
			dropdownPosition = {
				top: rect.top + scrollY,
				left: rect.left + scrollX,
				right: window.innerWidth - (rect.right + scrollX)
			};
		}
	}

	// Add document click listener for dropdown
	onMount(() => {
		function handleDocumentClick(event: MouseEvent) {
			const target = event.target as HTMLElement;
			const dropdown = target.closest('.dropdown');
			
			if (!dropdown && showExamplesDropdown) {
				showExamplesDropdown = false;
			}
		}

		function handleEscapeKey(event: KeyboardEvent) {
			if (event.key === 'Escape' && showExamplesDropdown) {
				showExamplesDropdown = false;
			}
		}

		document.addEventListener('click', handleDocumentClick);
		document.addEventListener('keydown', handleEscapeKey);
		
		return () => {
			document.removeEventListener('click', handleDocumentClick);
			document.removeEventListener('keydown', handleEscapeKey);
		};
	});

	/**
	 * Handles keyboard shortcuts
	 */
	function handleKeydown(event: KeyboardEvent) {
		// Ctrl/Cmd + Enter to run query
		if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
			event.preventDefault();
			runQuery();
		}
		
		// Ctrl/Cmd + S to save
		if ((event.ctrlKey || event.metaKey) && event.key === 's') {
			event.preventDefault();
			saveQuery();
		}
	}

	/**
	 * Formats the query with basic SQL formatting
	 */
	function formatQuery() {
		if (!queryInput.trim()) return;
		
		// Basic SQL formatting (in a real app, you'd use a proper SQL formatter)
		const formatted = queryInput
			.replace(/\bSELECT\b/gi, 'SELECT')
			.replace(/\bFROM\b/gi, '\nFROM')
			.replace(/\bWHERE\b/gi, '\nWHERE')
			.replace(/\bORDER BY\b/gi, '\nORDER BY')
			.replace(/\bGROUP BY\b/gi, '\nGROUP BY')
			.replace(/\bHAVING\b/gi, '\nHAVING')
			.replace(/\bJOIN\b/gi, '\nJOIN')
			.replace(/\bLEFT JOIN\b/gi, '\nLEFT JOIN')
			.replace(/\bRIGHT JOIN\b/gi, '\nRIGHT JOIN')
			.replace(/\bINNER JOIN\b/gi, '\nINNER JOIN')
			.replace(/\bAND\b/gi, '\n  AND')
			.replace(/\bOR\b/gi, '\n  OR');
		
		queryInput = formatted;
		if (activeTab) {
			queryTabsStore.updateTabQuery(activeTab.id, formatted);
		}
	}
</script>

<div class="query-editor">
	<div class="query-input-area">
		<textarea
			class="query-textarea"
			bind:value={queryInput}
			oninput={handleQueryInput}
			onkeydown={handleKeydown}
			placeholder="Enter your SQL query here...

Examples:
• SELECT * FROM customers LIMIT 10;
• SELECT name, email FROM users WHERE active = true;
• SELECT COUNT(*) FROM orders WHERE date > '2024-01-01';

Press Ctrl+Enter to run query
Press Ctrl+S to save"
			aria-label="SQL Query Editor"
			spellcheck="false"
			autocomplete="off"
			autocapitalize="off"
		></textarea>
	</div>

	<div class="query-actions">
		<div class="query-actions-left">
			<button
				class="btn btn-primary"
				onclick={runQuery}
				disabled={!queryInput.trim() || isExecuting}
				title="Run query (Ctrl+Enter)"
			>
				{#if isExecuting}
					<div class="spinner"></div>
					Running...
				{:else}
					<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polygon points="5,3 19,12 5,21 5,3"></polygon>
					</svg>
					Run Query
				{/if}
			</button>

			<button
				class="btn"
				onclick={saveQuery}
				disabled={!activeTab?.hasChanges}
				title="Save query (Ctrl+S)"
			>
				<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
					<polyline points="17,21 17,13 7,13 7,21"></polyline>
					<polyline points="7,3 7,8 15,8"></polyline>
				</svg>
				Save Query
			</button>

			<button
				class="btn"
				onclick={formatQuery}
				disabled={!queryInput.trim()}
				title="Format SQL"
			>
				<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="4,7 4,4 20,4 20,7"></polyline>
					<line x1="9" y1="20" x2="15" y2="20"></line>
					<line x1="12" y1="4" x2="12" y2="20"></line>
				</svg>
				Format
			</button>
		</div>

		<div class="query-actions-right">
			<!-- Sample queries dropdown -->
			<div class="dropdown">
				<button 
					bind:this={dropdownButtonRef}
					class="btn btn-sm" 
					class:active={showExamplesDropdown}
					onclick={toggleExamplesDropdown}
					title="Load sample query"
				>
					<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
						<polyline points="14,2 14,8 20,8"></polyline>
						<line x1="16" y1="13" x2="8" y2="13"></line>
						<line x1="16" y1="17" x2="8" y2="17"></line>
						<polyline points="10,9 9,9 8,9"></polyline>
					</svg>
					Examples
				</button>
				
				{#if showExamplesDropdown}
					<!-- Placeholder for positioning -->
				{/if}
			</div>

			<button
				class="btn btn-sm"
				onclick={clearEditor}
				disabled={!queryInput.trim()}
				title="Clear editor"
			>
				<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polyline points="3,6 5,6 21,6"></polyline>
					<path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"></path>
				</svg>
				Clear
			</button>
		</div>
	</div>
</div>

<!-- Dropdown portal - positioned outside container hierarchy -->
{#if showExamplesDropdown}
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<div 
		class="dropdown-portal" 
		style="top: {dropdownPosition.top - 8}px; right: {dropdownPosition.right}px;"
		onclick={(e) => e.stopPropagation()}
	>
		<div class="dropdown-header">
			<h3>Example Queries</h3>
			<button class="close-btn" onclick={() => showExamplesDropdown = false} aria-label="Close">×</button>
		</div>
		{#each sampleQueries as sample}
			<button
				class="dropdown-item"
				onclick={() => insertSampleQuery(sample.query)}
			>
				{sample.name}
			</button>
		{/each}
	</div>
{/if}

<style>
	.query-input-area {
		position: relative;
		flex: 1;
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.query-textarea {
		flex: 1;
		width: 100%;
		padding: var(--space-4);
		border: none;
		background-color: var(--color-bg-elevated);
		color: var(--color-text-primary);
		font-family: var(--font-family-mono);
		font-size: 14px;
		line-height: var(--line-height-relaxed);
		resize: none;
		outline: none;
		tab-size: 2;
		white-space: pre;
		overflow-wrap: normal;
		overflow-x: auto;
	}

	.query-textarea::placeholder {
		color: var(--color-text-tertiary);
		line-height: var(--line-height-normal);
	}

	.query-textarea:focus {
		background-color: var(--color-bg-primary);
	}

	.query-actions {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3);
		border-top: 1px solid var(--color-border-primary);
		background-color: var(--color-bg-elevated);
		gap: var(--space-2);
	}

	.query-actions-left,
	.query-actions-right {
		display: flex;
		align-items: center;
		gap: var(--space-2);
	}

	.dropdown {
		position: relative;
		display: inline-block;
		z-index: 1000;
	}

	.dropdown .btn.active {
		background-color: var(--color-surface-hover);
		border-color: var(--color-primary);
	}

	.dropdown-portal {
		position: absolute;
		bottom: 100%;
		right: 0;
		min-width: 200px;
		max-width: 300px;
		background-color: var(--color-bg-elevated);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		box-shadow: var(--shadow-lg);
		z-index: 99999;
		margin-bottom: var(--space-2);
		overflow: hidden;
		/* Ensure dropdown appears above other elements */
		transform: translateZ(0);
	}

	.dropdown-portal {
		position: fixed;
		bottom: auto;
		transform: translateY(-100%);
	}

	.dropdown-header {
		display: none; /* Hidden by default on desktop */
		justify-content: space-between;
		align-items: center;
		padding: var(--space-3);
		border-bottom: 1px solid var(--color-border-secondary);
		background-color: var(--color-surface);
	}

	.dropdown-header h3 {
		margin: 0;
		font-size: var(--font-size-sm);
		font-weight: 600;
		color: var(--color-text-primary);
	}

	.close-btn {
		background: none;
		border: none;
		font-size: 20px;
		line-height: 1;
		color: var(--color-text-secondary);
		cursor: pointer;
		padding: 0;
		width: 24px;
		height: 24px;
		display: none; /* Hidden by default on desktop */
		align-items: center;
		justify-content: center;
		border-radius: var(--radius-sm);
		transition: all 0.2s ease;
	}

	.close-btn:hover {
		background-color: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.dropdown-item {
		display: block;
		width: 100%;
		padding: var(--space-3) var(--space-4);
		background: none;
		border: none;
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
		transition: background-color var(--duration-fast) var(--ease-out);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.dropdown-item:hover {
		background-color: var(--color-surface-hover);
	}

	.dropdown-item:first-child {
		border-radius: var(--radius-md) var(--radius-md) 0 0;
	}

	.dropdown-item:last-child {
		border-radius: 0 0 var(--radius-md) var(--radius-md);
	}

	/* Loading spinner */
	.spinner {
		width: 14px;
		height: 14px;
		border: 2px solid var(--color-border-primary);
		border-top: 2px solid currentColor;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	/* Responsive adjustments */
	@media (max-width: 768px) {
		.query-textarea {
			font-size: 16px; /* Prevent zoom on iOS */
		}
		
		.query-actions {
			flex-direction: column;
			gap: var(--space-2);
		}
		
		.query-actions-left,
		.query-actions-right {
			justify-content: center;
		}
		
		/* Mobile dropdown adjustments - Modal style */
		.dropdown-portal {
			position: fixed;
			top: 50%;
			left: 50%;
			right: auto;
			bottom: auto;
			transform: translate(-50%, -50%) translateZ(0);
			min-width: 320px;
			max-width: 90vw;
			max-height: 70vh;
			overflow-y: auto;
			margin: 0;
			border-radius: var(--radius-lg);
			z-index: 99999;
			/* Enhanced modal styling */
			box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.08);
		}

		/* Backdrop for modal effect */
		.dropdown-portal::before {
			content: '';
			position: fixed;
			top: 0;
			left: 0;
			right: 0;
			bottom: 0;
			background: rgba(0, 0, 0, 0.4);
			z-index: 99998;
			backdrop-filter: blur(2px);
		}

		/* Show header and close button on mobile */
		.dropdown-header {
			display: flex !important;
		}

		.close-btn {
			display: flex !important;
		}

		.dropdown-item {
			padding: var(--space-4) var(--space-3);
			font-size: var(--font-size-base);
			text-align: left;
			justify-content: flex-start;
			border-bottom: 1px solid var(--color-border-secondary);
		}

		.dropdown-item:last-child {
			border-bottom: none;
		}
	}

	@media (max-width: 480px) {
		.query-actions {
			flex-wrap: wrap;
		}
		
		.query-actions-left,
		.query-actions-right {
			width: 100%;
		}
		
		.dropdown-portal {
			right: var(--space-1);
			left: var(--space-1);
		}
		
		.dropdown-item {
			text-align: center;
			padding: var(--space-4);
		}
	}
</style>
