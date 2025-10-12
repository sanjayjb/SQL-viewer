/**
 * Utility functions for the SQL Query Viewer application
 * Provides reusable methods for data manipulation, formatting, and performance optimization
 */

// Types for our application
export interface QueryResult {
	id: string;
	name: string;
	query: string;
	data: Record<string, any>[];
	executionTime: number;
	rowCount: number;
	status: 'success' | 'error' | 'pending';
	timestamp: Date;
}

export interface QueryTab {
	id: string;
	name: string;
	query: string;
	isActive?: boolean;
	isSaved?: boolean;
	hasChanges: boolean;
	isExecuting?: boolean;
	lastModified?: Date;
}

/**
 * Generates a unique identifier for queries and tabs
 * Uses performance.now() for better precision than Date.now()
 */
export function generateId(): string {
	return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Formats execution time in a human-readable format
 * Handles milliseconds, seconds, and minutes appropriately
 */
export function formatExecutionTime(timeInMs: number): string {
	if (timeInMs < 1000) {
		return `${timeInMs.toFixed(2)}ms`;
	} else if (timeInMs < 60000) {
		return `${(timeInMs / 1000).toFixed(2)}s`;
	} else {
		const minutes = Math.floor(timeInMs / 60000);
		const seconds = ((timeInMs % 60000) / 1000).toFixed(2);
		return `${minutes}m ${seconds}s`;
	}
}

/**
 * Formats large numbers with appropriate suffixes (K, M, B)
 * Useful for displaying row counts in a compact format
 */
export function formatNumber(num: number): string {
	if (num < 1000) return num.toString();
	if (num < 1000000) return `${(num / 1000).toFixed(1)}K`;
	if (num < 1000000000) return `${(num / 1000000).toFixed(1)}M`;
	return `${(num / 1000000000).toFixed(1)}B`;
}

/**
 * Debounces function calls to improve performance
 * Useful for search functionality and auto-save features
 */
export function debounce<T extends (...args: any[]) => any>(
	func: T,
	wait: number
): (...args: Parameters<T>) => void {
	let timeout: ReturnType<typeof setTimeout>;
	return (...args: Parameters<T>) => {
		clearTimeout(timeout);
		timeout = setTimeout(() => func(...args), wait);
	};
}

/**
 * Throttles function calls to limit execution frequency
 * Useful for scroll events and resize handlers
 */
export function throttle<T extends (...args: any[]) => any>(
	func: T,
	limit: number
): (...args: Parameters<T>) => void {
	let inThrottle: boolean;
	return (...args: Parameters<T>) => {
		if (!inThrottle) {
			func(...args);
			inThrottle = true;
			setTimeout(() => (inThrottle = false), limit);
		}
	};
}

/**
 * Validates SQL query syntax (basic validation)
 * Returns an object with validation status and error message if any
 */
export function validateQuery(query: string): { isValid: boolean; error?: string } {
	const trimmedQuery = query.trim();
	
	if (!trimmedQuery) {
		return { isValid: false, error: 'Query cannot be empty' };
	}

	// Basic SQL keyword validation
	const sqlKeywords = /^(SELECT|INSERT|UPDATE|DELETE|WITH|CREATE|ALTER|DROP)\s/i;
	if (!sqlKeywords.test(trimmedQuery)) {
		return { isValid: false, error: 'Query must start with a valid SQL keyword' };
	}

	// Check for balanced parentheses
	const openParens = (trimmedQuery.match(/\(/g) || []).length;
	const closeParens = (trimmedQuery.match(/\)/g) || []).length;
	if (openParens !== closeParens) {
		return { isValid: false, error: 'Unbalanced parentheses in query' };
	}

	return { isValid: true };
}

/**
 * Simulates query execution with realistic timing
 * Returns a promise that resolves with mock data after a realistic delay
 */
export async function executeQuery(query: string, queryName?: string): Promise<QueryResult> {
	const startTime = performance.now();
	
	// Simulate network delay based on query complexity
	const delay = Math.random() * 200 + 50; // 50-250ms
	await new Promise(resolve => setTimeout(resolve, delay));
	
	let mockData: Record<string, any>[];
	
	// Check if query is asking for orders data
	if (query.toLowerCase().includes('orders') || query.toLowerCase().includes('order')) {
		try {
			// Load real CSV data
			mockData = await loadCSVData('/orders.csv');
			
			// Apply simple filtering based on query
			mockData = applyQueryFiltering(mockData, query);
		} catch (error) {
			console.warn('Failed to load CSV data, falling back to mock data:', error);
			mockData = generateMockData(query);
		}
	} else {
		// Generate mock data based on query type
		mockData = generateMockData(query);
	}
	
	const endTime = performance.now();
	const executionTime = endTime - startTime;

	return {
		id: generateId(),
		name: queryName || 'Untitled Query',
		query,
		data: mockData,
		executionTime,
		rowCount: mockData.length,
		status: 'success',
		timestamp: new Date()
	};
}

/**
 * Applies basic filtering to data based on SQL query
 * This is a simplified implementation for demonstration
 */
function applyQueryFiltering(data: Record<string, any>[], query: string): Record<string, any>[] {
	const lowerQuery = query.toLowerCase();
	
	// Simple LIMIT handling
	const limitMatch = lowerQuery.match(/limit\s+(\d+)/);
	if (limitMatch) {
		const limit = parseInt(limitMatch[1]);
		data = data.slice(0, limit);
	}
	
	// Simple WHERE filtering for common patterns
	if (lowerQuery.includes('where')) {
		// Example: WHERE shipCountry = 'France'
		const countryMatch = lowerQuery.match(/shipcountry\s*=\s*['"]([^'"]+)['"]/);
		if (countryMatch) {
			const country = countryMatch[1];
			data = data.filter(row => 
				row.shipCountry && row.shipCountry.toLowerCase() === country.toLowerCase()
			);
		}
		
		// Example: WHERE freight > 50
		const freightMatch = lowerQuery.match(/freight\s*>\s*(\d+)/);
		if (freightMatch) {
			const threshold = parseFloat(freightMatch[1]);
			data = data.filter(row => 
				row.freight && parseFloat(row.freight) > threshold
			);
		}
	}
	
	// Apply a reasonable limit to prevent overwhelming the UI, but allow more data
	if (data.length > 1000) {
		data = data.slice(0, 1000);
	}
	
	return data;
}

/**
 * Generates realistic mock data based on query analysis
 * Analyzes the query to determine appropriate column names and data types
 */
function generateMockData(query: string): Record<string, any>[] {
	const lowerQuery = query.toLowerCase();
	
	// Determine data set based on query content
	if (lowerQuery.includes('customer') || lowerQuery.includes('user')) {
		return generateCustomerData();
	} else if (lowerQuery.includes('order') || lowerQuery.includes('purchase')) {
		return generateOrderData();
	} else if (lowerQuery.includes('product') || lowerQuery.includes('item')) {
		return generateProductData();
	} else {
		return generateGenericData();
	}
}

/**
 * Generates mock customer data
 */
function generateCustomerData(): Record<string, any>[] {
	const customers = [];
	const firstNames = ['John', 'Jane', 'Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
	const lastNames = ['Smith', 'Doe', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller'];
	
	for (let i = 1; i <= 50; i++) {
		const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
		const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
		
		customers.push({
			id: i,
			name: `${firstName} ${lastName}`,
			email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@email.com`,
			age: Math.floor(Math.random() * 50) + 18,
			city: ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix'][Math.floor(Math.random() * 5)],
			total_orders: Math.floor(Math.random() * 20) + 1,
			created_date: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
		});
	}
	
	return customers;
}

/**
 * Generates mock order data
 */
function generateOrderData(): Record<string, any>[] {
	const orders = [];
	const statuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
	
	for (let i = 1; i <= 100; i++) {
		orders.push({
			order_id: i,
			customer_id: Math.floor(Math.random() * 50) + 1,
			product_name: `Product ${Math.floor(Math.random() * 20) + 1}`,
			quantity: Math.floor(Math.random() * 5) + 1,
			price: (Math.random() * 200 + 10).toFixed(2),
			status: statuses[Math.floor(Math.random() * statuses.length)],
			order_date: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
		});
	}
	
	return orders;
}

/**
 * Generates mock product data
 */
function generateProductData(): Record<string, any>[] {
	const products = [];
	const categories = ['Electronics', 'Clothing', 'Books', 'Home & Garden', 'Sports'];
	
	for (let i = 1; i <= 30; i++) {
		products.push({
			product_id: i,
			name: `Product ${i}`,
			category: categories[Math.floor(Math.random() * categories.length)],
			price: (Math.random() * 500 + 5).toFixed(2),
			stock_quantity: Math.floor(Math.random() * 100),
			rating: (Math.random() * 2 + 3).toFixed(1), // 3.0 to 5.0
			is_active: Math.random() > 0.1 // 90% active
		});
	}
	
	return products;
}

/**
 * Generates generic mock data for unknown query types
 */
function generateGenericData(): Record<string, any>[] {
	const data = [];
	
	for (let i = 1; i <= 25; i++) {
		data.push({
			id: i,
			name: `Item ${i}`,
			value: Math.floor(Math.random() * 1000),
			description: `Description for item ${i}`,
			created_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString()
		});
	}
	
	return data;
}

/**
 * Exports data to CSV format with SSR support
 * Handles nested objects and arrays appropriately
 */
export function exportToCSV(data: Record<string, any>[], filename: string = 'query_results.csv'): void {
	// Check if we're in a browser environment
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		console.warn('CSV export is only available in browser environment');
		return;
	}
	
	if (!data.length) return;

	const headers = Object.keys(data[0]);
	const csvContent = [
		headers.join(','),
		...data.map(row => 
			headers.map(header => {
				const value = row[header];
				// Handle special characters and quotes in CSV
				if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
					return `"${value.replace(/"/g, '""')}"`;
				}
				return value;
			}).join(',')
		)
	].join('\n');

	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	const url = URL.createObjectURL(blob);
	link.setAttribute('href', url);
	link.setAttribute('download', filename);
	link.style.visibility = 'hidden';
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

/**
 * Copies text to clipboard with fallback for older browsers and SSR support
 */
export async function copyToClipboard(text: string): Promise<boolean> {
	// Check if we're in a browser environment
	if (typeof window === 'undefined' || typeof navigator === 'undefined') {
		return false;
	}
	
	try {
		if (navigator.clipboard && window.isSecureContext) {
			await navigator.clipboard.writeText(text);
			return true;
		} else {
			// Fallback for older browsers
			const textArea = document.createElement('textarea');
			textArea.value = text;
			textArea.style.position = 'fixed';
			textArea.style.opacity = '0';
			document.body.appendChild(textArea);
			textArea.focus();
			textArea.select();
			const successful = document.execCommand('copy');
			document.body.removeChild(textArea);
			return successful;
		}
	} catch (error) {
		console.error('Failed to copy text to clipboard:', error);
		return false;
	}
}

/**
 * Parses CSV content into an array of objects
 * Handles quoted fields, escaped quotes, and different line endings
 */
export function parseCSV(csvContent: string): Record<string, any>[] {
	const lines = csvContent.trim().split(/\r?\n/);
	if (lines.length === 0) return [];

	const headers = parseCSVLine(lines[0]);
	const data: Record<string, any>[] = [];

	for (let i = 1; i < lines.length; i++) {
		const values = parseCSVLine(lines[i]);
		if (values.length === headers.length) {
			const row: Record<string, any> = {};
			headers.forEach((header, index) => {
				row[header] = values[index];
			});
			data.push(row);
		}
	}

	return data;
}

/**
 * Parses a single CSV line, handling quoted fields and escaped quotes
 */
function parseCSVLine(line: string): string[] {
	const result: string[] = [];
	let current = '';
	let inQuotes = false;
	let i = 0;

	while (i < line.length) {
		const char = line[i];

		if (char === '"') {
			if (inQuotes && line[i + 1] === '"') {
				// Escaped quote
				current += '"';
				i += 2;
			} else {
				// Toggle quote state
				inQuotes = !inQuotes;
				i++;
			}
		} else if (char === ',' && !inQuotes) {
			// Field separator
			result.push(current.trim());
			current = '';
			i++;
		} else {
			current += char;
			i++;
		}
	}

	// Add the last field
	result.push(current.trim());
	return result;
}

/**
 * Loads and parses CSV data from a file path
 * Returns a promise that resolves with parsed data
 */
export async function loadCSVData(filePath: string): Promise<Record<string, any>[]> {
	try {
		const response = await fetch(filePath);
		if (!response.ok) {
			throw new Error(`Failed to load CSV: ${response.statusText}`);
		}
		const csvContent = await response.text();
		return parseCSV(csvContent);
	} catch (error) {
		console.error('Error loading CSV data:', error);
		throw error;
	}
}

/**
 * Local storage utilities with error handling and SSR support
 */
export const storage = {
	/**
	 * Safely gets an item from localStorage
	 */
	get<T>(key: string, defaultValue: T): T {
		// Check if we're in a browser environment
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
			return defaultValue;
		}
		
		try {
			const item = localStorage.getItem(key);
			return item ? JSON.parse(item) : defaultValue;
		} catch (error) {
			console.error(`Error reading from localStorage key "${key}":`, error);
			return defaultValue;
		}
	},

	/**
	 * Safely sets an item in localStorage
	 */
	set(key: string, value: any): boolean {
		// Check if we're in a browser environment
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
			return false;
		}
		
		try {
			localStorage.setItem(key, JSON.stringify(value));
			return true;
		} catch (error) {
			console.error(`Error writing to localStorage key "${key}":`, error);
			return false;
		}
	},

	/**
	 * Safely removes an item from localStorage
	 */
	remove(key: string): boolean {
		// Check if we're in a browser environment
		if (typeof window === 'undefined' || typeof localStorage === 'undefined') {
			return false;
		}
		
		try {
			localStorage.removeItem(key);
			return true;
		} catch (error) {
			console.error(`Error removing localStorage key "${key}":`, error);
			return false;
		}
	}
};
