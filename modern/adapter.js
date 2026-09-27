(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};

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
    var raw = textOf(option);
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
          name: textOf(select.options[index])
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
