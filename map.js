let currentMapIndex = 0;
let isEditMode = false;
let draggedPoint = null;
let draggedDot = null;

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

    const container = document.getElementById('map-background');
    
    document.addEventListener('mousemove', (e) => {
        if (!isEditMode || !draggedDot) return;
        updateDotPosition(e.clientX, e.clientY);
    });

    document.addEventListener('touchmove', (e) => {
        if (!isEditMode || !draggedDot) return;
        e.preventDefault(); 
        const touch = e.touches[0];
        updateDotPosition(touch.clientX, touch.clientY);
    }, {passive: false});

    function updateDotPosition(clientX, clientY) {
        const rect = container.parentElement.getBoundingClientRect(); 
        let x = ((clientX - rect.left) / rect.width) * 100;
        let y = ((clientY - rect.top) / rect.height) * 100;
        
        x = Math.max(0, Math.min(100, x));
        y = Math.max(0, Math.min(100, y));
        
        draggedDot.style.left = x + '%';
        draggedDot.style.top = y + '%';
        
        draggedPoint.x = parseFloat(x.toFixed(2));
        draggedPoint.y = parseFloat(y.toFixed(2));
    }

    const stopDragging = () => {
        if (draggedDot) {
            draggedDot.classList.remove('dragging');
            draggedDot = null;
            draggedPoint = null;
        }
    };
    document.addEventListener('mouseup', stopDragging);
    document.addEventListener('touchend', stopDragging);

    if(mapData.length > 0) loadMap(0);
});

window.switchMap = function(index) {
    loadMap(parseInt(index));
};

function loadMap(index) {
    currentMapIndex = index;
    const mapInfo = mapData[currentMapIndex];
    
    document.getElementById('map-background').style.backgroundImage = `url('${mapInfo.image}')`;
    
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
