(function () {
  'use strict';
  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var timer = null, discoveryAnchor = null;
  function positionDiscovery(section) {
    var tools = document.querySelector('[data-remaked-tools]');
    if (!tools) return;
    if (!discoveryAnchor) {
      discoveryAnchor = document.createComment('Modern discovery tools home'); tools.before(discoveryAnchor);
    }
    if (window.matchMedia('(min-width: 861px)').matches) {
      if (tools.closest('[data-remaked-picker-section]')) return;
      var holder = section.querySelector('[data-remaked-picker-discovery]');
      if (!holder) { holder = document.createElement('li'); holder.dataset.remakedPickerDiscovery = ''; section.firstElementChild.appendChild(holder); }
      holder.appendChild(tools);
    } else if (tools.closest('[data-remaked-picker-section]')) discoveryAnchor.after(tools);
  }
  function refresh() {
    var labels = {};
    namespace.adapter.listEquipmentTargets().forEach(function (target) { labels[target.slotIndex] = target.label; });
    document.querySelectorAll('#body select[id^="SelEquip_"]').forEach(function (select) {
      var field = select.id.match(/^SelEquip_(\d+)_(\d+)$/);
      if (!field) return;
      var row = select.parentElement, line = row.parentElement, fields = line.parentElement, slotRow = fields.parentElement;
      row.dataset.remakedPickerField = field[2];
      row.dataset.remakedPickerAvailable = select.style.display === 'none' ? 'false' : 'true';
      line.dataset.remakedPickerLine = '';
      fields.dataset.remakedPickerFields = '';
      slotRow.dataset.remakedPickerSlot = '';
      slotRow.firstElementChild.dataset.remakedPickerSlotLabel = '';
      var section = slotRow.closest('.main');
      if (section) {
        section.dataset.remakedPickerSection = '';
        // The same controls belong beside Equipment on PC and above the long
        // calculator on phones. Move nodes, preserving callbacks/autosave.
        positionDiscovery(section);
      }
      var match = select.id.match(/^SelEquip_(\d+)_(0|[4-6])$/);
      if (!match) return;
      var button = select._remakedPicker;
      if (!button || !button.isConnected) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'remaked-equipment-picker';
        button.dataset.remakedEquipmentPicker = select.id;
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-expanded', 'false');
        var closeOnClick = false;
        button.addEventListener('pointerdown', function () { closeOnClick = button.getAttribute('aria-expanded') === 'true'; });
        button.addEventListener('click', function () {
          if (closeOnClick || button.getAttribute('aria-expanded') === 'true') namespace.search.close();
          else namespace.search.openEquipmentPicker(select.id, button);
          closeOnClick = false;
        });
        button.addEventListener('keydown', function (event) {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault(); namespace.search.openEquipmentPicker(select.id, button);
          }
        });
        select.insertAdjacentElement('afterend', button);
        select._remakedPicker = button;
        // Keep the original node, options and callbacks for the engine. This
        // progressive enhancement is applied only once a working trigger exists.
        select.dataset.remakedPickerNative = '';
        select.hidden = true;
      }
      var option = select.options[select.selectedIndex];
      // Native category placeholders start with +-----. Retain the exact source
      // option/value for the engine; display only its meaningful category name.
      var text = option ? option.textContent.trim().replace(/^\+-----\s*/, '') : '—';
      if (button.textContent !== text) button.textContent = text;
      var label = labels[Number(match[1])] || '';
      var name = label + (Number(match[2]) ? ' · Soul ' + (Number(match[2]) - 3) : '') + ': ' + text;
      if (button.getAttribute('aria-label') !== name) button.setAttribute('aria-label', name);
      button.hidden = select.style.display === 'none';
      button.disabled = select.disabled;
      if (Number(match[2]) === 0) {
        var warning = slotRow.querySelector('[data-remaked-equipment-warning]');
        var message = namespace.adapter.equipmentCalculationWarning(select.value);
        if (message && !warning) {
          warning = document.createElement('p'); warning.dataset.remakedEquipmentWarning = '';
          warning.setAttribute('role', 'status'); fields.appendChild(warning);
        }
        if (warning) { if (warning.textContent !== message) warning.textContent = message; warning.hidden = !message; }
      }
    });
    var gem = document.getElementById('SelGem');
    if (gem) {
      var toolbar = gem.parentElement;
      toolbar.dataset.remakedPickerToolbar = '';
      if (!toolbar._remakedChange) {
        toolbar._remakedChange = true;
        toolbar.addEventListener('change', function () {
          // Legacy bulk modifiers call ALL without rebuilding equipment effects.
          // Run the existing equipment handler after the original callback.
          window.CalcSet('Equip'); window.CalcSet('ALL'); refresh();
        });
      }
    }
    var resetText = document.getElementById('Text_26');
    if (resetText) {
      var reset = resetText.parentElement.querySelector('[data-remaked-equipment-reset]');
      if (!reset) {
        reset = document.createElement('button'); reset.type = 'button';
        reset.className = 'remaked-equipment-picker'; reset.dataset.remakedEquipmentReset = '';
        reset.addEventListener('click', function () {
          window.Reset('Equip'); window.CalcSet('Equip'); window.CalcSet('ALL'); refresh();
        });
        resetText.insertAdjacentElement('afterend', reset);
        resetText.parentElement.removeAttribute('onclick');
        resetText.hidden = true;
      }
      if (reset.textContent !== resetText.textContent) reset.textContent = resetText.textContent;
    }
  }
  function schedule() {
    if (timer) return;
    timer = window.setTimeout(function () { timer = null; refresh(); }, 16);
  }
  function init() {
    if (!namespace.search?.openEquipmentPicker || !document.getElementById('body')) return;
    refresh();
    var body = document.getElementById('body');
    new MutationObserver(schedule).observe(body, {
      subtree: true, childList: true, characterData: true,
      attributes: true, attributeFilter: ['style', 'selected', 'disabled']
    });
    body.addEventListener('change', schedule, true);
    body.addEventListener('input', schedule, true);
    window.addEventListener('resize', schedule);
    window.addEventListener('pandora-remaked:localechange', refresh);
  }
  namespace.equipmentPicker = { refresh: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
