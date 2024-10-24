(function() {
    "use strict";

    // Получение значения cookie по имени
    var getCookie = function(name) {
        var value = '; ' + document.cookie;
        var parts = value.split('; ' + name + '=');
        if (parts.length === 2) return parts.pop().split(';').shift();
    };

    // Отправка запроса
    var request = function(method, url, data, headers, el, showProgress, cb) {
        var req = new XMLHttpRequest();
        req.open(method, url, true);

        Object.keys(headers).forEach(function(key) {
            req.setRequestHeader(key, headers[key]);
        });

        req.onload = function() {
            cb(req.status, req.responseText);
        };

        req.onerror = req.onabort = function() {
            disableSubmit(false);
            error(el, 'Sorry, failed to upload image.');
        };

        req.upload.onprogress = function(data) {
            progressBar(el, data, showProgress);
        };

        req.send(data);
    };

    // Парсинг JSON
    var parseJson = function(json) {
        var data;
        try {
            data = JSON.parse(json);
        } catch (e) {
            data = null;
        }
        return data;
    };

    // Обновление прогресс-бара
    var progressBar = function(el, data, showProgress) {
        if (data.lengthComputable === false || showProgress === false) return;

        var pcnt = Math.round(data.loaded * 100 / data.total);
        var bar = el.querySelector('.bar');

        if (bar) {
            bar.style.width = pcnt + '%';
        }
    };

    // Обработка ошибки
    var error = function(el, msg) {
        el.className = 'ajaximage form-active';
        var filePath = el.querySelector('.file-path');
        var fileInput = el.querySelector('.file-input');

        if (filePath) filePath.value = '';
        if (fileInput) fileInput.value = '';

        alert(msg);
    };

    // Обновление элемента после успешной загрузки
    var update = function(el, data) {
        var link = el.querySelector('.file-link');
        var path = el.querySelector('.file-path');
        var img = el.querySelector('.file-img');

        if (link) link.setAttribute('href', data.url);
        if (path) path.value = data.filename;
        if (img) img.src = data.url;

        el.className = 'ajaximage img-active';
        var bar = el.querySelector('.bar');
        if (bar) bar.style.width = '0%';
    };

    // Отключение/включение кнопок отправки
    var concurrentUploads = 0;
    var disableSubmit = function(status) {
        var submitRow = document.querySelector('.submit-row');
        if (!submitRow) return;

        var buttons = submitRow.querySelectorAll('input[type=submit]');

        if (status === true) concurrentUploads++;
        else concurrentUploads--;

        buttons.forEach(function(el) {
            el.disabled = (concurrentUploads !== 0);
        });
    };

    // Обработка загрузки файла
    var upload = function(e) {
        var el = e.target.parentElement;
        var fileInput = el.querySelector('.file-input');
        var file = fileInput ? fileInput.files[0] : null;
        var dest = el.querySelector('.file-dest').value;
        var form = new FormData();
        var headers = { 'X-CSRFToken': getCookie('csrftoken') };
        var regex = /jpg|jpeg|png|gif|svg/i;

        if (!file || !regex.test(file.type)) {
            return alert('Incorrect image format. Allowed (jpg, gif, png, svg).');
        }

        el.className = 'ajaximage progress-active';
        disableSubmit(true);
        form.append('file', file);

        request('POST', dest, form, headers, el, true, function(status, json) {
            disableSubmit(false);

            var data = parseJson(json);

            switch (status) {
                case 200:
                    update(el, data);
                    break;
                case 400:
                case 403:
                    error(el, data ? data.error : 'Error message not provided.');
                    break;
                default:
                    error(el, 'Sorry, could not upload image.');
            }
        });
    };

    // Удаление загруженного файла
    var removeUpload = function(e) {
        e.preventDefault();

        var el = e.target.parentElement;
        var filePath = el.querySelector('.file-path');
        var fileInput = el.querySelector('.file-input');

        if (filePath) filePath.value = '';
        if (fileInput) fileInput.value = '';

        el.className = 'ajaximage form-active';
    };

    // Добавление обработчиков событий
    var addHandlers = function(el) {
        var input = el.querySelector('.file-input');
        var remove = el.querySelector('.file-remove');
        var path = el.querySelector('.file-path');
        var status = (path && path.value === '') ? 'form' : 'img';

        el.className = 'ajaximage ' + status + '-active';

        if (remove) remove.addEventListener('click', removeUpload, false);
        if (input) input.addEventListener('change', upload, false);
    };

    // Добавление обработчиков для существующих элементов
    document.addEventListener('DOMContentLoaded', function(e) {
        document.querySelectorAll('.ajaximage').forEach(addHandlers);
    });

    // Наблюдение за изменениями DOM
    const observer = new MutationObserver((mutationsList) => {
        for (const mutation of mutationsList) {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        const el = node.querySelector('.ajaximage');
                        if (el) addHandlers(el);
                    }
                });
            }
        }
    });

    const observableContainer = document.documentElement || document.body;

    try {
        observer.observe(observableContainer, {
            childList: true,
            subtree: true
        });
    } catch (e) {
        console.warn('Error with handling mutation observer with message: ' + e);
    }
})();
