<!--
  Sidebar Component
  Displays query history and saved queries
  Provides quick access to previous executions
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import { queryResultsStore, queryTabsStore } from '$lib/stores.svelte';
	import { formatExecutionTime, formatNumber } from '$lib/utils/index.js';
	import type { QueryResult } from '$lib/utils/index.js';

	// Svelte 5 runes for reactive state
	let results = $state(queryResultsStore.results);
	let history = $state<QueryResult[]>([]);
	let resultsArray = $derived(Array.from(results.values()));

	// Local state
	let searchQuery = $state('');
	let selectedCategory = $state('all');

	// Derived filtered history
	let filteredHistory = $derived((history || []).filter(result => {
		// Search filter
		const matchesSearch = !searchQuery || 
			result.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			result.query.toLowerCase().includes(searchQuery.toLowerCase());

		// Category filter
		const matchesCategory = selectedCategory === 'all' || 
			(selectedCategory === 'recent' && isRecent(result)) ||
			(selectedCategory === 'saved' && result.name !== 'Untitled Query');

		return matchesSearch && matchesCategory;
	}));

	// Initialize and sync with store
	onMount(() => {
		if (browser) {
			// Ensure query results store is initialized first
			queryResultsStore.initialize();
			
			// Then sync reactive state with store
			syncWithStore();
			
			// Set up reactivity using $effect
			$effect(() => {
				results = queryResultsStore.results;
				history = queryResultsStore.history || [];
			});
		}
	});

	function syncWithStore() {
		results = queryResultsStore.results;
		history = queryResultsStore.history || [];
	}

	/**
	 * Checks if a result is recent (within last 24 hours)
	 */
	function isRecent(result: QueryResult): boolean {
		const now = new Date();
		const resultTime = new Date(result.timestamp);
		const hoursDiff = (now.getTime() - resultTime.getTime()) / (1000 * 60 * 60);
		return hoursDiff <= 24;
	}

	/**
	 * Loads a query from history into a new tab
	 */
	function loadQueryFromHistory(result: QueryResult) {
		const tabId = queryTabsStore.createTab(result.name);
		queryTabsStore.updateTabQuery(tabId, result.query);
		queryResultsStore.setCurrentResult(result);
	}

	/**
	 * Removes a result from history
	 */
	function removeFromHistory(event: Event, resultId: string) {
		event.stopPropagation();
		const confirmed = confirm('Remove this query from history?');
		if (confirmed) {
			queryResultsStore.clearResult(resultId);
		}
	}

	/**
	 * Clears all history
	 */
	function clearAllHistory() {
		const confirmed = confirm('Clear all query history? This cannot be undone.');
		if (confirmed) {
			queryResultsStore.clearAllResults();
		}
	}

	/**
	 * Formats the query preview for display
	 */
	function getQueryPreview(query: string): string {
		// Remove extra whitespace and limit length
		const cleaned = query.replace(/\s+/g, ' ').trim();
		return cleaned.length > 60 ? cleaned.substring(0, 57) + '...' : cleaned;
	}

	/**
	 * Gets relative time string
	 */
	function getRelativeTime(timestamp: Date): string {
		const now = new Date();
		const diff = now.getTime() - new Date(timestamp).getTime();
		const minutes = Math.floor(diff / (1000 * 60));
		const hours = Math.floor(diff / (1000 * 60 * 60));
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (minutes < 1) return 'Just now';
		if (minutes < 60) return `${minutes}m ago`;
		if (hours < 24) return `${hours}h ago`;
		if (days < 7) return `${days}d ago`;
		
		return new Date(timestamp).toLocaleDateString();
	}

	/**
	 * Gets status color for results
	 */
	function getStatusColor(status: string): string {
		switch (status) {
			case 'success': return 'var(--color-success)';
			case 'error': return 'var(--color-error)';
			case 'pending': return 'var(--color-warning)';
			default: return 'var(--color-text-tertiary)';
		}
	}
</script>

<aside class="sidebar">
	<!-- Search and filters -->
	<div class="sidebar-section">
		<div class="search-container">
			<input
				type="text"
				class="search-input"
				placeholder="Search queries..."
				bind:value={searchQuery}
				aria-label="Search query history"
			>
			<svg class="search-icon icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"></circle>
				<path d="M21 21l-4.35-4.35"></path>
			</svg>
		</div>

		<div class="filter-tabs">
			<button
				class="filter-tab"
				class:active={selectedCategory === 'all'}
				onclick={() => selectedCategory = 'all'}
			>
				All
			</button>
			<button
				class="filter-tab"
				class:active={selectedCategory === 'recent'}
				onclick={() => selectedCategory = 'recent'}
			>
				Recent
			</button>
			<button
				class="filter-tab"
				class:active={selectedCategory === 'saved'}
				onclick={() => selectedCategory = 'saved'}
			>
				Saved
			</button>
		</div>
	</div>

	<!-- Query History -->
	<div class="sidebar-section">
		<div class="sidebar-header">
			<h2 class="sidebar-title">Query History</h2>
			{#if history.length > 0}
				<button
					class="btn-clear"
					onclick={clearAllHistory}
					title="Clear all history"
				>
					<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="3,6 5,6 21,6"></polyline>
						<path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"></path>
					</svg>
				</button>
			{/if}
		</div>

		<div class="history-list">
			{#if filteredHistory.length === 0}
				<div class="history-empty">
					{#if searchQuery}
						<p>No queries found matching "{searchQuery}"</p>
					{:else if selectedCategory !== 'all'}
						<p>No {selectedCategory} queries found</p>
					{:else}
						<p>No query history yet</p>
						<span>Execute a query to see it here</span>
					{/if}
				</div>
			{:else}
				{#each filteredHistory as result (result.id)}
					<div
						class="history-item"
						onclick={() => loadQueryFromHistory(result)}
						role="button"
						tabindex="0"
						onkeydown={(e) => e.key === 'Enter' && loadQueryFromHistory(result)}
					>
						<div class="history-item-header">
							<span class="history-item-name">{result.name}</span>
							<button
								class="history-item-remove"
								onclick={(e) => removeFromHistory(e, result.id)}
								title="Remove from history"
								aria-label="Remove {result.name} from history"
							>
								<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<line x1="18" y1="6" x2="6" y2="18"></line>
									<line x1="6" y1="6" x2="18" y2="18"></line>
								</svg>
							</button>
						</div>

						<div class="history-item-meta">
							<div class="history-meta-row">
								<span class="history-time">{getRelativeTime(result.timestamp)}</span>
								<span 
									class="history-status"
									style="color: {getStatusColor(result.status)}"
								>
									{result.status}
								</span>
							</div>
							<div class="history-meta-row">
								<span>{formatNumber(result.rowCount)} rows</span>
								<span>{formatExecutionTime(result.executionTime)}</span>
							</div>
						</div>

						<div class="history-item-query">
							{getQueryPreview(result.query)}
						</div>
					</div>
				{/each}
			{/if}
		</div>
	</div>

	<!-- Quick Stats -->
	{#if resultsArray.length > 0}
		<div class="sidebar-section">
			<h2 class="sidebar-title">Statistics</h2>
			<div class="stats-grid">
				<div class="stat-item">
					<span class="stat-value">{formatNumber(resultsArray.length)}</span>
					<span class="stat-label">Total Queries</span>
				</div>
				<div class="stat-item">
					<span class="stat-value">{formatNumber(resultsArray.reduce((sum: number, r: QueryResult) => sum + r.rowCount, 0))}</span>
					<span class="stat-label">Total Rows</span>
				</div>
				<div class="stat-item">
					<span class="stat-value">{resultsArray.filter((r: QueryResult) => r.status === 'success').length}</span>
					<span class="stat-label">Successful</span>
				</div>
				<div class="stat-item">
					<span class="stat-value">{formatExecutionTime(resultsArray.reduce((sum: number, r: QueryResult) => sum + r.executionTime, 0) / resultsArray.length)}</span>
					<span class="stat-label">Avg Time</span>
				</div>
			</div>
		</div>
	{/if}
</aside>

<style>
	.sidebar-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-bottom: var(--space-3);
	}

	.btn-clear {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 24px;
		height: 24px;
		border: none;
		background: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--duration-fast) var(--ease-out);
	}

	.btn-clear:hover {
		background-color: var(--color-surface-hover);
		color: var(--color-error);
	}

	.search-container {
		position: relative;
		margin-bottom: var(--space-3);
	}

	.search-input {
		width: 100%;
		padding: var(--space-2) var(--space-3);
		padding-right: var(--space-8);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background-color: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-size: var(--font-size-sm);
		outline: none;
		transition: border-color var(--duration-fast) var(--ease-out);
	}

	.search-input:focus {
		border-color: var(--color-primary);
	}

	.search-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.search-icon {
		position: absolute;
		right: var(--space-3);
		top: 50%;
		transform: translateY(-50%);
		color: var(--color-text-tertiary);
		pointer-events: none;
	}

	.filter-tabs {
		display: flex;
		background-color: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		padding: var(--space-1);
		gap: var(--space-1);
	}

	.filter-tab {
		flex: 1;
		padding: var(--space-2) var(--space-3);
		border: none;
		background: none;
		color: var(--color-text-secondary);
		font-size: var(--font-size-xs);
		font-weight: 500;
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--duration-fast) var(--ease-out);
		text-align: center;
	}

	.filter-tab:hover {
		color: var(--color-text-primary);
	}

	.filter-tab.active {
		background-color: var(--color-bg-elevated);
		color: var(--color-primary);
		box-shadow: var(--shadow-sm);
	}

	.history-list {
		max-height: 400px;
		overflow-y: auto;
		scrollbar-width: thin;
	}

	.history-empty {
		text-align: center;
		padding: var(--space-8) var(--space-4);
		color: var(--color-text-tertiary);
	}

	.history-empty p {
		margin: 0 0 var(--space-2) 0;
		font-size: var(--font-size-sm);
	}

	.history-empty span {
		font-size: var(--font-size-xs);
	}

	.history-item {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		padding: var(--space-3);
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
		background-color: var(--color-bg-secondary);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out);
		margin-bottom: var(--space-2);
	}

	.history-item:hover {
		background-color: var(--color-surface-hover);
		border-color: var(--color-border-secondary);
		transform: translateY(-1px);
		box-shadow: var(--shadow-sm);
	}

	.history-item:active {
		transform: translateY(0);
	}

	.history-item-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: var(--space-2);
	}

	.history-item-name {
		font-size: var(--font-size-sm);
		font-weight: 500;
		color: var(--color-text-primary);
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
	}

	.history-item-remove {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 20px;
		height: 20px;
		border: none;
		background: none;
		color: var(--color-text-tertiary);
		cursor: pointer;
		border-radius: var(--radius-sm);
		transition: all var(--duration-fast) var(--ease-out);
		opacity: 0;
		flex-shrink: 0;
	}

	.history-item:hover .history-item-remove {
		opacity: 1;
	}

	.history-item-remove:hover {
		background-color: var(--color-surface-active);
		color: var(--color-error);
	}

	.history-item-meta {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
	}

	.history-meta-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: var(--space-1);
	}

	.history-meta-row:last-child {
		margin-bottom: 0;
	}

	.history-status {
		font-weight: 500;
		text-transform: capitalize;
	}

	.history-item-query {
		font-family: var(--font-family-mono);
		font-size: var(--font-size-xs);
		color: var(--color-text-secondary);
		background-color: var(--color-bg-tertiary);
		padding: var(--space-2);
		border-radius: var(--radius-sm);
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		border: 1px solid color-mix(in srgb, var(--color-border-primary) 50%, transparent);
	}

	.stats-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: var(--space-3);
	}

	.stat-item {
		display: flex;
		flex-direction: column;
		align-items: center;
		text-align: center;
		padding: var(--space-3);
		background-color: var(--color-bg-secondary);
		border-radius: var(--radius-md);
		border: 1px solid var(--color-border-primary);
	}

	.stat-value {
		font-size: var(--font-size-lg);
		font-weight: 700;
		color: var(--color-primary);
		margin-bottom: var(--space-1);
	}

	.stat-label {
		font-size: var(--font-size-xs);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	/* Responsive design */
	@media (max-width: 768px) {
		.sidebar {
			max-height: none;
		}
		
		.history-list {
			max-height: 300px;
		}
		
		.stats-grid {
			grid-template-columns: 1fr;
		}
		
		.history-item-remove {
			opacity: 1; /* Always visible on mobile */
		}
	}
</style>
