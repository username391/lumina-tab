const UI = {
	elements: {
		grid: document.getElementById('grid-container'),
		breadcrumb: document.getElementById('breadcrumb'),
		settingsModal: document.getElementById('settings-modal'),
		addModal: document.getElementById('add-modal'),
		contextMenu: document.getElementById('context-menu'),
		themeSelect: document.getElementById('theme-select'),
		langSelect: document.getElementById('lang-select'),
		folderStyleSelect: document.getElementById('folder-style-select'),
		startFolderSelect: document.getElementById('start-folder-select'),
		notificationContainer: document.getElementById('notification-container'),
		hiddenFoldersMenu: document.getElementById('hidden-folders-menu'),
		hiddenFoldersList: document.getElementById('hidden-folders-list')
	},

	notify(message, type = 'info') {
		const div = document.createElement('div');
		div.className = `notification ${type}`;
		div.textContent = message;
		this.elements.notificationContainer.appendChild(div);
		setTimeout(() => div.remove(), 3000);
	},

	async render(items, currentFolder, settings) {
		// Handle Auto Language
		let lang = settings.lang;
		if (lang === 'auto') {
			lang = navigator.language.startsWith('ru') ? 'ru' : 'en';
		}
		setLanguage(lang);

		// Clear grid safely
		while (this.elements.grid.firstChild) {
			this.elements.grid.removeChild(this.elements.grid.firstChild);
		}

		// Handle Auto Theme
		let themeClass = settings.theme;
		if (themeClass === 'theme-auto') {
			const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
			themeClass = prefersDark ? 'theme-dark' : 'theme-light';
		}
		document.body.className = themeClass;

		// Apply Background
		if (settings.bgImage) {
			document.body.style.backgroundImage = `url(${settings.bgImage})`;
		} else {
			document.body.style.backgroundImage = 'none';
		}
		if (settings.bgColor) {
			document.body.style.backgroundColor = settings.bgColor;
		} else {
			document.body.style.backgroundColor = '';
		}

		const hiddenFolders = settings.hiddenFolders || [];
		const filteredItems = items.filter(item => !hiddenFolders.includes(item.id));

		for (const item of filteredItems) {
			const tile = await this.createTile(item, settings);
			this.elements.grid.appendChild(tile);
		}

		// Add Button
		const addTile = document.createElement('div');
		addTile.className = 'tile add-tile';
		const plusSpan = document.createElement('span');
		plusSpan.style.fontSize = '2.5rem';
		plusSpan.textContent = '+';
		addTile.appendChild(plusSpan);
		addTile.addEventListener('click', () => App.showAddModal());
		this.elements.grid.appendChild(addTile);

		await this.renderBreadcrumbs(currentFolder);
	},

	async createTile(item, settings) {
		const isFolder = !item.url;
		const tile = document.createElement(isFolder ? 'div' : 'a');
		tile.className = `tile ${isFolder ? 'folder' : 'bookmark'} ${isFolder ? settings.folderStyle : ''}`;
		tile.dataset.id = item.id;
		tile.draggable = true;

		if (!isFolder) {
			tile.href = item.url;

			const img = document.createElement('img');
			img.className = 'tile-icon';
			img.src = 'icons/icon48.png';

			const titleDiv = document.createElement('div');
			titleDiv.className = 'tile-title';
			titleDiv.textContent = item.title || t('untitled');

			tile.appendChild(img);
			tile.appendChild(titleDiv);

			const loadFavicon = async () => {
				const cached = await Storage.getCachedFavicon(item.url);
				if (cached) {
					img.src = cached;
				} else {
					const iconUrl = `https://www.google.com/s2/favicons?domain=${new URL(item.url).hostname}&sz=64`;
					img.src = iconUrl;
					img.onload = () => {
						const canvas = document.createElement('canvas');
						canvas.width = img.naturalWidth;
						canvas.height = img.naturalHeight;
						const ctx = canvas.getContext('2d');
						ctx.drawImage(img, 0, 0);
						try {
							const dataUrl = canvas.toDataURL();
							Storage.cacheFavicon(item.url, dataUrl);
						} catch (e) { }
					};
				}
			};
			loadFavicon();
			img.onerror = () => { img.src = 'icons/icon48.png'; };
		} else {
			let previewContainer;
			const children = await Storage.getBookmarks(item.id);
			const count = children.length;

			if (settings.folderStyle === 'glass') {
				previewContainer = document.createElement('div');
				previewContainer.className = 'folder-preview';

				const bookmarks = children.filter(c => c.url);
				const subfolders = children.filter(c => !c.url);

				for (let i = 0; i < 4; i++) {
					const imgWrapper = document.createElement('div');
					imgWrapper.className = 'preview-item';

					if (bookmarks[i]) {
						const domain = new URL(bookmarks[i].url).hostname;
						const cIcon = `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
						const pImg = document.createElement('img');
						pImg.className = 'preview-img';
						pImg.src = cIcon;
						pImg.addEventListener('error', () => { pImg.src = 'icons/icon48.png'; });
						imgWrapper.appendChild(pImg);
					} else if (subfolders[i - bookmarks.length] || (bookmarks.length < 4 && subfolders[i])) {
						const folderIdx = bookmarks.length < 4 ? i - bookmarks.length : i;
						if (subfolders[folderIdx]) {
							imgWrapper.style.display = 'flex';
							imgWrapper.style.alignItems = 'center';
							imgWrapper.style.justifyContent = 'center';
							imgWrapper.style.opacity = '0.6';

							const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
							svg.setAttribute('viewBox', '0 0 64 64');
							svg.style.width = '80%';
							svg.style.height = '80%';
							const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
							path.setAttribute('fill', '#e95420');
							path.setAttribute('d', 'M6,18 C6,15.79 7.79,14 10,14 L54,14 C56.21,14 58,15.79 58,18 L58,50 C58,52.21 56.21,54 54,54 L10,54 C7.79,54 6,52.21 6,50 Z');
							svg.appendChild(path);
							imgWrapper.appendChild(svg);
						}
					}
					previewContainer.appendChild(imgWrapper);
				}
			} else {
				previewContainer = document.createElement('div');
				previewContainer.style.position = 'relative';

				const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
				svg.setAttribute('class', 'folder-icon-svg');
				svg.setAttribute('viewBox', '0 0 64 64');

				const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
				const linearGradient = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
				linearGradient.setAttribute('id', 'yaruTop');
				linearGradient.setAttribute('x1', '0%');
				linearGradient.setAttribute('y1', '0%');
				linearGradient.setAttribute('x2', '100%');
				linearGradient.setAttribute('y2', '0%');

				const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
				stop1.setAttribute('offset', '0%');
				stop1.setAttribute('style', 'stop-color:#811d53;stop-opacity:1');

				const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
				stop2.setAttribute('offset', '100%');
				stop2.setAttribute('style', 'stop-color:#e95420;stop-opacity:1');

				linearGradient.appendChild(stop1);
				linearGradient.appendChild(stop2);
				defs.appendChild(linearGradient);
				svg.appendChild(defs);

				const path1 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path1.setAttribute('fill', '#5e5c64');
				path1.setAttribute('d', 'M6,18 C6,15.79 7.79,14 10,14 L54,14 C56.21,14 58,15.79 58,18 L58,50 C58,52.21 56.21,54 54,54 L10,54 C7.79,54 6,52.21 6,50 Z');

				const path2 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path2.setAttribute('fill', 'url(#yaruTop)');
				path2.setAttribute('d', 'M6,18 C6,15.79 7.79,14 10,14 L24,14 L30,8 L54,8 C56.21,8 58,9.79 58,12 L58,18 L6,18 Z');

				const path3 = document.createElementNS('http://www.w3.org/2000/svg', 'path');
				path3.setAttribute('fill', 'rgba(255,255,255,0.1)');
				path3.setAttribute('d', 'M10,14 L24,14 L30,8 L54,8 C56.21,8 58,9.79 58,12 L58,13 L6,13 L6,18 L6,17 C6,15.79 7.79,14 10,14 Z');

				svg.appendChild(path1);
				svg.appendChild(path2);
				svg.appendChild(path3);
				previewContainer.appendChild(svg);
			}

			if (settings.showCount && count > 0) {
				const badge = document.createElement('div');
				badge.className = 'folder-badge';
				badge.textContent = count;
				previewContainer.appendChild(badge);
			}

			const titleDiv = document.createElement('div');
			titleDiv.className = 'tile-title';
			titleDiv.textContent = item.title || t('untitled');

			tile.appendChild(previewContainer);
			tile.appendChild(titleDiv);

			tile.addEventListener('click', (e) => {
				if (!e.defaultPrevented) App.navigateTo(item.id);
			});
		}

		// Menu Button
		const menuBtn = document.createElement('div');
		menuBtn.className = 'tile-menu-btn';

		const menuSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
		menuSvg.setAttribute('viewBox', '0 0 24 24');
		menuSvg.setAttribute('width', '18');
		menuSvg.setAttribute('height', '18');
		const menuPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
		menuPath.setAttribute('fill', 'currentColor');
		menuPath.setAttribute('d', 'M12,16A2,2 0 0,1 14,18A2,2 0 0,1 12,20A2,2 0 0,1 10,18A2,2 0 0,1 12,16M12,10A2,2 0 0,1 14,12A2,2 0 0,1 12,14A2,2 0 0,1 10,12A2,2 0 0,1 12,10M12,4A2,2 0 0,1 14,6A2,2 0 0,1 12,8A2,2 0 0,1 10,6A2,2 0 0,1 12,4Z');
		menuSvg.appendChild(menuPath);
		menuBtn.appendChild(menuSvg);

		menuBtn.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			App.showContextMenu(e, item);
		});
		tile.appendChild(menuBtn);

		tile.addEventListener('contextmenu', (e) => {
			if (isFolder) {
				e.preventDefault();
				App.showContextMenu(e, item);
			}
		});

		// Drag and Drop
		tile.addEventListener('dragstart', (e) => {
			e.dataTransfer.setData('text/plain', item.id);
			tile.classList.add('dragging');
		});
		tile.addEventListener('dragend', () => {
			tile.classList.remove('dragging');
			document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
			this.hideDropIndicator();
		});
		tile.addEventListener('dragover', (e) => {
			e.preventDefault();
			if (isFolder) {
				tile.classList.add('drag-over');
			} else {
				this.showDropIndicator(e, tile);
			}
		});
		tile.addEventListener('dragleave', () => tile.classList.remove('drag-over'));
		tile.addEventListener('drop', async (e) => {
			e.preventDefault();
			const draggedId = e.dataTransfer.getData('text/plain');
			if (draggedId === item.id) return;

			if (isFolder) {
				await Storage.moveBookmark(draggedId, item.id);
			} else {
				const indicator = document.querySelector('.drop-indicator');
				const parentId = item.parentId;
				const siblings = await Storage.getBookmarks(parentId);
				let targetIndex = siblings.findIndex(i => i.id === item.id);

				if (indicator && indicator.dataset.position === 'after') {
					targetIndex++;
				}

				await Storage.moveBookmark(draggedId, parentId, targetIndex);
			}
			this.hideDropIndicator();
			App.refresh();
		});

		return tile;
	},

	showDropIndicator(e, tile) {
		let indicator = document.querySelector('.drop-indicator');
		if (!indicator) {
			indicator = document.createElement('div');
			indicator.className = 'drop-indicator';
			document.body.appendChild(indicator);
		}
		const rect = tile.getBoundingClientRect();
		const isAfter = e.clientX > rect.left + rect.width / 2;
		indicator.style.top = `${rect.top}px`;
		indicator.style.height = `${rect.height}px`;
		indicator.style.left = isAfter ? `${rect.right + 2}px` : `${rect.left - 6}px`;
		indicator.dataset.targetId = tile.dataset.id;
		indicator.dataset.position = isAfter ? 'after' : 'before';
	},

	hideDropIndicator() {
		const indicator = document.querySelector('.drop-indicator');
		if (indicator) indicator.remove();
	},

	async renderBreadcrumbs(currentFolder) {
		// Clear breadcrumbs safely
		while (this.elements.breadcrumb.firstChild) {
			this.elements.breadcrumb.removeChild(this.elements.breadcrumb.firstChild);
		}

		const path = [];
		let temp = currentFolder;

		while (temp) {
			path.unshift(temp);
			if (temp.parentId && temp.parentId !== '0') {
				temp = await Storage.getFolder(temp.parentId);
			} else {
				break;
			}
		}

		path.forEach((folder, index) => {
			const span = document.createElement('span');
			span.className = 'breadcrumb-item';
			const isRoot = !folder.parentId || folder.parentId === '0';
			span.textContent = isRoot ? t('home') : (folder.title || t('untitled'));
			span.dataset.id = folder.id;

			span.addEventListener('click', () => App.navigateTo(folder.id));

			let dragTimer;
			span.addEventListener('dragover', (e) => {
				e.preventDefault();
				span.classList.add('drag-over');
				if (!dragTimer && App.currentFolderId !== folder.id) {
					dragTimer = setTimeout(() => {
						App.navigateTo(folder.id);
					}, 800);
				}
			});
			span.addEventListener('dragleave', () => {
				span.classList.remove('drag-over');
				clearTimeout(dragTimer);
				dragTimer = null;
			});
			span.addEventListener('drop', async (e) => {
				e.preventDefault();
				clearTimeout(dragTimer);
				const draggedId = e.dataTransfer.getData('text/plain');
				await Storage.moveBookmark(draggedId, folder.id);
				App.refresh();
			});

			this.elements.breadcrumb.appendChild(span);
		});
	}
};

