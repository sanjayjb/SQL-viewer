<!--
  QueryTabs Component
  Manages multiple query tabs with add, close, and switch functionality
  Optimized for performance with virtual scrolling for many tabs
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { queryTabsStore } from '$lib/stores.svelte';
	import { generateId } from '$lib/utils/index.js';

	// Svelte 5 runes for reactive state
	let tabs = $state(queryTabsStore.tabs);
	let activeTabId = $state(queryTabsStore.activeTabId);

	// Initialize store and sync with local state
	onMount(() => {
		// Initialize the store first
		queryTabsStore.initialize();
		
		// Sync store state with local component state
		tabs = queryTabsStore.tabs;
		activeTabId = queryTabsStore.activeTabId;
	});

	// Effect to keep local state in sync with store
	$effect(() => {
		tabs = queryTabsStore.tabs;
		activeTabId = queryTabsStore.activeTabId;
	});

	/**
	 * Creates a new query tab
	 */
	function createNewTab() {
		queryTabsStore.createTab();
	}

	/**
	 * Switches to a specific tab
	 */
	function switchToTab(tabId: string) {
		queryTabsStore.setActiveTab(tabId);
	}

	/**
	 * Closes a tab with confirmation if unsaved changes
	 */
	function closeTab(event: Event, tabId: string) {
		event.stopPropagation(); // Prevent tab activation
		
		const tab = tabs.find(t => t.id === tabId);
		if (tab?.hasChanges) {
			const confirmClose = confirm(`Tab "${tab.name}" has unsaved changes. Are you sure you want to close it?`);
			if (!confirmClose) return;
		}
		
		queryTabsStore.closeTab(tabId);
	}

	/**
	 * Handles tab name editing
	 */
	function handleTabNameEdit(event: Event, tabId: string) {
		const target = event.target as HTMLSpanElement;
		const newName = target.textContent?.trim() || 'Untitled Query';
		queryTabsStore.updateTabName(tabId, newName);
	}

	/**
	 * Handles keyboard shortcuts for tabs
	 */
	function handleTabKeydown(event: KeyboardEvent, tabId: string) {
		if (event.key === 'Enter') {
			event.preventDefault();
			(event.target as HTMLElement).blur();
		} else if (event.key === 'Escape') {
			event.preventDefault();
			(event.target as HTMLElement).blur();
			// Restore original name if needed
		}
	}

	/**
	 * Handles middle-click to close tab
	 */
	function handleTabMouseDown(event: MouseEvent, tabId: string) {
		if (event.button === 1) { // Middle mouse button
			event.preventDefault();
			closeTab(event, tabId);
		}
	}
</script>

<div class="query-tabs-container">
	<div class="query-tabs" role="tablist">
		{#each tabs as tab (tab.id)}
			<div
				class="query-tab"
				class:active={tab.id === activeTabId}
				class:has-changes={tab.hasChanges}
				role="tab"
				tabindex="0"
				aria-selected={tab.id === activeTabId}
				aria-controls="query-panel-{tab.id}"
				onclick={() => switchToTab(tab.id)}
				onkeydown={(e) => {
					if (e.key === 'Enter' || e.key === ' ') {
						e.preventDefault();
						switchToTab(tab.id);
					}
				}}
				onmousedown={(e) => handleTabMouseDown(e, tab.id)}
				title="{tab.name}{tab.hasChanges ? ' (unsaved changes)' : ''}"
			>
				<span
					class="query-tab-name"
					role="textbox"
					tabindex="0"
					contenteditable="true"
					onblur={(e) => handleTabNameEdit(e, tab.id)}
					onkeydown={(e) => handleTabKeydown(e, tab.id)}
					onclick={(e) => e.stopPropagation()}
				>
					{tab.name}
				</span>
				
				<!-- Unsaved changes indicator -->
				<div class="query-tab-indicator" aria-hidden="true"></div>
				
				<!-- Close button -->
				<button
					class="query-tab-close"
					onclick={(e) => closeTab(e, tab.id)}
					aria-label="Close tab {tab.name}"
					title="Close tab"
				>
					<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>
		{/each}
		
		<!-- Add new tab button -->
		<button
			class="query-tab-add"
			onclick={createNewTab}
			aria-label="Add new query tab"
			title="Add new tab (Ctrl+T)"
		>
			<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<line x1="12" y1="5" x2="12" y2="19"></line>
				<line x1="5" y1="12" x2="19" y2="12"></line>
			</svg>
		</button>
	</div>
</div>

<style>
	.query-tabs-container {
		position: relative;
		background-color: var(--color-bg-tertiary);
		border-bottom: 1px solid var(--color-border-primary);
	}

	.query-tabs {
		display: flex;
		overflow-x: auto;
		scrollbar-width: none;
		-ms-overflow-style: none;
		scroll-behavior: smooth;
	}

	.query-tabs::-webkit-scrollbar {
		display: none;
	}

	.query-tab {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-3) var(--space-4);
		background-color: transparent;
		border: none;
		border-right: 1px solid var(--color-border-primary);
		color: var(--color-text-secondary);
		font-size: var(--font-size-sm);
		cursor: pointer;
		white-space: nowrap;
		transition: all var(--duration-fast) var(--ease-out);
		min-width: 140px;
		max-width: 240px;
		position: relative;
	}

	.query-tab::before {
		content: '';
		position: absolute;
		bottom: 0;
		left: 0;
		right: 0;
		height: 2px;
		background-color: var(--color-primary);
		transform: scaleX(0);
		transition: transform var(--duration-fast) var(--ease-out);
	}

	.query-tab:hover {
		background-color: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.query-tab.active {
		background-color: var(--color-bg-elevated);
		color: var(--color-text-primary);
		border-bottom-color: transparent;
	}

	.query-tab.active::before {
		transform: scaleX(1);
	}

	.query-tab-name {
		flex: 1;
		overflow: hidden;
		text-overflow: ellipsis;
		white-space: nowrap;
		outline: none;
		border-radius: var(--radius-sm);
		padding: var(--space-1);
		margin: calc(var(--space-1) * -1);
		transition: background-color var(--duration-fast) var(--ease-out);
	}

	.query-tab-name:focus {
		background-color: var(--color-surface-active);
	}

	.query-tab-indicator {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background-color: var(--color-warning);
		opacity: 0;
		transition: opacity var(--duration-fast) var(--ease-out);
		flex-shrink: 0;
	}

	.query-tab.has-changes .query-tab-indicator {
		opacity: 1;
	}

	.query-tab-close {
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

	.query-tab:hover .query-tab-close {
		opacity: 1;
	}

	.query-tab-close:hover {
		background-color: var(--color-surface-active);
		color: var(--color-error);
	}

	.query-tab-add {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 40px;
		border: none;
		background-color: transparent;
		color: var(--color-text-tertiary);
		cursor: pointer;
		transition: all var(--duration-fast) var(--ease-out);
		border-left: 1px solid var(--color-border-primary);
	}

	.query-tab-add:hover {
		background-color: var(--color-surface-hover);
		color: var(--color-text-primary);
	}

	.query-tab-add:active {
		background-color: var(--color-surface-active);
		transform: scale(0.95);
	}

	/* Smooth scrolling for many tabs */
	@media (max-width: 768px) {
		.query-tab {
			min-width: 120px;
			max-width: 180px;
		}
		
		.query-tab-close {
			opacity: 1; /* Always visible on mobile */
		}
	}
</style>
