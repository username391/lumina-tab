const translations = {
	en: {
		home: "Home",
		settings: "Settings",
		theme: "Theme",
		dark: "Dark",
		light: "Light",
		folderStyle: "Folder Style",
			solid: "Icon",
			glass: "Preview",
			data: "Data",
			startFolder: "Start Folder",
			hideFolder: "Hide Folder",
			showHidden: "Show Hidden Folders",
			restore: "Restore",
			noFolders: "No folders found",
			systemFolderError: "Cannot edit system folder",
			hiddenFolders: "Hidden Folders",
			export: "Export",
			import: "Import",
			refreshFavicons: "Refresh Favicons",
			background: "Background",
			bgImage: "Image URL",
			bgColor: "Color",
			removeBg: "Remove Background",
		language: "Language",
		close: "Close",
		add: "Add",
		edit: "Edit",
		delete: "Delete",
		save: "Save",
		cancel: "Cancel",
		bookmark: "Bookmark",
		folder: "Folder",
		title: "Title",
		url: "URL (https://...)",
		folderName: "Folder Name",
			untitled: "Untitled",
			auto: "Auto",
			showCount: "Show item count",
			footerGithub: "GitHub",
				footerTelegram: "Telegram",
				importing: "Importing...",
				importSuccess: "Import successful!"
			},
			ru: {
			home: "Главная",
			settings: "Настройки",
			theme: "Тема",
			dark: "Темная",
			light: "Светлая",
			auto: "Авто",
			showCount: "Показывать количество элементов",
			footerGithub: "GitHub",
				footerTelegram: "Telegram",
				importing: "Импорт...",
				importSuccess: "Импорт завершен!",
			folderStyle: "Стиль папок",
			solid: "Иконка",
			glass: "Превью",
			data: "Данные",
			startFolder: "Стартовая папка",
			hideFolder: "Скрыть папку",
			showHidden: "Показать скрытые папки",
			restore: "Восстановить",
			noFolders: "Папки не найдены",
			systemFolderError: "Нельзя редактировать системную папку",
			hiddenFolders: "Скрытые папки",
			export: "Экспорт",
			import: "Импорт",
			refreshFavicons: "Обновить фавиконки",
			background: "Фон",
			bgImage: "URL картинки",
			bgColor: "Цвет",
			removeBg: "Удалить фон",
		language: "Язык",
		close: "Закрыть",
		add: "Добавить",
		edit: "Редактировать",
		delete: "Удалить",
		save: "Сохранить",
		cancel: "Отмена",
		bookmark: "Закладка",
		folder: "Папка",
		title: "Название",
		url: "URL (https://...)",
		folderName: "Название папки",
		untitled: "Без названия"
	}
};

let currentLang = 'en';

function t(key) {
	const langData = translations[currentLang] || translations['en'];
	return langData[key] || key;
}

function setLanguage(lang) {
	if (translations[lang]) {
		currentLang = lang;
	} else {
		currentLang = 'en';
	}

	document.querySelectorAll('[data-i18n]').forEach(el => {
		const key = el.dataset.i18n;
		const translation = t(key);
		if (el.tagName === 'INPUT' && el.placeholder) {
			el.placeholder = translation;
		} else {
			el.textContent = translation;
		}
	});
}

