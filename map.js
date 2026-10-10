let currentMapIndex = 0;
let isEditMode = false;
let draggedPoint = null;
let draggedDot = null;

// Переменные для зума и панорамирования
let scale = 1;
let pointX = 0, pointY = 0;
let startX = 0, startY = 0;
let panning = false;
let pinchStartDist = 0;
let startScale = 1;

document.addEventListener('DOMContentLoaded', () => {
    if (typeof mapData === 'undefined') {
        alert("Ошибка: Файл данных mapData.js не загрузился.");
        return;
    }

    const selector = document.getElementById('map-selector');
    mapData.forEach((map, index) => {
        const opt = document.createElement('option');
        opt.value = index;
        opt.textContent = map.name || `Объект ${index + 1}`;
        selector.appendChild(opt);
    });

    const toggle = document.getElementById('edit-mode-toggle');
    const saveBtn = document.getElementById('save-drag-btn');

    toggle.addEventListener('change', (e) => {
        isEditMode = e.target.checked;
        if (isEditMode) {
            saveBtn.classList.remove('hidden');
            document.querySelectorAll('.map-point').forEach(dot => dot.classList.add('draggable'));
            closePopup(); 
        } else {
            saveBtn.classList.add('hidden');
            document.querySelectorAll('.map-point').forEach(dot => dot.classList.remove('draggable'));
        }
    });

    // Логика перемещения точек в режиме редактирования
    const mapTransformWrapper = document.getElementById('map-transform-wrapper');

    function updateDotPosition(clientX, clientY) {
        const rect = mapTransformWrapper.getBoundingClientRect(); 
        // Рассчитываем процент с учетом текущего зума (rect учитывает transform: scale)
        let x = ((clientX - rect.left) / rect.width) * 100;
        let y = ((clientY - rect.top) / rect.height) * 100;
        
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        
        draggedDot.style.left = x + '%';
        draggedDot.style.top = y + '%';
        
        draggedPoint.x = parseFloat(x.toFixed(2));
        draggedPoint.y = parseFloat(y.toFixed(2));
    }

    document.addEventListener('mousemove', (e) => {
        if (!isEditMode || !draggedDot) return;
        updateDotPosition(e.clientX, e.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        if (!isEditMode || !draggedDot) return;
        e.preventDefault(); 
        updateDotPosition(e.touches[0].clientX, e.touches[0].clientY);
    }, {passive: false});

    const stopDragging = () => {
        if (draggedDot) {
            draggedDot.classList.remove('dragging');
            draggedDot = null;
            draggedPoint = null;
        }
    };
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDragging);

    initPanAndZoom();

    if(mapData.length > 0) loadMap(0);
});

// Настройка зума и перемещения карты
function initPanAndZoom() {
    const mapContainer = document.getElementById('map-container');
    const mapTransformWrapper = document.getElementById('map-transform-wrapper');

    function setTransform() {
        // Ограничиваем сдвиг, чтобы карта не улетала за экран
        mapTransformWrapper.style.transform = `translate(${pointX}px, ${pointY}px) scale(${scale})`;
    }

    // --- Обработка мобильных жестов (Тач) ---
    mapContainer.addEventListener('touchstart', (e) => {
        if (draggedDot && isEditMode) return;
        
        if (e.touches.length === 2) {
            panning = false;
            pinchStartDist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            startScale = scale;
        } else if (e.touches.length === 1) {
            panning = true;
            startX = e.touches[0].clientX - pointX;
            startY = e.touches[0].clientY - pointY;
        }
    }, {passive: false});

    mapContainer.addEventListener('touchmove', (e) => {
        if (draggedDot && isEditMode) return;
        e.preventDefault(); // Блокируем скролл страницы браузером

        if (e.touches.length === 2) {
            const dist = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            // Масштаб от 1 до 5
            scale = Math.min(Math.max(1, startScale * (dist / pinchStartDist)), 5);
            setTransform();
        } else if (e.touches.length === 1 && panning) {
            pointX = e.touches[0].clientX - startX;
            pointY = e.touches[0].clientY - startY;
            setTransform();
        }
    }, {passive: false});

    mapContainer.addEventListener('touchend', (e) => {
        if (e.touches.length < 2) {
            if (e.touches.length === 1) {
                 startX = e.touches[0].clientX - pointX;
                 startY = e.touches[0].clientY - pointY;
            } else {
                 panning = false;
            }
        }
    });

    // --- Обработка десктопной мыши (Скролл и Перетаскивание) ---
    mapContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        const xs = (e.clientX - pointX) / scale;
        const ys = (e.clientY - pointY) / scale;
        const delta = (e.wheelDelta ? e.wheelDelta : -e.deltaY);
        (delta > 0) ? (scale *= 1.2) : (scale /= 1.2);
        scale = Math.min(Math.max(1, scale), 5); // Ограничения масштаба
        pointX = e.clientX - xs * scale;
        pointY = e.clientY - ys * scale;
        setTransform();
    }, {passive: false});

    mapContainer.addEventListener('mousedown', (e) => {
        if (isEditMode && draggedDot) return;
        panning = true;
        startX = e.clientX - pointX;
        startY = e.clientY - pointY;
    });

    mapContainer.addEventListener('mousemove', (e) => {
        if (!panning || (isEditMode && draggedDot)) return;
        pointX = e.clientX - startX;
        pointY = e.clientY - startY;
        setTransform();
    });

    window.addEventListener('mouseup', () => { panning = false; });
}

window.switchMap = function(index) {
    loadMap(parseInt(index));
};

function loadMap(index) {
    currentMapIndex = index;
    const mapInfo = mapData[currentMapIndex];
    
    // Загружаем картинку в <img>
    document.getElementById('map-image').src = mapInfo.image;
    
    // Сбрасываем позицию карты
    scale = 1; pointX = 0; pointY = 0;
    document.getElementById('map-transform-wrapper').style.transform = `translate(0px, 0px) scale(1)`;
    
    const pointsLayer = document.getElementById('points-layer');
    pointsLayer.innerHTML = '';
    closePopup();
    
    if(!mapInfo.points) mapInfo.points = [];
    
    mapInfo.points.forEach(point => {
        const dot = document.createElement('div');
        dot.className = 'map-point' + (isEditMode ? ' draggable' : '');
        dot.title = point.name;
        dot.textContent = parseInt(point.id, 10) || point.id;
        dot.style.left = point.x + '%';
        dot.style.top = point.y + '%';
        
        dot.onclick = (e) => {
            if (isEditMode) return; 
            showPopup(point);
        };

        dot.onmousedown = (e) => {
            if (!isEditMode) return;
            e.preventDefault(); 
            draggedPoint = point;
            draggedDot = dot;
            dot.classList.add('dragging');
        };

        dot.addEventListener('touchstart', (e) => {
            if (!isEditMode) return;
            e.stopPropagation(); // Не сдвигать карту при захвате точки
            draggedPoint = point;
            draggedDot = dot;
            dot.classList.add('dragging');
        }, {passive: false});
        
        pointsLayer.appendChild(dot);
    });
}

window.exportMapData = function() {
    const jsCode = `const mapData = ${JSON.stringify(mapData, null, 4)};`;
    const blob = new Blob([jsCode], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'mapData.js';
    a.click();
    
    URL.revokeObjectURL(url);
    alert("✅ Изменения сохранены! Файл mapData.js скачан.\n\nЗамените старый файл в папке проекта новым.");
};

function showPopup(point) {
    document.getElementById('popup-title').textContent = point.name || `Точка ${point.id}`;
    
    const buriedEl = document.getElementById('popup-buried');
    if(point.buried && point.buried.trim() !== '') {
        buriedEl.innerHTML = point.buried;
    } else {
        buriedEl.innerHTML = '<span style="color:#94a3b8; font-style:italic">Информация отсутствует</span>';
    }

    const artEl = document.getElementById('popup-art');
    if(point.art && point.art.trim() !== '') {
        artEl.innerHTML = point.art;
    } else {
        artEl.innerHTML = '<span style="color:#94a3b8; font-style:italic">Информация отсутствует</span>';
    }
    
    document.getElementById('popup').classList.remove('hidden');
}

function closePopup() {
    document.getElementById('popup').classList.add('hidden');
}