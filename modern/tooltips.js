(function () {
  'use strict';

  var namespace = window.PandoraRemaked = window.PandoraRemaked || {};
  var i18n = namespace.i18n;
  var tooltipCounter = 0;

  var DEFINITIONS = {
    lp: 'LP / HP is the character health value reported by the preserved Legacy calculator.',
    mp: 'MP is the character magic-point value reported by the preserved Legacy calculator.',
    physicalAttack: 'Physical attack is the physical attack value reported by the preserved Legacy calculator.',
    magicAttack: 'Magic attack is the magic attack value reported by the preserved Legacy calculator.',
    defense: 'Defense is the defense value reported by the preserved Legacy calculator.',
    physicalDamageResist: 'Physical damage resistance is the physical-damage resistance value reported by the preserved Legacy calculator.',
    magicDamageResist: 'Magic damage resistance is the magic-damage resistance value reported by the preserved Legacy calculator.',
    accuracy: 'Accuracy is the accuracy value reported by the preserved Legacy calculator.',
    dodge: 'Dodge is the dodge value reported by the preserved Legacy calculator.',
    crit: 'Critical rate is the critical-rate value reported by the preserved Legacy calculator.',
    critResist: 'Critical resistance is the critical-resistance value reported by the preserved Legacy calculator.',
    critDamage: 'Critical damage is the critical-damage value reported by the preserved Legacy calculator.',
    critDamageResist: 'Critical damage resistance is the critical-damage resistance value reported by the preserved Legacy calculator.',
    attackSpeed: 'Attack speed is the attack-speed value reported by the preserved Legacy calculator.',
    moveSpeed: 'Movement speed is the movement-speed value reported by the preserved Legacy calculator.',
    castSpeed: 'Cast speed is the cast-speed value reported by the preserved Legacy calculator.',
    castTime: 'Cast time is the cast-time value reported by the preserved Legacy calculator.',
    cooldown: 'Cooldown is the cooldown value reported by the preserved Legacy calculator.',
    fireResist: 'Fire resistance is the fire-resistance value reported by the preserved Legacy calculator.',
    iceResist: 'Ice resistance is the ice-resistance value reported by the preserved Legacy calculator.',
    lightningResist: 'Lightning resistance is the lightning-resistance value reported by the preserved Legacy calculator.',
    poisonResist: 'Poison resistance is the poison-resistance value reported by the preserved Legacy calculator.',
    charmResist: 'Charm resistance is the charm-resistance value reported by the preserved Legacy calculator.',
    lightResist: 'Light resistance is the light-resistance value reported by the preserved Legacy calculator.',
    darkResist: 'Dark resistance is the dark-resistance value reported by the preserved Legacy calculator.',
    magicResist: 'Magic resistance is the magic-resistance value reported by the preserved Legacy calculator.'
  };

  var SOURCE_IDS = {
    lp: 'Status_6',
    mp: 'Status_7',
    physicalAttack: 'Status_18',
    magicAttack: 'Status_42',
    defense: 'Status_49',
    physicalDamageResist: 'Status_52_2',
    magicDamageResist: 'Status_60',
    accuracy: 'Status_62',
    dodge: 'Status_65',
    crit: 'Status_69',
    critResist: 'Status_70',
    critDamage: 'Status_71',
    critDamageResist: 'Status_72',
    attackSpeed: 'Status_73',
    moveSpeed: 'Status_74',
    castSpeed: 'Status_77',
    castTime: 'Status_78',
    cooldown: 'Status_79',
    fireResist: 'Status_138',
    iceResist: 'Status_139',
    lightningResist: 'Status_140',
    poisonResist: 'Status_141',
    charmResist: 'Status_142',
    lightResist: 'Status_143',
    darkResist: 'Status_144',
    magicResist: 'Status_145'
  };

  function get(key) {
    if (!Object.prototype.hasOwnProperty.call(DEFINITIONS, key)) return null;
    if (!Object.prototype.hasOwnProperty.call(SOURCE_IDS, key)) return null;
    return {
      definition: i18n && typeof i18n.t === 'function' ? i18n.t('tooltip.definition.' + key) : DEFINITIONS[key],
      source: i18n && typeof i18n.t === 'function'
        ? i18n.t('tooltip.source', { node: SOURCE_IDS[key] })
        : 'Legacy 2.00 calculated output node ' + SOURCE_IDS[key] + '.'
    };
  }

  function decorate(labelNode, key) {
    if (!labelNode || !key || typeof labelNode.appendChild !== 'function') return null;
    var entry = get(key);
    if (!entry) return null;

    var existing = labelNode.querySelector('[data-remaked-stat-help="' + String(key).replace(/"/g, '\\"') + '"]');
    if (existing) return existing;

    tooltipCounter += 1;
    var tooltipId = 'remaked-stat-tooltip-' + String(key).replace(/[^a-z0-9_-]/gi, '-') + '-' + tooltipCounter;

    var help = document.createElement('button');
    help.type = 'button';
    help.className = 'remaked-stat-help';
    help.dataset.remakedStatHelp = key;
    help.textContent = '?';
    var label = (labelNode.textContent || key).trim();
    if (i18n && typeof i18n.bindAttribute === 'function') {
      i18n.bindAttribute(help, 'aria-label', 'tooltip.about', { label: label });
    } else {
      help.setAttribute('aria-label', 'About ' + label);
    }
    help.setAttribute('aria-describedby', tooltipId);

    var tooltip = document.createElement('span');
    tooltip.id = tooltipId;
    tooltip.className = 'remaked-stat-tooltip';
    tooltip.setAttribute('role', 'tooltip');
    tooltip.hidden = true;

    var definition = document.createElement('span');
    definition.className = 'remaked-stat-tooltip-definition';
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(definition, 'tooltip.definition.' + key);
    else definition.textContent = entry.definition;
    tooltip.appendChild(definition);

    var source = document.createElement('span');
    source.className = 'remaked-stat-tooltip-source';
    if (i18n && typeof i18n.bindText === 'function') i18n.bindText(source, 'tooltip.source', { node: SOURCE_IDS[key] });
    else source.textContent = entry.source;
    tooltip.appendChild(source);

    function show() {
      tooltip.hidden = false;
    }

    function hide() {
      tooltip.hidden = true;
    }

    help.addEventListener('focus', show);
    help.addEventListener('blur', hide);
    help.addEventListener('mouseenter', show);
    help.addEventListener('mouseleave', function () {
      if (document.activeElement !== help) hide();
    });
    help.addEventListener('click', show);

    labelNode.appendChild(document.createTextNode(' '));
    labelNode.appendChild(help);
    labelNode.appendChild(tooltip);
    return help;
  }

  function decorateWithin(root) {
    if (!root) return;
    if (root.matches && root.matches('[data-remaked-compare-label]')) {
      decorate(root, root.getAttribute('data-remaked-compare-label'));
    }
    if (!root.querySelectorAll) return;
    var labels = root.querySelectorAll('[data-remaked-compare-label]');
    for (var index = 0; index < labels.length; index += 1) {
      decorate(labels[index], labels[index].getAttribute('data-remaked-compare-label'));
    }
  }

  function startObserver() {
    decorateWithin(document);
    if (!document.body || typeof window.MutationObserver !== 'function') return;
    var observer = new window.MutationObserver(function (records) {
      for (var recordIndex = 0; recordIndex < records.length; recordIndex += 1) {
        var nodes = records[recordIndex].addedNodes;
        for (var nodeIndex = 0; nodeIndex < nodes.length; nodeIndex += 1) {
          if (nodes[nodeIndex].nodeType === 1) decorateWithin(nodes[nodeIndex]);
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }

  namespace.tooltips = {
    get: get,
    decorate: decorate
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startObserver, { once: true });
  } else {
    startObserver();
  }
})();
