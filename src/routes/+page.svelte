<!--
  Main Page Component
  SQL QuickSight - A modern, high-performance SQL query viewer
  Built with Svelte 5 for optimal performance and developer experience
-->
<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';
	import Header from '$lib/components/Header.svelte';
	import QueryTabs from '$lib/components/QueryTabs.svelte';
	import QueryEditor from '$lib/components/QueryEditor.svelte';
	import ResultsPanel from '$lib/components/ResultsPanel.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { queryTabsStore, queryResultsStore, settingsStore } from '$lib/stores.svelte';
	import type { PageData } from './$types';

	// Accept SSR data
	interface Props {
		data: PageData;
	}
	
	let { data }: Props = $props();

	// Resizable layout state with proper constraints - initialize from SSR data
	let sidebarWidth = $state(data.sidebarWidth);
	let editorHeight = $state(data.editorHeight); // Percentage of editor section height
	let isDraggingSidebar = $state(false);
	let isDraggingEditor = $state(false);
	
	// Layout constraints
	const MIN_SIDEBAR_WIDTH = 250;
	const MAX_SIDEBAR_WIDTH = 500;
	const MIN_EDITOR_HEIGHT = 30; // Minimum 30% for editor
	const MAX_EDITOR_HEIGHT = 70; // Maximum 70% for editor
	const MIN_MAIN_WIDTH = 600; // Minimum width for main content

	// Initialize stores with SSR data, then enhance on client
	if (!browser) {
		// Server-side: initialize with provided data
		queryTabsStore.initializeSSR(data.initialTabs, data.activeTabId);
		settingsStore.initializeSSR(data.initialTheme);
	}

	// Client-side enhancement
	onMount(() => {
		if (browser) {
			// Initialize or merge with existing SSR data
			queryTabsStore.initialize();
			queryResultsStore.initialize();
			settingsStore.initialize();
			
			// Load saved layout preferences with constraints
			const savedSidebarWidth = localStorage.getItem('sidebar-width');
			const savedEditorHeight = localStorage.getItem('editor-height');
			
			if (savedSidebarWidth) {
				const width = parseInt(savedSidebarWidth);
				sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(MAX_SIDEBAR_WIDTH, width));
			}
			if (savedEditorHeight) {
				const height = parseInt(savedEditorHeight);
				editorHeight = Math.max(MIN_EDITOR_HEIGHT, Math.min(MAX_EDITOR_HEIGHT, height));
			}
		}
	});

	// Keyboard shortcuts
	function handleGlobalKeydown(event: KeyboardEvent) {
		if (!browser || !queryTabsStore) return;
		
		// Ctrl/Cmd + T: New tab
		if ((event.ctrlKey || event.metaKey) && event.key === 't') {
			event.preventDefault();
			queryTabsStore.createTab();
		}
		
		// Ctrl/Cmd + W: Close current tab
		if ((event.ctrlKey || event.metaKey) && event.key === 'w') {
			event.preventDefault();
			const activeTab = queryTabsStore.activeTab;
			if (activeTab) {
				queryTabsStore.closeTab(activeTab.id);
			}
		}
		
		// Ctrl/Cmd + Shift + T: Duplicate current tab
		if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'T') {
			event.preventDefault();
			const activeTab = queryTabsStore.activeTab;
			if (activeTab) {
				queryTabsStore.duplicateTab(activeTab.id);
			}
		}
	}

	/**
	 * Handles sidebar resize drag with proper constraints
	 */
	function handleSidebarMouseDown(event: MouseEvent) {
		isDraggingSidebar = true;
		event.preventDefault();
		
		function handleMouseMove(e: MouseEvent) {
			if (!isDraggingSidebar) return;
			
			const windowWidth = window.innerWidth;
			const newWidth = windowWidth - e.clientX;
			const maxAllowedWidth = Math.min(MAX_SIDEBAR_WIDTH, windowWidth - MIN_MAIN_WIDTH);
			
			sidebarWidth = Math.max(MIN_SIDEBAR_WIDTH, Math.min(maxAllowedWidth, newWidth));
			
			// Save to localStorage
			if (browser) {
				localStorage.setItem('sidebar-width', sidebarWidth.toString());
			}
		}
		
		function handleMouseUp() {
			isDraggingSidebar = false;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}
		
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}

	/**
	 * Handles editor/results resize drag with proper constraints
	 */
	function handleEditorMouseDown(event: MouseEvent) {
		isDraggingEditor = true;
		event.preventDefault();
		
		const editorSection = event.currentTarget?.closest('.editor-section') as HTMLElement;
		if (!editorSection) return;
		
		const rect = editorSection.getBoundingClientRect();
		
		function handleMouseMove(e: MouseEvent) {
			if (!isDraggingEditor) return;
			
			const relativeY = e.clientY - rect.top;
			const newHeight = (relativeY / rect.height) * 100;
			editorHeight = Math.max(MIN_EDITOR_HEIGHT, Math.min(MAX_EDITOR_HEIGHT, newHeight));
			
			// Save to localStorage
			if (browser) {
				localStorage.setItem('editor-height', editorHeight.toString());
			}
		}
		
		function handleMouseUp() {
			isDraggingEditor = false;
			document.removeEventListener('mousemove', handleMouseMove);
			document.removeEventListener('mouseup', handleMouseUp);
		}
		
		document.addEventListener('mousemove', handleMouseMove);
		document.addEventListener('mouseup', handleMouseUp);
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />
<svelte:head>
	<title>SQL QuickSight - Modern SQL Query Viewer</title>
	<meta name="description" content="A high-performance SQL query viewer built with Svelte 5" />
</svelte:head>

<div class="app-container" style="--sidebar-width: {sidebarWidth}px; --editor-height: {editorHeight}%;">
	<Header />
	
	<main class="main-content">
		<section class="editor-section">
			<div class="query-editor">
				<QueryTabs />
				<QueryEditor />
			</div>
			
			<!-- Horizontal resize handle -->
			<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
			<div 
				class="resize-handle horizontal" 
				class:dragging={isDraggingEditor}
				onmousedown={handleEditorMouseDown}
				role="separator"
				aria-orientation="horizontal"
				title="Drag to resize editor and results panels"
			></div>
			
			<div class="results-section">
				<ResultsPanel />
			</div>
		</section>
		
		<!-- Vertical resize handle -->
		<!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
		<div 
			class="resize-handle vertical" 
			class:dragging={isDraggingSidebar}
			onmousedown={handleSidebarMouseDown}
			role="separator"
			aria-orientation="vertical"
			title="Drag to resize sidebar"
		></div>
		
		<aside class="sidebar-section">
			<Sidebar />
		</aside>
	</main>
</div>

<style>
	.app-container {
		display: grid;
		grid-template-rows: auto 1fr;
		height: 100vh;
		background-color: var(--color-bg-primary);
		overflow: hidden;
	}

	.main-content {
		display: grid;
		grid-template-columns: 1fr 4px var(--sidebar-width, 320px);
		gap: 0;
		height: 100%;
		overflow: hidden;
		min-width: 0;
	}

	.editor-section {
		display: grid;
		grid-template-rows: var(--editor-height, 50%) 4px calc(100% - var(--editor-height, 50%) - 4px);
		background-color: var(--color-bg-secondary);
		min-height: 0;
		min-width: 400px; /* Minimum width for editor section */
	}

	.query-editor {
		display: grid;
		grid-template-rows: auto 1fr auto;
		min-height: 200px; /* Minimum height for query editor */
		overflow: hidden;
	}

	.results-section {
		min-height: 200px; /* Minimum height for results panel */
		overflow: hidden;
	}

	.sidebar-section {
		background-color: var(--color-bg-elevated);
		border-left: 1px solid var(--color-border-primary);
		overflow-y: auto;
		min-width: 250px;
		max-width: 500px;
		width: var(--sidebar-width, 320px);
	}

	/* Resize handles */
	.resize-handle {
		background-color: var(--color-border-primary);
		transition: background-color 0.2s ease;
		user-select: none;
		position: relative;
		z-index: 10;
	}

	.resize-handle:hover,
	.resize-handle.dragging {
		background-color: var(--color-primary);
	}

	.resize-handle.horizontal {
		height: 4px;
		cursor: row-resize;
		width: 100%;
		min-height: 4px;
	}

	.resize-handle.vertical {
		width: 4px;
		cursor: col-resize;
		height: 100%;
		min-width: 4px;
		background-color: var(--color-border-primary);
	}

	.resize-handle.horizontal::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 40px;
		height: 4px;
		border-radius: 2px;
		background-color: var(--color-text-tertiary);
		transition: background-color 0.2s ease;
	}

	.resize-handle.vertical::before {
		content: '';
		position: absolute;
		top: 50%;
		left: 50%;
		transform: translate(-50%, -50%);
		width: 4px;
		height: 40px;
		border-radius: 2px;
		background-color: var(--color-text-tertiary);
		transition: background-color 0.2s ease;
	}

	.resize-handle:hover::before,
	.resize-handle.dragging::before {
		background-color: var(--color-primary);
	}

	/* Add some visual feedback when dragging */
	.resize-handle.dragging {
		z-index: 1000;
	}

	/* Responsive design */
	@media (max-width: 1024px) {
		.main-content {
			grid-template-columns: 1fr 4px 280px;
		}
		
		.editor-section {
			min-width: 300px;
		}
	}

	@media (max-width: 768px) {
		.main-content {
			grid-template-columns: 1fr;
			grid-template-rows: 1fr auto;
		}
		
		.resize-handle.vertical {
			display: none;
		}
		
		.sidebar-section {
			max-height: 40vh;
			min-height: 200px;
			border-left: none;
			border-top: 1px solid var(--color-border-primary);
			width: 100%;
			min-width: unset;
			max-width: unset;
		}
		
		.editor-section {
			min-width: unset;
		}
	}

	@media (max-width: 480px) {
		.editor-section {
			grid-template-rows: 40% 4px 56%;
		}
		
		.query-editor {
			min-height: 150px;
		}
		
		.results-section {
			min-height: 150px;
		}
	}

	/* Performance optimizations */
	.app-container {
		/* Use GPU acceleration for smoother animations */
		transform: translateZ(0);
		will-change: scroll-position;
	}

	/* Smooth scrolling behavior */
	* {
		scroll-behavior: smooth;
	}

	/* Optimize text rendering */
	.app-container {
		text-rendering: optimizeLegibility;
		-webkit-font-smoothing: antialiased;
		-moz-osx-font-smoothing: grayscale;
	}
</style>
