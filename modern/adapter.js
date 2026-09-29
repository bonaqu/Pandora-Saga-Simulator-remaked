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
    return textOf(byId('TextEquip_' + slotIndex)) || ('Slot ' + slotIndex);
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
          var style = window.getComputedStyle(select);
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
})();
