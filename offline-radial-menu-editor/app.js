(() => {
  const state = {
    items: [],
    selectedId: null,
    innerRadius: 0.35,
    gapAngle: 2,
    backgroundColor: '#1b1d26'
  };

  const STORAGE_KEY = 'plasticity-radial-menu-editor';
  let idCounter = 1;

  const elements = {
    addItem: document.getElementById('add-item'),
    duplicateItem: document.getElementById('duplicate-item'),
    removeItem: document.getElementById('remove-item'),
    moveUp: document.getElementById('move-up'),
    moveDown: document.getElementById('move-down'),
    itemList: document.getElementById('item-list'),
    itemEditor: document.getElementById('item-editor'),
    itemLabel: document.getElementById('item-label'),
    itemCommand: document.getElementById('item-command'),
    itemKeybind: document.getElementById('item-keybind'),
    itemIcon: document.getElementById('item-icon'),
    itemColor: document.getElementById('item-color'),
    itemWeight: document.getElementById('item-weight'),
    itemWeightValue: document.getElementById('item-weight-value'),
    importFile: document.getElementById('import-file'),
    loadJson: document.getElementById('load-json'),
    exportJson: document.getElementById('export-json'),
    copyJson: document.getElementById('copy-json'),
    jsonOutput: document.getElementById('json-output'),
    canvas: document.getElementById('menu-preview'),
    innerRadius: document.getElementById('inner-radius'),
    innerRadiusValue: document.getElementById('inner-radius-value'),
    gapAngle: document.getElementById('gap-angle'),
    gapAngleValue: document.getElementById('gap-angle-value'),
    backgroundColor: document.getElementById('background-color')
  };

  const ctx = elements.canvas.getContext('2d');

  function createItem(template) {
    const baseColours = ['#6dcff6', '#7d7aff', '#ff9f43', '#00d1b2', '#ff5d8f', '#ffcd3c'];
    const colour = template?.color || baseColours[(state.items.length + 3) % baseColours.length];
    return {
      id: template?.id ?? `item-${Date.now()}-${idCounter++}`,
      label: template?.label || 'New Slice',
      command: template?.command || '',
      keybind: template?.keybind || '',
      icon: template?.icon || '',
      color: colour,
      weight: template?.weight || 1
    };
  }

  function selectItem(id) {
    state.selectedId = id;
    updateItemEditor();
    renderItemList();
    renderPreview();
  }

  function addItem(template) {
    const item = createItem(template);
    state.items.push(item);
    selectItem(item.id);
    persist();
  }

  function duplicateSelected() {
    const item = getSelectedItem();
    if (!item) return;
    const clone = createItem({ ...item, id: undefined });
    const index = state.items.findIndex((i) => i.id === item.id);
    state.items.splice(index + 1, 0, clone);
    selectItem(clone.id);
    persist();
  }

  function removeSelected() {
    const index = state.items.findIndex((item) => item.id === state.selectedId);
    if (index === -1) return;
    state.items.splice(index, 1);
    if (state.items.length === 0) {
      state.selectedId = null;
    } else if (index < state.items.length) {
      state.selectedId = state.items[index].id;
    } else {
      state.selectedId = state.items[state.items.length - 1].id;
    }
    updateItemEditor();
    renderItemList();
    renderPreview();
    persist();
  }

  function moveSelected(offset) {
    const index = state.items.findIndex((item) => item.id === state.selectedId);
    if (index === -1) return;
    const newIndex = index + offset;
    if (newIndex < 0 || newIndex >= state.items.length) return;
    const [item] = state.items.splice(index, 1);
    state.items.splice(newIndex, 0, item);
    renderItemList();
    renderPreview();
    persist();
  }

  function getSelectedItem() {
    if (!state.selectedId) return null;
    return state.items.find((item) => item.id === state.selectedId) || null;
  }

  function updateItemEditor() {
    const item = getSelectedItem();
    const hidden = !item;
    elements.itemEditor.classList.toggle('hidden', hidden);
    elements.removeItem.disabled = hidden;
    elements.duplicateItem.disabled = hidden;
    elements.moveUp.disabled = hidden || state.items.length <= 1 || state.items[0].id === state.selectedId;
    elements.moveDown.disabled = hidden || state.items.length <= 1 || state.items[state.items.length - 1].id === state.selectedId;

    if (!item) return;

    elements.itemLabel.value = item.label;
    elements.itemCommand.value = item.command;
    elements.itemKeybind.value = item.keybind;
    elements.itemIcon.value = item.icon;
    elements.itemColor.value = item.color;
    elements.itemWeight.value = String(item.weight);
    elements.itemWeightValue.textContent = `${item.weight}×`;
  }

  function renderItemList() {
    elements.itemList.innerHTML = '';
    if (state.items.length === 0) {
      const empty = document.createElement('li');
      empty.textContent = 'No items yet — add your first slice.';
      empty.className = 'empty';
      elements.itemList.appendChild(empty);
      return;
    }

    const totalWeight = state.items.reduce((sum, item) => sum + item.weight, 0) || 1;

    state.items.forEach((item, index) => {
      const li = document.createElement('li');
      li.dataset.id = item.id;
      li.classList.toggle('selected', item.id === state.selectedId);

      const meta = document.createElement('div');
      meta.className = 'item-meta';
      const label = document.createElement('strong');
      label.textContent = item.label || `Slice ${index + 1}`;
      const icon = document.createElement('span');
      icon.className = 'badge';
      icon.textContent = item.icon || `${Math.round((item.weight / totalWeight) * 100)}%`;
      meta.append(label, icon);

      const details = document.createElement('div');
      details.className = 'item-details';
      details.textContent = [item.keybind, item.command].filter(Boolean).join(' · ');

      const colorChip = document.createElement('div');
      colorChip.className = 'color-chip';
      colorChip.style.background = item.color;

      li.append(meta, details, colorChip);
      li.addEventListener('click', () => selectItem(item.id));
      elements.itemList.appendChild(li);
    });
  }

  function renderPreview() {
    const { canvas } = elements;
    const { width, height } = canvas;
    const cx = width / 2;
    const cy = height / 2;
    const padding = 24;
    const outerRadius = Math.min(width, height) / 2 - padding;
    const innerRadius = Math.max(0, Math.min(0.85, state.innerRadius)) * outerRadius;
    const items = state.items;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = state.backgroundColor;
    ctx.fillRect(0, 0, width, height);

    if (items.length === 0) {
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '600 20px "Inter", system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Add items to build your radial menu', cx, cy);
      return;
    }

    const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
    const gapDeg = Math.min(Number(elements.gapAngle.value) || 0, 20);
    const gap = (gapDeg * Math.PI) / 180;
    const usableArc = Math.max(Math.PI * 2 - gap * items.length, Math.PI * 0.5);
    let angle = -Math.PI / 2;

    items.forEach((item) => {
      const sliceArc = usableArc * (item.weight / totalWeight);
      const start = angle;
      const end = start + sliceArc;
      const arcStart = start + gap / 2;
      const arcEnd = end - gap / 2;

      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(arcStart) * innerRadius, cy + Math.sin(arcStart) * innerRadius);
      ctx.arc(cx, cy, outerRadius, arcStart, arcEnd);
      ctx.lineTo(cx + Math.cos(arcEnd) * innerRadius, cy + Math.sin(arcEnd) * innerRadius);
      ctx.arc(cx, cy, innerRadius, arcEnd, arcStart, true);
      ctx.closePath();

      const gradient = ctx.createLinearGradient(cx, cy, cx + Math.cos((arcStart + arcEnd) / 2) * outerRadius, cy + Math.sin((arcStart + arcEnd) / 2) * outerRadius);
      gradient.addColorStop(0, shadeColour(item.color, 0.1));
      gradient.addColorStop(1, shadeColour(item.color, -0.1));
      ctx.fillStyle = gradient;
      ctx.fill();

      if (item.id === state.selectedId) {
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 3;
        ctx.stroke();
      }

      // Icon / label
      const mid = (arcStart + arcEnd) / 2;
      const textRadius = innerRadius + (outerRadius - innerRadius) * 0.55;
      ctx.save();
      ctx.translate(cx + Math.cos(mid) * textRadius, cy + Math.sin(mid) * textRadius);
      ctx.rotate(mid + Math.PI / 2);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      if (item.icon) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '600 24px "Inter", system-ui, sans-serif';
        ctx.fillText(item.icon, 0, -12);
      }

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = '600 16px "Inter", system-ui, sans-serif';
      wrapText(ctx, item.label || '', 0, item.icon ? 12 : 0, outerRadius - innerRadius - 20, 18);

      ctx.restore();

      angle = end + gap;
    });
  }

  function wrapText(context, text, x, y, maxWidth, lineHeight) {
    if (!text) return;
    const words = text.split(/\s+/);
    let line = '';
    const lines = [];

    for (const word of words) {
      const testLine = line ? `${line} ${word}` : word;
      const metrics = context.measureText(testLine);
      if (metrics.width > maxWidth && line) {
        lines.push(line);
        line = word;
      } else {
        line = testLine;
      }
    }
    if (line) lines.push(line);

    const offsetY = y - ((lines.length - 1) / 2) * lineHeight;
    lines.forEach((l, index) => {
      context.fillText(l, x, offsetY + index * lineHeight);
    });
  }

  function shadeColour(hex, luminosity = 0) {
    let col = hex.replace(/[^0-9a-f]/gi, '');
    if (col.length < 6) {
      col = col[0] + col[0] + col[1] + col[1] + col[2] + col[2];
    }
    let result = '#';
    for (let i = 0; i < 3; i += 1) {
      const part = parseInt(col.substr(i * 2, 2), 16);
      const newPart = Math.max(Math.min(part + part * luminosity, 255), 0);
      result += (`00${Math.round(newPart).toString(16)}`).substr(-2);
    }
    return result;
  }

  function persist() {
    try {
      const payload = {
        ...state,
        items: state.items.map((item) => ({ ...item }))
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch (error) {
      console.warn('Failed to save workspace', error);
    }
    updateJsonOutput();
  }

  function loadPersisted() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return false;
      const saved = JSON.parse(raw);
      if (!Array.isArray(saved.items)) return false;
      state.items = saved.items.map((item) => ({ ...item }));
      state.selectedId = saved.selectedId || (state.items[0]?.id ?? null);
      state.innerRadius = typeof saved.innerRadius === 'number' ? saved.innerRadius : state.innerRadius;
      state.gapAngle = typeof saved.gapAngle === 'number' ? saved.gapAngle : state.gapAngle;
      state.backgroundColor = saved.backgroundColor || state.backgroundColor;
      if (state.items.length) {
        const lastId = state.items[state.items.length - 1].id;
        const matches = /-(\d+)$/.exec(lastId || '');
        if (matches) {
          idCounter = Number(matches[1]) + 1;
        }
      }
      return true;
    } catch (error) {
      console.warn('Could not load saved workspace', error);
      return false;
    }
  }

  function clearFileInput() {
    if (elements.importFile) {
      elements.importFile.value = '';
    }
  }

  function updateJsonOutput() {
    const payload = toExportPayload();
    elements.jsonOutput.value = JSON.stringify(payload, null, 2);
  }

  function toExportPayload() {
    return {
      meta: {
        name: 'Plasticity Radial Menu preset',
        generatedAt: new Date().toISOString(),
        innerRadius: state.innerRadius,
        gapAngle: state.gapAngle,
        backgroundColor: state.backgroundColor
      },
      items: state.items.map((item, index) => ({
        id: index + 1,
        label: item.label,
        command: item.command,
        keybind: item.keybind,
        icon: item.icon,
        color: item.color,
        weight: item.weight
      }))
    };
  }

  function downloadJson() {
    const payload = JSON.stringify(toExportPayload(), null, 2);
    const blob = new Blob([payload], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'plasticity-radial-menu.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function copyJson() {
    const payload = JSON.stringify(toExportPayload(), null, 2);
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(payload).then(() => {
        elements.copyJson.textContent = 'Copied!';
        setTimeout(() => (elements.copyJson.textContent = 'Copy JSON'), 1600);
      }).catch(() => {
        elements.jsonOutput.value = payload;
        alert('Clipboard is unavailable. The JSON is shown in the box below.');
      });
    } else {
      elements.jsonOutput.value = payload;
      elements.jsonOutput.select();
      document.execCommand('copy');
    }
  }

  function handleFileLoad() {
    const file = elements.importFile.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result ?? '{}');
        if (!data || !Array.isArray(data.items)) {
          throw new Error('Invalid preset file');
        }
        state.items = data.items.map((item) => createItem({ ...item }));
        state.selectedId = state.items[0]?.id ?? null;
        if (data.meta) {
          if (typeof data.meta.innerRadius === 'number') state.innerRadius = data.meta.innerRadius;
          if (typeof data.meta.gapAngle === 'number') state.gapAngle = data.meta.gapAngle;
          if (typeof data.meta.backgroundColor === 'string') state.backgroundColor = data.meta.backgroundColor;
        }
        syncInputsFromState();
        renderItemList();
        updateItemEditor();
        renderPreview();
        persist();
      } catch (error) {
        alert(error.message || 'Unable to load preset.');
      }
      clearFileInput();
    };
    reader.readAsText(file);
  }

  function syncInputsFromState() {
    elements.innerRadius.value = state.innerRadius;
    elements.innerRadiusValue.textContent = `${Math.round(state.innerRadius * 100)}%`;
    elements.gapAngle.value = state.gapAngle;
    elements.gapAngleValue.textContent = `${Number(state.gapAngle).toFixed(1)}°`;
    elements.backgroundColor.value = state.backgroundColor;
  }

  function attachEventListeners() {
    elements.addItem.addEventListener('click', () => addItem());
    elements.duplicateItem.addEventListener('click', duplicateSelected);
    elements.removeItem.addEventListener('click', removeSelected);
    elements.moveUp.addEventListener('click', () => moveSelected(-1));
    elements.moveDown.addEventListener('click', () => moveSelected(1));

    elements.itemLabel.addEventListener('input', (event) => {
      const item = getSelectedItem();
      if (!item) return;
      item.label = event.target.value;
      renderItemList();
      renderPreview();
      persist();
    });

    elements.itemCommand.addEventListener('input', (event) => {
      const item = getSelectedItem();
      if (!item) return;
      item.command = event.target.value;
      renderItemList();
      persist();
    });

    elements.itemKeybind.addEventListener('input', (event) => {
      const item = getSelectedItem();
      if (!item) return;
      item.keybind = event.target.value;
      renderItemList();
      persist();
    });

    elements.itemIcon.addEventListener('input', (event) => {
      const item = getSelectedItem();
      if (!item) return;
      item.icon = event.target.value;
      renderItemList();
      renderPreview();
      persist();
    });

    elements.itemColor.addEventListener('input', (event) => {
      const item = getSelectedItem();
      if (!item) return;
      item.color = event.target.value;
      renderItemList();
      renderPreview();
      persist();
    });

    elements.itemWeight.addEventListener('input', (event) => {
      const item = getSelectedItem();
      if (!item) return;
      const value = Number(event.target.value);
      item.weight = Math.max(1, Math.min(4, Number.isFinite(value) ? value : 1));
      elements.itemWeightValue.textContent = `${item.weight}×`;
      renderItemList();
      renderPreview();
      persist();
    });

    elements.innerRadius.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      state.innerRadius = Math.max(0, Math.min(0.7, Number.isFinite(value) ? value : state.innerRadius));
      elements.innerRadiusValue.textContent = `${Math.round(state.innerRadius * 100)}%`;
      renderPreview();
      persist();
    });

    elements.gapAngle.addEventListener('input', (event) => {
      const value = Number(event.target.value);
      state.gapAngle = Math.max(0, Math.min(8, Number.isFinite(value) ? value : state.gapAngle));
      elements.gapAngleValue.textContent = `${state.gapAngle.toFixed(1)}°`;
      renderPreview();
      persist();
    });

    elements.backgroundColor.addEventListener('input', (event) => {
      state.backgroundColor = event.target.value;
      renderPreview();
      persist();
    });

    elements.exportJson.addEventListener('click', downloadJson);
    elements.copyJson.addEventListener('click', copyJson);
    elements.loadJson.addEventListener('click', handleFileLoad);
    elements.importFile.addEventListener('change', handleFileLoad);
  }

  function bootstrap() {
    const hasSaved = loadPersisted();
    if (!hasSaved) {
      ['Modeling', 'Surface', 'Utility', 'Custom'].forEach((label, index) => {
        const colourSet = ['#6dcff6', '#f76fc1', '#ffcd3c', '#7d7aff'];
        addItem({ label, color: colourSet[index % colourSet.length], icon: label[0] });
      });
      state.innerRadius = 0.35;
      state.gapAngle = 2;
      state.backgroundColor = '#1b1d26';
      selectItem(state.items[0]?.id ?? null);
      renderItemList();
      renderPreview();
      persist();
    } else {
      renderItemList();
      updateItemEditor();
      renderPreview();
      updateJsonOutput();
    }
    syncInputsFromState();
  }

  attachEventListeners();
  bootstrap();
})();
