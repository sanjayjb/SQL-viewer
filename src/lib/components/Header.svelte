<!--
  Header Component
  Main application header with title, theme toggle, and action buttons
  Uses Svelte 5 modern syntax for optimal performance
-->
<script lang="ts">
	import { settingsStore } from '$lib/stores.svelte';

	// Theme toggle handler
	function toggleTheme() {
		settingsStore.toggleTheme();
	}

	// Reactive theme value
	$: theme = settingsStore.theme;
</script>

<header class="header">
	<div class="header-left">
		<h1 class="app-title">
			<span class="app-icon">⚡</span>
			SQL QuickSight
		</h1>
	</div>

	<div class="header-right">
		<button
			class="btn btn-icon theme-toggle"
			onclick={toggleTheme}
			aria-label="Toggle theme"
			title="Toggle between light and dark theme"
		>
			{#if theme === 'dark'}
				<!-- Sun icon for light mode -->
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<circle cx="12" cy="12" r="5"></circle>
					<line x1="12" y1="1" x2="12" y2="3"></line>
					<line x1="12" y1="21" x2="12" y2="23"></line>
					<line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
					<line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
					<line x1="1" y1="12" x2="3" y2="12"></line>
					<line x1="21" y1="12" x2="23" y2="12"></line>
					<line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
					<line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
				</svg>
			{:else}
				<!-- Moon icon for dark mode -->
				<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
					<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
				</svg>
			{/if}
		</button>

		<button class="btn btn-sm" title="Settings">
			<svg class="icon icon-sm" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="12" cy="12" r="3"></circle>
				<path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
			</svg>
			Settings
		</button>
	</div>
</header>

<style>
	.header-left {
		display: flex;
		align-items: center;
		gap: var(--space-4);
	}

	.app-title {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		font-size: var(--font-size-xl);
		font-weight: 700;
		color: var(--color-text-primary);
		margin: 0;
	}

	.app-icon {
		font-size: var(--font-size-2xl);
		filter: drop-shadow(0 0 8px color-mix(in srgb, var(--color-primary) 40%, transparent));
	}

	.header-right {
		display: flex;
		align-items: center;
		gap: var(--space-3);
	}

	.theme-toggle {
		transition: all var(--duration-normal) var(--ease-out);
	}

	.theme-toggle:hover {
		transform: scale(1.05);
	}

	/* Smooth icon transitions */
	.theme-toggle svg {
		transition: all var(--duration-normal) var(--ease-out);
	}

	/* Add a subtle glow effect to the theme toggle */
	.theme-toggle:hover svg {
		filter: drop-shadow(0 0 4px color-mix(in srgb, var(--color-primary) 30%, transparent));
	}
</style>
