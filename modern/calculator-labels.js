(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};

  function plain(html) {
    var source = document.createElement('span');
    source.innerHTML = String(html == null ? '' : html);
    source.querySelectorAll('br').forEach(function (br) { br.replaceWith('\n'); });
    return source.textContent.trim();
  }

  // One source-to-surface map is shared by the workbook exporter and the
  // display adapter. All coordinates refer to the preserved Legacy arrays.
  function collect() {
    var rows = [], names = window.Name;
    function add(id, path, values, targets, category) {
      if (!plain(values[1])) return;
      rows.push({ id: id, category: category || 'calculator_label', legacy_path: path,
        values: values, targets: targets || [] });
      var hints = values.map(function (html) {
        var source = document.createElement('span'); source.innerHTML = html;
        var help = source.querySelector('[title]');
        return help ? help.getAttribute('title') : '';
      });
      if (hints[1]) rows.push({ id: id + '.hint', category: 'calculator_hint',
        legacy_path: path + ' @title', values: hints, targets: targets || [], hint: true });
    }
    function group(id, path, values, targetPrefix, offset) {
      values.forEach(function (entry, index) {
        add(id + '.' + index, path + '[' + index + ']', entry.slice(offset || 0, (offset || 0) + 3),
          [{ selector: '#' + targetPrefix + index }]);
      });
    }
    function literal(id, selector, anchor) {
      var node = document.querySelector(selector);
      if (anchor) node = node?.closest('li')?.previousElementSibling;
      if (!node) throw new Error('Missing static calculator label: ' + id);
      add('calculator.literal.' + id, 'index.html ' + selector, ['', node.textContent.trim(), ''],
        [{ selector: selector, previousLabel: Boolean(anchor), fallbackEnglish: true }]);
    }
    literal('code', '#InCode', true);
    literal('create', 'li[onclick*="Base64.toBase64"] > div');
    literal('code_load', 'li[onclick="File(\'CodeLoad\');"] > div');
    literal('delete', 'li[onclick="$(\'InCode\').value=\'\';"] > div');
    rows[rows.length - 1].targets.push({ selector: 'li[onclick="Reset(\'Log\');"] > div', fallbackEnglish: true });
    literal('file_save', 'li[onclick^="File(\'Save\',"] > div');
    literal('file_load', 'li[onclick^="File(\'Load\',"] > div');
    literal('file_delete', 'li[onclick^="File(\'Del\',"] > div');
    literal('log_heading', '#Tab_5_1 .head');
    var fileTargets = [];
    document.querySelectorAll('#Tab_6_1 .head2').forEach(function (node, index) {
      fileTargets.push({ selector: '#Tab_6_1 ul[onmouseover="File(\'View\',' + index + ');"] > .head2',
        suffix: ':' + window.zeroPadding(2, 0, index + 1), fallbackEnglish: true });
    });
    add('calculator.literal.file_slot', 'index.html File slot headers', ['', 'File', ''], fileTargets);
    ['max', 'min'].forEach(function (id, index) {
      var selector = 'input[type="image"][src$="/' + (index ? 'down3' : 'up3') + '.png"]';
      var source = document.querySelector(selector)?.getAttribute('title');
      if (!source) throw new Error('Missing calculator control title: ' + id);
      add('calculator.literal.' + id, 'index.html/create.js ' + selector, ['', source, ''],
        [{ selector: selector, attribute: 'title', extraAttribute: 'alt', fallbackEnglish: true }]);
    });
    add('calculator.menu', 'Name.Menu', names.Menu, [{ selector: '#TextMenu' }]);
    names.Tab.forEach(function (entry, index) {
      add('calculator.tab.' + index, 'Name.Tab[' + index + ']', entry,
        [{ selector: '#TextTab_' + index }, { selector: '[data-remaked-tab="' + index + '"]' }]);
    });
    group('calculator.text', 'Name.Text', names.Text, 'Text_');
    ['InRace', 'InRSkill', 'InJob'].forEach(function (anchor, index) {
      rows.find(function (row) { return row.id === 'calculator.text.' + index; }).targets.push({
        selector: '#' + anchor, priorHeader: index === 2 ? ':scope > li.head' : '.head', alwaysSource: true
      });
    });
    group('calculator.attack', 'Name.Text.ATK', names.Text.ATK, 'TextATK_');
    group('calculator.defense', 'Name.Text.RES', names.Text.RES, 'TextRES_');
    group('calculator.status', 'Name.Text.Status', names.Text.Status, 'TextStatus_');
    group('calculator.honor', 'Skill.Honor', window.Skill.Honor, 'TextBuffHonor_');
    names.POT.forEach(function (entry, index) {
      add('calculator.potion.' + index, 'Name.POT[' + index + ']', entry,
        [{ selector: '#ViewPOT_' + index + '_0' }]);
    });
    names.Rune.forEach(function (entry, index) {
      add('calculator.rune.' + index, 'Name.Rune[' + index + ']', entry,
        [{ selector: '#Buff_30_' + index + ' [id^="TextBuff_"]' }]);
    });
    names.Equip.forEach(function (entry, index) {
      var targets = [{ selector: '#TextEquip_' + index }];
      if (index > 0) {
        var fileIndex = 33 + index + (index > 9 ? 1 : 0);
        targets.push({ selector: '#TextFile_' + fileIndex, suffix: index === 9 || index === 12 ? '1' : '' });
        if (index === 9 || index === 12) targets.push({ selector: '#TextFile_' + (fileIndex + 1), suffix: '2' });
      }
      add('calculator.slot.' + index, 'Name.Equip[' + index + ']', entry, targets);
    });
    names.Clan.forEach(function (entry, index) {
      var targets = [];
      for (var level = 0; level <= entry[0]; level++) targets.push({
        selector: '#SelBuffClan_' + index + ' option[value="' + level + '"]', suffix: level ? ' Lv' + level : ''
      });
      add('calculator.clan.' + index, 'Name.Clan[' + index + ']', entry.slice(1, 4), targets);
    });
    names.Gem.forEach(function (category, categoryIndex) {
      category.forEach(function (entry, index) {
        var targets = [];
        for (var slot = 0; slot <= 13; slot++) targets.push({
          selector: '#SelEquip_' + slot + '_' + (categoryIndex + 1) + ' option:nth-child(' + (index + 1) + ')'
        });
        if (categoryIndex === 1) targets.push({ selector: '#SelGem select option:nth-child(' + (index + 1) + ')' });
        add('calculator.gem.' + categoryIndex + '.' + index, 'Name.Gem[' + categoryIndex + '][' + index + ']', entry, targets);
      });
    });
    names.Learn.forEach(function (entry, index) {
      var selectors = {
        0: '#LearnView > ul > li.head',
        1: '[id^="LearnSkill_"] > ul:nth-child(2) > li:nth-child(2)',
        2: '[id^="LearnSkill_"] > ul:nth-child(3) > li:first-child',
        3: '[id^="LearnSkill_"] > ul:nth-child(3) > li:nth-child(3)',
        5: '[id^="LearnSkill_"] > ul:nth-child(4) > li:first-child',
        6: '[id^="LearnSkill_"] > ul:nth-child(5) > li',
        7: '[id^="LearnSkill_"] > ul:nth-child(7) > li'
      };
      add('calculator.learn.' + index, 'Name.Learn[' + index + ']', entry,
        selectors[index] ? [{ selector: selectors[index] }] : index === 4 ? [
          { selector: '[id^="LearnSkill_"] > ul:nth-child(3) > li:nth-child(2)', dynamicSuffix: true },
          { selector: '[id^="LearnSkill_"] > ul:nth-child(3) > li:nth-child(4)', dynamicSuffix: true },
          { selector: '[id^="LearnSkill_"] > ul:nth-child(4) > li:nth-child(2)', dynamicSuffix: true }
        ] : []);
    });
    [5, 6, 9, 10].forEach(function (index) {
      // These are qualified effects, not interchangeable with their base skill.
      var values = names.Text.Skill.Buff[index].slice(1, 4).map(function (html) {
        var source = document.createElement('span'); source.innerHTML = html;
        var help = source.querySelector('[title]');
        return help ? help.title : html;
      });
      add('calculator.qualified_buff.' + index, 'Name.Text.Skill.Buff[' + index + ']', values,
        [{ selector: '#ViewBuff_' + index + '_0', sourceValues: names.Text.Skill.Buff[index].slice(1, 4) }]);
    });
    names.Text.Skill.Text.forEach(function (entry, index) {
      var targets = [];
      if (index === 0) names.Text.Skill.Buff.forEach(function (buff, buffIndex) {
        if ([4, 5].indexOf(buffIndex) === -1) targets.push({ selector: '#ViewBuff_' + buffIndex + '_2' });
      });
      if (index === 2) ['ViewBuff_3_1', 'ViewBuff_4_1', 'ViewBuff_6_1', 'ViewBuff_9_1', 'ViewOther_0_1', 'ViewOther_1_1'].forEach(function (id) {
        targets.push({ selector: '#' + id, dynamicSuffix: true });
      });
      add('calculator.skill_effect.' + index, 'Name.Text.Skill.Text[' + index + ']', entry, targets);
    });
    for (var index = 0; index < 3; index++) rows.find(function (row) {
      return row.id === 'calculator.text.' + index;
    }).targets.push({ selector: '#TextFile_' + index });
    for (var index = 0; index < 6; index++) rows.find(function (row) {
      return row.id === 'calculator.text.' + (index + 10);
    }).targets.push({ selector: '#TextFile_' + (index + 3) });
    (window.Skill[1] || []).forEach(function (category, categoryIndex) {
      category.forEach(function (entry, entryIndex) {
        for (var part = 1; part <= 3; part++) {
          var values = [0, 1, 2].map(function (language) { return window.Skill[language][categoryIndex][entryIndex][part]; });
          add('skill_detail.' + categoryIndex + '.' + entryIndex + '.' + part,
            'Skill[*][' + categoryIndex + '][' + entryIndex + '][' + part + ']', values,
            [{ selector: '#LearnSkill_' + categoryIndex + '_' + entryIndex + ' > ul:nth-child(' + ({ 1: 6, 2: 8, 3: 9 }[part]) + ') > li' }], 'skill_detail');
        }
      });
    });
    return rows;
  }

  namespace.calculatorLabels = { collect: collect, plain: plain };
})();
