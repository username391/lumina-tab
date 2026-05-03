const Utils = {
	generateId: () => Math.random().toString(36).substr(2, 9),

	getFavicon: (url) => {
		try {
			const domain = new URL(url).hostname;
			return `https://www.google.com/s2/favicons?domain=${domain}&sz=64`;
		} catch (e) {
			return '';
		}
	},

	downloadJSON: (data, filename) => {
		const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	}
};
