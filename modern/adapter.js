(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};

  var SUMMARY_FIELDS = [
    { key: 'lp', label: 'LP / HP', sourceId: 'Status_6', unit: '' },
    { key: 'mp', label: 'MP', sourceId: 'Status_7', unit: '' },
    { key: 'physicalAttack', label: 'Physical ATK', sourceId: 'Status_18', unit: '' },
    { key: 'magicAttack', label: 'Magic ATK', sourceId: 'Status_42', unit: '%' },
    { key: 'defense', label: 'DEF', sourceId: 'Status_49', unit: '' },
    { key: 'physicalDamageResist', label: 'Physical damage resist', sourceId: 'Status_52_2', unit: '%' },
    { key: 'magicDamageResist', label: 'Magic damage resist', sourceId: 'Status_60', unit: '%' },
    { key: 'accuracy', label: 'Accuracy', sourceId: 'Status_62', unit: '' },
    { key: 'dodge', label: 'Dodge', sourceId: 'Status_65', unit: '' },
    { key: 'crit', label: 'Critical rate', sourceId: 'Status_69', unit: '%' },
    { key: 'critResist', label: 'Critical resistance', sourceId: 'Status_70', unit: '%' },
    { key: 'critDamage', label: 'Critical damage', sourceId: 'Status_71', unit: '%' },
    { key: 'critDamageResist', label: 'Critical damage resistance', sourceId: 'Status_72', unit: '%' },
    { key: 'attackSpeed', label: 'Attack speed', sourceId: 'Status_73', unit: '%' },
    { key: 'moveSpeed', label: 'Movement speed', sourceId: 'Status_74', unit: '%' },
    { key: 'castSpeed', label: 'Cast speed', sourceId: 'Status_77', unit: '%' },
    { key: 'castTime', label: 'Cast time', sourceId: 'Status_78', unit: '%' },
    { key: 'cooldown', label: 'Cooldown', sourceId: 'Status_79', unit: '%' },
    { key: 'fireResist', label: 'Fire resistance', sourceId: 'Status_138', unit: '%' },
    { key: 'iceResist', label: 'Ice resistance', sourceId: 'Status_139', unit: '%' },
    { key: 'lightningResist', label: 'Lightning resistance', sourceId: 'Status_140', unit: '%' },
    { key: 'poisonResist', label: 'Poison resistance', sourceId: 'Status_141', unit: '%' },
    { key: 'charmResist', label: 'Charm resistance', sourceId: 'Status_142', unit: '%' },
    { key: 'lightResist', label: 'Light resistance', sourceId: 'Status_143', unit: '%' },
    { key: 'darkResist', label: 'Dark resistance', sourceId: 'Status_144', unit: '%' },
    { key: 'magicResist', label: 'Magic resistance', sourceId: 'Status_145', unit: '%' }
  ];

  function byId(id) {
    return document.getElementById(id);
  }

  function textOf(node) {
    return node && node.textContent ? node.textContent.trim() : '';
  }

  function hasOption(select, value) {
    if (!select) return false;
    for (var index = 0; index < select.options.length; index += 1) {
      if (String(select.options[index].value) === String(value)) return true;
    }
    return false;
  }

  function dispatchLegacyChange(select) {
    select.dispatchEvent(new Event('change', { bubbles: true }));
    if (namespace.equipmentPicker) namespace.equipmentPicker.refresh();
  }

  function parseEquipmentOption(option) {
    var raw = option._remakedGameDisplay ? option._remakedGameDisplay.sourceText : textOf(option);
    var match = raw.match(/^Lv:\s*(\d+)\s+(.*)$/);
    return {
      value: String(option.value),
      name: match ? match[2] : raw,
      level: match ? Number(match[1]) : null
    };
  }

  function equipmentLabel(slotIndex) {
    // Ear/Ring labels are repeated in Legacy DOM; IDs are not slot indices.
    var select = byId('SelEquip_' + slotIndex + '_0');
    var row = select && select.parentElement.parentElement.parentElement.parentElement;
    var label = textOf(row && row.firstElementChild) || ('Slot ' + slotIndex);
    if (slotIndex === 8 || slotIndex === 9) label += ' · ' + (slotIndex - 7);
    if (slotIndex === 12 || slotIndex === 13) label += ' · ' + (slotIndex - 11);
    return label;
  }

  function parseCalculatedValue(raw) {
    var display = String(raw == null ? '' : raw).trim();
    if (!display || display === '---') {
      return { display: display || '---', value: null };
    }
    var numeric = Number(display.replace(/,/g, ''));
    return {
      display: display,
      value: Number.isFinite(numeric) ? numeric : null
    };
  }

  function readCalculatedSummary() {
    return SUMMARY_FIELDS.map(function (field) {
      var parsed = parseCalculatedValue(textOf(byId(field.sourceId)));
      return {
        key: field.key,
        label: field.label,
        value: parsed.value,
        display: parsed.display,
        unit: field.unit,
        sourceId: field.sourceId
      };
    });
  }

  function readCharacterMetadata() {
    var levelText = textOf(byId('StatusLev'));
    var level = Number(levelText);
    return {
      race: textOf(byId('StatusRace')),
      raceSkill: textOf(byId('StatusRSkill')),
      job: textOf(byId('StatusJob')),
      level: Number.isFinite(level) ? level : null
    };
  }

  function refreshLoadedState() {
    window.ListCreate('Set');
    window.ListCreate('Equip');
    window.ListCreate('Soul');
    window.ListCreate('SoulSelect');
    window.ListCreate('SoulCheck');
    // Expand restores numeric state but does not rebuild SPOpt, the engine's
    // equipment-effect cache. Use the original engine before recalculating:
    // otherwise previous equipment bonuses survive a load/evaluate rollback.
    window.CalcSet('Equip');

    var race = byId('SelRace');
    if (race) race.selectedIndex = window.Status['Job'][0];

    window.RJChange('RSkill');
    var raceSkill = byId('SelRSkill');
    if (raceSkill) raceSkill.selectedIndex = window.Status['Job'][1];

    var job = byId('SelJob');
    if (job) job.selectedIndex = window.Status['Job'][2];

    var statusRace = byId('StatusRace');
    var statusRSkill = byId('StatusRSkill');
    var statusJob = byId('StatusJob');
    if (statusRace) statusRace.innerHTML = window.Name['Race'][window.Status['Job'][0]][window.Flag[0]];
    if (statusRSkill) statusRSkill.innerHTML = window.Name['Race']['Skill'][window.Status['Job'][0]][window.Status['Job'][1]][window.Flag[0]];
    if (statusJob) statusJob.innerHTML = window.Name['Job'][window.Status['Job'][2]][window.Flag[0] + 2];

    var statusPairs = [
      ['StatusLev', window.Status['Lev'][0]],
      ['StatusStP_0', window.Status['StP'][0]],
      ['StatusStP_1', window.Status['StP'][1]],
      ['StatusSkP_0', window.Status['SkP'][0]],
      ['StatusSkP_1', window.Status['SkP'][1]],
      ['StatusUnP_0', window.Status['UnP'][0]],
      ['StatusUnP_1', window.Status['UnP'][1]]
    ];
    for (var pairIndex = 0; pairIndex < statusPairs.length; pairIndex += 1) {
      var statusNode = byId(statusPairs[pairIndex][0]);
      if (statusNode) statusNode.innerHTML = statusPairs[pairIndex][1];
    }

    for (var skillIndex = 0; skillIndex < window.Name['Skill'].length; skillIndex += 1) {
      var learned = byId('Skill_' + skillIndex + '_1');
      var current = byId('Skill_' + skillIndex + '_2');
      if (learned) learned.innerHTML = window.Status['Skill'][skillIndex][0];
      if (current) current.innerHTML = window.Status['Skill'][skillIndex][2];

      if (skillIndex !== 0 && skillIndex !== 6 && skillIndex !== 12 && skillIndex !== 17 && skillIndex !== 22) {
        var next = byId('Skill_' + skillIndex + '_3');
        if (next) {
          next.innerHTML = (window.Status['Skill'][skillIndex][2] + window.Status['Skill'][skillIndex][3] === window.MaxSk)
            ? '-'
            : window.SPt[window.Status['Skill'][skillIndex][2] + window.Status['Skill'][skillIndex][3] + 1][1];
        }
        window.CalcSet('Skill', skillIndex, 0, 'Potential');
        window.CalcSet('Skill', skillIndex, 0, 'Adeptness');
      }
    }

    window.SkillBar('ALL');
    window.CalcSet('ALL');
    window.Log();
  }

  var adapter = {
    serialize: function () {
      if (typeof window.Store !== 'function') throw new Error('Legacy Store() is unavailable');
      return String(window.Store());
    },

    load: function (payload) {
      if (typeof payload !== 'string' || !payload.trim()) {
        throw new TypeError('Build payload must be a non-empty string');
      }
      if (typeof window.Expand !== 'function') throw new Error('Legacy Expand() is unavailable');
      window.Expand(payload);
      refreshLoadedState();
      // Build projections read names synchronously; a MutationObserver refresh
      // alone would leave compare results in the previous/source language.
      if (namespace.gameTermDisplay) namespace.gameTermDisplay.refresh();
      if (namespace.equipmentPicker) namespace.equipmentPicker.refresh();
    },

    readCalculatedSummary: readCalculatedSummary,

    readCharacterMetadata: readCharacterMetadata,

    evaluateBuild: function (payload) {
      if (typeof payload !== 'string' || !payload.trim()) {
        throw new TypeError('Build payload must be a non-empty string');
      }
      var original = adapter.serialize();
      try {
        adapter.load(payload);
        return {
          metadata: readCharacterMetadata(),
          summary: readCalculatedSummary()
        };
      } finally {
        adapter.load(original);
      }
    },

    listEquipmentTargets: function () {
      var targets = [];
      for (var slotIndex = 0; slotIndex <= 13; slotIndex += 1) {
        var selectId = 'SelEquip_' + slotIndex + '_0';
        if (!byId(selectId)) continue;
        targets.push({
          slotIndex: slotIndex,
          label: equipmentLabel(slotIndex),
          selectId: selectId
        });
      }
      return targets;
    },

    listEquipmentOptions: function (slotIndex) {
      var select = byId('SelEquip_' + Number(slotIndex) + '_0');
      if (!select) return [];
      var options = [];
      for (var index = 0; index < select.options.length; index += 1) {
        options.push(parseEquipmentOption(select.options[index]));
      }
      return options;
    },

    selectEquipment: function (slotIndex, value) {
      var select = byId('SelEquip_' + Number(slotIndex) + '_0');
      if (!select || !hasOption(select, value)) return false;
      select.value = String(value);
      dispatchLegacyChange(select);
      return true;
    },

    listSoulTargets: function () {
      var targets = [];
      for (var slotIndex = 0; slotIndex <= 13; slotIndex += 1) {
        for (var socketIndex = 4; socketIndex <= 6; socketIndex += 1) {
          var selectId = 'SelEquip_' + slotIndex + '_' + socketIndex;
          var select = byId(selectId);
          if (!select) continue;
          // Enhanced selectors are hidden only as a presentation detail. Socket
          // availability remains the Legacy SoulCheck inline display state.
          var style = select._remakedPicker ? {
            display: select.style.display,
            visibility: window.getComputedStyle(select.parentElement).visibility
          } : window.getComputedStyle(select);
          if (style.display === 'none' || style.visibility === 'hidden') continue;
          targets.push({
            slotIndex: slotIndex,
            socketIndex: socketIndex,
            label: equipmentLabel(slotIndex) + ' · Soul ' + (socketIndex - 3),
            selectId: selectId
          });
        }
      }
      return targets;
    },

    listSoulOptions: function (target) {
      if (!target || typeof target.slotIndex === 'undefined' || typeof target.socketIndex === 'undefined') return [];
      var select = byId('SelEquip_' + Number(target.slotIndex) + '_' + Number(target.socketIndex));
      if (!select) return [];
      var options = [];
      for (var index = 0; index < select.options.length; index += 1) {
        options.push({
          value: String(select.options[index].value),
          name: select.options[index]._remakedGameDisplay ? select.options[index]._remakedGameDisplay.sourceText : textOf(select.options[index])
        });
      }
      return options;
    },

    selectSoul: function (target, value) {
      if (!target || typeof target.slotIndex === 'undefined' || typeof target.socketIndex === 'undefined') return false;
      var select = byId('SelEquip_' + Number(target.slotIndex) + '_' + Number(target.socketIndex));
      if (!select || !hasOption(select, value)) return false;
      select.value = String(value);
      dispatchLegacyChange(select);
      return true;
    }
  };

  namespace.adapter = adapter;
  // Read-only descriptions, not reimplemented calculation rules. Numeric fields
  // retain canonical JP data exactly as the Legacy engine does.
  adapter.readItemDetails = function (kind, value, targetSlot) {
    var id = Number(value), language = Number(window.Flag[0]), canonical, record;
    if (!Number.isInteger(id) || id <= 0) return null;
    if (kind === 'equipment') {
      var category = Math.floor(id / 10000), index = id % 10000;
      canonical = window.EquipData[0]?.[category]?.[index];
      record = window.EquipData[language]?.[category]?.[index];
    } else if (kind === 'soul') {
      canonical = window.SoulData[0]?.[id];
      record = window.SoulData[language]?.[id];
    } else return null;
    if (!canonical || !record) return null;
    function text(html) {
      var node = document.createElement('div');
      node.innerHTML = String(html == null ? '' : html);
      node.querySelectorAll('br').forEach(function (br) { br.replaceWith('\n'); });
      return node.textContent.trim();
    }
    var columns = kind === 'equipment' ? [1, 2, 3] : [1, 2, 3, 4];
    var current = kind === 'equipment' ? window.Status.Equip[Number(targetSlot)] : null;
    var equipped = Boolean(current && Number(current[0]) === id);
    var souls = [];
    if (kind === 'equipment') {
      for (var socket = 0; socket < canonical[5]; socket++) {
        var soulId = equipped ? Number(current[socket + 4]) : 0;
        souls.push({ id: soulId, name: soulId ? text(window.SoulData[language]?.[soulId]?.[0]) : '' });
      }
    }
    var baseStats = [];
    // Presentation of literal base data only; conditional/percentage formulas
    // are deliberately not evaluated or reconstructed here.
    String(canonical[7] || '').split('_').forEach(function (code) {
      var match = code.match(/^(18)=W(\d+(?:\.\d+)?)$/) || code.match(/^(49)=(\d+(?:\.\d+)?)$/);
      if (match) baseStats.push({ label: text(window.Name.Option[Number(match[1])][3 + language]), value: match[2] });
    });
    var classes = [];
    if (kind === 'equipment') window.Name.Job.forEach(function (job, jobIndex) {
      // Flags follow the preserved ListCreate('Equip') layout (offset 16).
      if (canonical[16 + jobIndex]) classes.push(text(job[2 + language]));
    });
    return { name: text(record[0]), level: kind === 'equipment' ? canonical[4] : null,
      sockets: kind === 'equipment' ? canonical[5] : null,
      souls: souls, baseStats: baseStats, classes: classes,
      category: kind === 'equipment' ? text(window.EquipData[language][category][0][0]).replace(/^\+?-+\s*/, '') : '',
      equipped: equipped,
      equippedName: equipped ? text(window.EquipOption.apply(null, current)) : '',
      gem: equipped && Number(current[3]) > 0 ? text(window.Name.Gem[0][current[1]][language]) + ' · ' + text(window.Name.Gem[1][current[2]][language]) : '',
      descriptions: columns.map(function (column) { return text(record[column]); }).filter(Boolean) };
  };
})();
