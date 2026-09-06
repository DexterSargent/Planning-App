import os
import re

EMOJI_MAP = {
    '📈': 'TrendingUp',
    '📊': 'BarChart',
    '🏋️': 'Dumbbell',
    '🥗': 'Utensils',
    '🔍': 'Search',
    '🛒': 'ShoppingCart',
    '📋': 'ClipboardList',
    '📝': 'FileText',
    '🗄️': 'Archive',
    '🍽️': 'Utensils',
    '⚡': 'Zap',
    '💪': 'BicepsFlexed',
    '🌟': 'Star',
    '📌': 'Pin',
    '📚': 'Library',
    '⏱️': 'Timer',
}

def process_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    found_icons = set()
    for emoji, icon in EMOJI_MAP.items():
        if emoji in content:
            found_icons.add(icon)
            # Remove emoji from placeholders
            if 'placeholder=' in content:
                content = re.sub(rf'placeholder=["\']{emoji}\s*', 'placeholder="', content)
                content = re.sub(rf'placeholder=\{{`{emoji}\s*', 'placeholder={`', content)
            
            # Special case for template literal inside Analytics.js
            if '`🔍 Drilldown:' in content:
                content = content.replace('`🔍 Drilldown: ${selectedAnalyticsMuscle}`', '<><Search size={18} className="inline-icon" /> Drilldown: {selectedAnalyticsMuscle}</>')
            if "'📊 Top Muscle Volume Ranking'" in content:
                content = content.replace("'📊 Top Muscle Volume Ranking'", '<><BarChart size={18} className="inline-icon" /> Top Muscle Volume Ranking</>')

            # Replace emoji with component
            content = content.replace(emoji, f'<{icon} className="inline-icon" size={{18}} />')

    if not found_icons:
        return

    import_stmt = f"import {{ {', '.join(found_icons)} }} from 'lucide-react';\n"
    if 'import ' in content:
        content = content.replace('import ', import_stmt + 'import ', 1)
    else:
        content = import_stmt + content

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

src_dir = '/Users/dextersargent/Documents/PlanningApp/frontend/src'
for root, dirs, files in os.walk(src_dir):
    for file in files:
        if file.endswith('.js'):
            process_file(os.path.join(root, file))
