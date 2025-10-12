<!--
  ResultsPanel Component
  Displays query execution results with virtualized table for performance
  Includes export functionality and metadata display
-->
<script lang="ts">
	import { queryResultsStore } from '$lib/stores.svelte';
	import { formatExecutionTime, formatNumber, exportToCSV, type QueryResult } from '$lib/utils/index.js';

	// Reactive store values - using proper Svelte 5 patterns
	let currentResult = $state<QueryResult | null>(null);
	let isExecuting = $state(false);
	
	// Pagination state
	let currentPage = $state(1);
	let rowsPerPage = $state(50);
	
	// Update from store reactively
	$effect(() => {
		currentResult = queryResultsStore.currentResult;
		isExecuting = queryResultsStore.isExecuting;
	});
	
	// Derived values using $derived
	const totalPages = $derived(currentResult ? Math.ceil(currentResult.data.length / rowsPerPage) : 0);
	const startIndex = $derived((currentPage - 1) * rowsPerPage);
	const endIndex = $derived(Math.min(startIndex + rowsPerPage, currentResult?.data.length || 0));
	const paginatedData = $derived(currentResult?.data.slice(startIndex, endIndex) || []);
	const columns = $derived(currentResult?.data.length ? Object.keys(currentResult.data[0]) : []);

	/**
	 * Handles pagination changes
	 */
	function goToPage(page: number) {
		currentPage = Math.max(1, Math.min(page, totalPages));
	}

	/**
	 * Exports current results to CSV
	 */
	function exportResults() {
		if (!currentResult) return;
		
		const filename = `${currentResult.name.replace(/[^a-z0-9]/gi, '_')}_${new Date().toISOString().split('T')[0]}.csv`;
		exportToCSV(currentResult.data, filename);
	}

	/**
	 * Formats cell values for display
	 */
	function formatCellValue(value: any): string {
		if (value === null || value === undefined) {
			return '';
		}
		
		if (typeof value === 'boolean') {
			return value ? 'true' : 'false';
		}
		
		if (typeof value === 'number') {
			// Format large numbers
			if (Math.abs(value) >= 1000) {
				return value.toLocaleString();
			}
			return value.toString();
		}
		
		if (typeof value === 'string') {
			// Truncate very long strings
			if (value.length > 100) {
				return value.substring(0, 97) + '...';
			}
			return value;
		}
		
		// Handle objects and arrays
		if (typeof value === 'object') {
			return JSON.stringify(value);
		}
		
		return String(value);
	}

	/**
	 * Gets the appropriate CSS class for a cell value type
	 */
	function getCellClass(value: any): string {
		if (value === null || value === undefined) {
			return 'cell-null';
		}
		
		if (typeof value === 'number') {
			return 'cell-number';
		}
		
		if (typeof value === 'boolean') {
			return 'cell-boolean';
		}
		
		if (typeof value === 'string') {
			// Check if it looks like a date
			if (/^\d{4}-\d{2}-\d{2}/.test(value)) {
				return 'cell-date';
			}
			// Check if it looks like an email
			if (value.includes('@') && value.includes('.')) {
				return 'cell-email';
			}
			return 'cell-string';
		}
		
		return 'cell-object';
	}

	// Reset pagination when result changes
	$effect(() => {
		if (currentResult) {
			currentPage = 1;
		}
	});
</script>

<div class="results-panel">
	<div class="results-header">
		<div class="results-info">
			{#if isExecuting}
				<div class="results-badge">
					<div class="spinner"></div>
					Executing...
				</div>
			{:else if currentResult}
				<div class="results-badge success">
					<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<polyline points="20,6 9,17 4,12"></polyline>
					</svg>
					{currentResult.status}
				</div>
				
				<span class="results-meta">
					Rows: <strong>{formatNumber(currentResult.rowCount)}</strong>
				</span>
				
				<span class="results-meta">
					Time: <strong>{formatExecutionTime(currentResult.executionTime)}</strong>
				</span>
				
				{#if totalPages > 1}
					<span class="results-meta">
						Page: <strong>{currentPage} of {totalPages}</strong>
					</span>
				{/if}
			{:else}
				<div class="results-badge">
					<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<circle cx="12" cy="12" r="10"></circle>
						<path d="M12,6 L12,12 L16,14"></path>
					</svg>
					Ready
				</div>
			{/if}
		</div>

		<div class="results-actions">
			{#if currentResult && !isExecuting}
				<button
					class="btn btn-sm"
					onclick={exportResults}
					title="Export to CSV"
				>
					<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
						<polyline points="7,10 12,15 17,10"></polyline>
						<line x1="12" y1="15" x2="12" y2="3"></line>
					</svg>
					Export Data
				</button>
			{/if}
		</div>
	</div>

	<div class="results-content">
		{#if isExecuting}
			<div class="results-loading">
				<div class="spinner-large"></div>
				<p>Executing query...</p>
			</div>
		{:else if currentResult && currentResult.data.length > 0}
			<div class="results-table-container">
				<table class="results-table">
					<thead>
						<tr>
							{#each columns as column}
								<th title={column}>
									{column}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each paginatedData as row, rowIndex (startIndex + rowIndex)}
							<tr>
								{#each columns as column}
									<td 
										class={getCellClass(row[column])}
										title={formatCellValue(row[column])}
									>
										{formatCellValue(row[column])}
									</td>
								{/each}
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Pagination controls -->
			{#if totalPages > 1}
				<div class="pagination">
					<button
						class="btn btn-sm"
						onclick={() => goToPage(currentPage - 1)}
						disabled={currentPage <= 1}
						title="Previous page"
					>
						<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="15,18 9,12 15,6"></polyline>
						</svg>
					</button>

					<div class="pagination-info">
						Showing {startIndex + 1}-{endIndex} of {formatNumber(currentResult.rowCount)} rows
					</div>

					<button
						class="btn btn-sm"
						onclick={() => goToPage(currentPage + 1)}
						disabled={currentPage >= totalPages}
						title="Next page"
					>
						<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<polyline points="9,18 15,12 9,6"></polyline>
						</svg>
					</button>
				</div>
			{/if}
		{:else if currentResult && currentResult.data.length === 0}
			<div class="results-empty">
				<svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
					<line x1="9" y1="9" x2="15" y2="9"></line>
					<line x1="9" y1="15" x2="15" y2="15"></line>
				</svg>
				<h3>No Results</h3>
				<p>The query executed successfully but returned no data.</p>
			</div>
		{:else}
			<div class="results-placeholder">
				<svg class="icon icon-lg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<polygon points="5,3 19,12 5,21 5,3"></polygon>
				</svg>
				<h3>Ready to Execute</h3>
				<p>Write a SQL query and click "Run Query" to see results here.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.results-content {
		display: flex;
		flex-direction: column;
		height: 100%;
		overflow: hidden;
	}

	.results-loading,
	.results-empty,
	.results-placeholder {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100%;
		text-align: center;
		color: var(--color-text-secondary);
		gap: var(--space-4);
	}

	.results-loading .spinner-large,
	.spinner-large {
		width: 32px;
		height: 32px;
		border: 3px solid var(--color-border-primary);
		border-top: 3px solid var(--color-primary);
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	.results-empty h3,
	.results-placeholder h3 {
		margin: 0;
		font-size: var(--font-size-lg);
		color: var(--color-text-primary);
	}

	.results-empty p,
	.results-placeholder p {
		margin: 0;
		font-size: var(--font-size-sm);
	}

	.results-table-container {
		flex: 1;
		overflow: auto;
		border: 1px solid var(--color-border-primary);
		border-radius: var(--radius-md);
	}

	.results-table {
		width: 100%;
		border-collapse: collapse;
		font-size: var(--font-size-sm);
		background-color: var(--color-bg-elevated);
	}

	.results-table th {
		position: sticky;
		top: 0;
		background-color: var(--color-bg-secondary);
		color: var(--color-text-primary);
		font-weight: 600;
		text-align: left;
		padding: var(--space-3) var(--space-4);
		border-bottom: 2px solid var(--color-border-primary);
		border-right: 1px solid var(--color-border-primary);
		white-space: nowrap;
		z-index: 2;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	.results-table th:last-child {
		border-right: none;
	}

	.results-table td {
		padding: var(--space-3) var(--space-4);
		border-bottom: 1px solid var(--color-border-primary);
		border-right: 1px solid var(--color-border-primary);
		max-width: 200px;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		vertical-align: top;
	}

	.results-table td:last-child {
		border-right: none;
	}

	.results-table tbody tr:hover {
		background-color: var(--color-surface-hover);
	}

	.results-table tbody tr:nth-child(even) {
		background-color: color-mix(in srgb, var(--color-bg-secondary) 30%, transparent);
	}

	/* Cell type styling */
	.cell-null {
		color: var(--color-text-tertiary);
		font-style: italic;
	}

	.cell-number {
		color: var(--color-info);
		text-align: right;
		font-family: var(--font-family-mono);
	}

	.cell-boolean {
		color: var(--color-warning);
		font-family: var(--font-family-mono);
		text-transform: uppercase;
		font-size: var(--font-size-xs);
		font-weight: 600;
	}

	.cell-date {
		color: var(--color-success);
		font-family: var(--font-family-mono);
	}

	.cell-email {
		color: var(--color-primary);
	}

	.cell-string {
		color: var(--color-text-primary);
	}

	.cell-object {
		color: var(--color-text-tertiary);
		font-family: var(--font-family-mono);
		font-size: var(--font-size-xs);
	}

	/* Pagination */
	.pagination {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		background-color: var(--color-bg-secondary);
		border-top: 1px solid var(--color-border-primary);
		gap: var(--space-4);
	}

	.pagination-info {
		font-size: var(--font-size-sm);
		color: var(--color-text-secondary);
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

	/* Responsive design */
	@media (max-width: 768px) {
		.results-table th,
		.results-table td {
			padding: var(--space-2) var(--space-3);
			font-size: var(--font-size-xs);
			max-width: 120px;
		}
		
		.pagination {
			flex-direction: column;
			gap: var(--space-2);
		}
		
		.results-header {
			flex-direction: column;
			align-items: stretch;
			gap: var(--space-2);
		}
		
		.results-info {
			flex-wrap: wrap;
			gap: var(--space-2);
		}
	}
</style>
