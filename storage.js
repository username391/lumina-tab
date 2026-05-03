const Storage = {
	async getSettings() {
		return new Promise((resolve) => {
			chrome.storage.local.get(['settings'], (result) => {
				const defaults = {
					theme: 'theme-auto',
					folderStyle: 'solid',
					lang: 'en',
					startFolderId: '1',
					hiddenFolders: [],
					showCount: true,
					bgImage: '',
					bgColor: ''
				};
				resolve({ ...defaults, ...result.settings });
			});
		});
	},

	async saveSettings(settings) {
		return new Promise((resolve) => {
			chrome.storage.local.set({ settings }, resolve);
		});
	},

	// Работа с системными закладками
	async getBookmarks(parentId) {
		return new Promise((resolve) => {
			chrome.bookmarks.getChildren(parentId, (children) => {
				resolve(children || []);
			});
		});
	},

	async getFolder(id) {
		return new Promise((resolve) => {
			if (!id) return resolve(null);
			chrome.bookmarks.get(id, (results) => {
				if (chrome.runtime.lastError) {
					resolve(null);
				} else {
					resolve(results ? results[0] : null);
				}
			});
		});
	},

	async createBookmark(parentId, title, url) {
		return new Promise((resolve) => {
			chrome.bookmarks.create({ parentId, title, url }, resolve);
		});
	},

	async createFolder(parentId, title) {
		return new Promise((resolve) => {
			chrome.bookmarks.create({ parentId, title }, resolve);
		});
	},

	async updateBookmark(id, title, url) {
		return new Promise((resolve) => {
			const updates = { title };
			if (url) updates.url = url;
			chrome.bookmarks.update(id, updates, resolve);
		});
	},

	async deleteBookmark(id) {
		return new Promise((resolve) => {
			chrome.bookmarks.get(id, (results) => {
				if (results && results[0].url) {
					chrome.bookmarks.remove(id, resolve);
				} else {
					chrome.bookmarks.removeTree(id, resolve);
				}
			});
		});
	},

	async moveBookmark(id, parentId, index) {
		return new Promise((resolve) => {
			chrome.bookmarks.move(id, { parentId, index }, resolve);
		});
	},

	async importBookmarks(parentId, bookmarks) {
		for (const item of bookmarks) {
			if (item.url) {
				await this.createBookmark(parentId, item.title, item.url);
			} else {
				const folder = await this.createFolder(parentId, item.title);
				if (folder && item.children && item.children.length > 0) {
					await Storage.importBookmarks(folder.id, item.children);
				}
			}
		}
	},

	async getFullTree() {
		return new Promise((resolve) => {
			chrome.bookmarks.getTree(resolve);
		});
	},

	async getCachedFavicon(url) {
		return new Promise((resolve) => {
			const domain = new URL(url).hostname;
			chrome.storage.local.get([`fav_${domain}`], (result) => {
				resolve(result[`fav_${domain}`] || null);
			});
		});
	},

	async cacheFavicon(url, dataUrl) {
		const domain = new URL(url).hostname;
		chrome.storage.local.set({ [`fav_${domain}`]: dataUrl });
	},

	async clearFaviconCache() {
		return new Promise((resolve) => {
			chrome.storage.local.get(null, (items) => {
				const keysToRemove = Object.keys(items).filter(key => key.startsWith('fav_'));
				chrome.storage.local.remove(keysToRemove, resolve);
			});
		});
	},

	async getAllFolders() {
		const tree = await this.getFullTree();
		const folders = [];
		const traverse = (nodes) => {
			for (const node of nodes) {
				if (!node.url) {
					folders.push({ id: node.id, title: node.title || 'Root' });
					if (node.children) traverse(node.children);
				}
			}
		};
		traverse(tree);
		return folders;
	}
};

