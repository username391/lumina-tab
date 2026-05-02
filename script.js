const App = {
	settings: { theme: 'theme-dark', folderStyle: 'glass', lang: 'en' },
	currentFolderId: '1', // Default root for Firefox
	currentFolder: null,
	editingItem: null,

	async init() {
		this.settings = await Storage.getSettings();

		// Set Language
		setLanguage(this.settings.lang || 'en');

			// Update UI controls to match settings
			document.getElementById('lang-select').value = this.settings.lang;
			document.getElementById('theme-select').value = this.settings.theme;
			document.getElementById('folder-style-select').value = this.settings.folderStyle;
			document.getElementById('show-count-checkbox').checked = this.settings.showCount;
			document.getElementById('bg-image-input').value = this.settings.bgImage || '';
			document.getElementById('bg-color-input').value = this.settings.bgColor || '#000000';

		// Use start folder from settings or find default
		const tree = await Storage.getFullTree();
		const rootChildren = (tree[0] && tree[0].children) ? tree[0].children : [];
		const defaultFolderId = rootChildren.length > 0 ? rootChildren[0].id : (tree[0] ? tree[0].id : '1');

		if (this.settings.startFolderId) {
			const folder = await Storage.getFolder(this.settings.startFolderId);
			this.currentFolderId = folder ? folder.id : defaultFolderId;
		} else {
			this.currentFolderId = defaultFolderId;
		}

		await this.refresh();
		this.initEventListeners();
		this.initGlobalShortcuts();
		this.populateStartFolderSelect();
	},

	async populateStartFolderSelect() {
		const folders = await Storage.getAllFolders();
		const select = UI.elements.startFolderSelect;
		select.innerHTML = '';

		if (folders.length === 0) {
			const option = document.createElement('option');
			option.textContent = t('noFolders');
			select.appendChild(option);
			return;
		}

		folders.forEach(f => {
			const option = document.createElement('option');
			option.value = f.id;
			option.textContent = f.title || t('untitled');
			if (f.id === this.settings.startFolderId) option.selected = true;
			select.appendChild(option);
		});
	},

	async refresh() {
		this.currentFolder = await Storage.getFolder(this.currentFolderId);
		const items = await Storage.getBookmarks(this.currentFolderId);
		await UI.render(items, this.currentFolder, this.settings);
	},

	initEventListeners() {
		// Settings
		document.getElementById('settings-btn').addEventListener('click', () => this.showModal('settings-modal'));

		document.querySelectorAll('.modal-overlay, .close-modal-btn').forEach(el => {
			el.addEventListener('click', () => this.closeModals());
		});

		// Settings changes
		document.getElementById('theme-select').addEventListener('change', (e) => {
			this.settings.theme = e.target.value;
			this.saveSettings();
		});
		document.getElementById('lang-select').addEventListener('change', (e) => {
			this.settings.lang = e.target.value;
			this.saveSettings();
		});
		document.getElementById('folder-style-select').addEventListener('change', (e) => {
			this.settings.folderStyle = e.target.value;
			this.saveSettings();
		});
		document.getElementById('start-folder-select').addEventListener('change', (e) => {
			this.settings.startFolderId = e.target.value;
			this.saveSettings();
		});
		document.getElementById('show-count-checkbox').addEventListener('change', (e) => {
			this.settings.showCount = e.target.checked;
			this.saveSettings();
		});
		document.getElementById('bg-image-input').addEventListener('change', (e) => {
			this.settings.bgImage = e.target.value;
			this.saveSettings();
		});
		document.getElementById('bg-color-input').addEventListener('change', (e) => {
			this.settings.bgColor = e.target.value;
			this.saveSettings();
		});
		document.getElementById('remove-bg-btn').addEventListener('click', () => {
			this.settings.bgImage = '';
			this.settings.bgColor = '';
			document.getElementById('bg-image-input').value = '';
			document.getElementById('bg-color-input').value = '#000000';
			this.saveSettings();
		});
		document.getElementById('refresh-favicons-btn').addEventListener('click', async () => {
			await Storage.clearFaviconCache();
			UI.notify(t('refreshFavicons'));
			this.refresh();
		});

		// Tabs
		document.querySelectorAll('.tab-btn').forEach(btn => {
			btn.addEventListener('click', () => {
				if (this.editingItem) return; // Disable tab switching during edit
				document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
				btn.classList.add('active');
				const tab = btn.dataset.tab;
				document.getElementById('bookmark-form').classList.toggle('hidden', tab !== 'bookmark');
				document.getElementById('folder-form').classList.toggle('hidden', tab !== 'folder');
			});
		});

		// Save
		document.getElementById('save-btn').addEventListener('click', () => this.handleSave());

		// Context Menu
		document.addEventListener('click', () => {
			UI.elements.contextMenu.classList.add('hidden');
			UI.elements.hiddenFoldersMenu.classList.add('hidden');
		});

		document.getElementById('grid-container').addEventListener('contextmenu', (e) => {
			if (e.target === document.getElementById('grid-container')) {
				e.preventDefault();
				this.showHiddenFoldersMenu(e);
			}
		});

		document.getElementById('ctx-edit').addEventListener('click', () => this.editItem());
		document.getElementById('ctx-hide').addEventListener('click', () => this.hideFolder());
		document.getElementById('ctx-delete').addEventListener('click', () => this.deleteItem());

		// Import/Export
		document.getElementById('export-btn').addEventListener('click', async () => {
			const tree = await Storage.getFullTree();
			Utils.downloadJSON({ bookmarks: tree, settings: this.settings }, 'bookmarks_backup.json');
		});
		document.getElementById('import-btn-trigger').addEventListener('click', () => document.getElementById('import-input').click());
		document.getElementById('import-input').addEventListener('change', (e) => {
			const file = e.target.files[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = async (event) => {
				try {
					const imported = JSON.parse(event.target.result);
						if (imported.settings) {
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
							this.settings = { ...defaults, ...imported.settings };
							await Storage.saveSettings(this.settings);
						}
						
						if (imported.bookmarks && imported.bookmarks.length > 0) {
							UI.notify(t('importing'), 'info');
							await Storage.importBookmarks(this.currentFolderId, imported.bookmarks);
							UI.notify(t('importSuccess'), 'success');
						}
						
						this.refresh();
				} catch (err) { console.error(err); }
			};
			reader.readAsText(file);
		});
	},

	initGlobalShortcuts() {
		window.onkeydown = (e) => {
			if (e.key === 'Escape') this.closeModals();
			if (e.key === 'Enter') {
				const activeModal = document.querySelector('.modal:not(.hidden)');
				if (activeModal) {
					if (activeModal.id === 'add-modal') this.handleSave();
					else if (activeModal.id === 'settings-modal') this.closeModals();
				}
			}
		};
	},

	async saveSettings() {
		await Storage.saveSettings(this.settings);
		this.refresh();
	},

	showModal(id) {
		document.getElementById(id).classList.remove('hidden');
	},

	closeModals() {
		document.querySelectorAll('.modal').forEach(m => m.classList.add('hidden'));
		this.editingItem = null;
	},

	navigateTo(id) {
		this.currentFolderId = id;
		this.refresh();
	},

	showAddModal(item = null) {
		this.editingItem = item;
		const modal = UI.elements.addModal;
		const title = document.getElementById('modal-title');
		const tabs = document.getElementById('modal-tabs');

		if (item) {
			// Check if system folder
			if (!item.url && (item.id === '0' || item.id === '1' || item.id === '2')) {
				UI.notify(t('systemFolderError'), 'error');
				return;
			}

			title.textContent = t('edit');
			tabs.classList.add('hidden');
			if (item.url) {
				document.getElementById('bm-title').value = item.title;
				document.getElementById('bm-url').value = item.url;
				document.getElementById('bookmark-form').classList.remove('hidden');
				document.getElementById('folder-form').classList.add('hidden');
				document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'bookmark'));
			} else {
				document.getElementById('folder-name').value = item.title;
				document.getElementById('bookmark-form').classList.add('hidden');
				document.getElementById('folder-form').classList.remove('hidden');
				document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.tab === 'folder'));
			}
		} else {
			title.textContent = t('add');
			tabs.classList.remove('hidden');
			document.getElementById('bm-title').value = '';
			document.getElementById('bm-url').value = '';
			document.getElementById('folder-name').value = '';
			document.querySelector('[data-tab="bookmark"]').click();
		}
		this.showModal('add-modal');
	},

	showHiddenFoldersMenu(e) {
		const menu = UI.elements.hiddenFoldersMenu;
		const list = UI.elements.hiddenFoldersList;
		list.innerHTML = '';

		const hiddenInCurrent = this.settings.hiddenFolders;
		if (hiddenInCurrent.length === 0) {
			const div = document.createElement('div');
			div.className = 'menu-item';
			div.textContent = t('noFolders');
			list.appendChild(div);
		} else {
			hiddenInCurrent.forEach(async id => {
				const folder = await Storage.getFolder(id);
				if (folder) {
					const div = document.createElement('div');
					div.className = 'menu-item';
					div.innerHTML = `<span>${folder.title || t('untitled')}</span> <span style="color: var(--accent-color)">${t('restore')}</span>`;
						div.addEventListener('click', () => {
							this.settings.hiddenFolders = this.settings.hiddenFolders.filter(fid => fid !== id);
							this.saveSettings();
						});
					list.appendChild(div);
				}
			});
		}

		menu.style.top = `${e.clientY}px`;
		menu.style.left = `${e.clientX}px`;
		menu.classList.remove('hidden');
	},

	hideFolder() {
		if (this.contextItem && !this.contextItem.url) {
			if (!this.settings.hiddenFolders.includes(this.contextItem.id)) {
				this.settings.hiddenFolders.push(this.contextItem.id);
				this.saveSettings();
			}
		}
	},

	async handleSave() {
		const activeTab = document.querySelector('.tab-btn.active').dataset.tab;
		const isFolder = this.editingItem ? !this.editingItem.url : activeTab === 'folder';

		let title = isFolder ? document.getElementById('folder-name').value : document.getElementById('bm-title').value;
		let url = isFolder ? null : document.getElementById('bm-url').value;

		if (!isFolder && url) {
			if (!url.startsWith('http')) url = 'https://' + url;
			// If title is empty, try to use URL as title or it will be "Untitled"
			if (!title) title = url.replace('https://', '').replace('http://', '').split('/')[0];
		}

		if (this.editingItem) {
			await Storage.updateBookmark(this.editingItem.id, title, url);
		} else {
			if (isFolder) await Storage.createFolder(this.currentFolderId, title || t('folder'));
			else await Storage.createBookmark(this.currentFolderId, title || t('bookmark'), url);
		}

		this.closeModals();
		this.refresh();
	},

	showContextMenu(e, item) {
		this.contextItem = item;
		const menu = UI.elements.contextMenu;
		menu.style.top = `${e.clientY}px`;
		menu.style.left = `${e.clientX}px`;
		menu.classList.remove('hidden');
	},

	editItem() {
		this.showAddModal(this.contextItem);
	},

	async deleteItem() {
		await Storage.deleteBookmark(this.contextItem.id);
		this.refresh();
	}
};

App.init();
