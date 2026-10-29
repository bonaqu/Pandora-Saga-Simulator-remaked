"""Combine immutable approved strings with explicit new UI fallbacks for tests."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

def ui_with_current_fallbacks():
    approved = json.loads((ROOT / 'localization/approved-translations.v1.json').read_text(encoding='utf-8'))
    fallback = json.loads((ROOT / 'localization/current-ui-fallbacks.v1.json').read_text(encoding='utf-8'))
    for locale, values in fallback['ui'].items():
        for key, value in values.items():
            if key in approved['ui'][locale]:
                raise ValueError('Current fallback would replace a historical translation')
            approved['ui'][locale][key] = value
    return approved
