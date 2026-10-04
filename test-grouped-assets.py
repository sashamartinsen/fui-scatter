"""Verify grouping preserves every original vector contour and transform."""
import hashlib
import json
from pathlib import Path
import xml.etree.ElementTree as ET

ns = '{http://www.w3.org/2000/svg}'
checks = json.loads(Path('grouped-assets-check.json').read_text())
for path, check in checks.items():
    root = ET.parse(Path('dist/shape-library') / path).getroot()
    groups = [node for node in root if node.tag != ns + 'defs']
    assert len(groups) == check['groups'], check['name']
    assert all(node.tag == ns + 'g' and node.get('data-name') and len(node) for node in groups)
    assert len({node.get('id') for node in groups}) == len(groups)
    geometry_nodes = [node for group in groups for child in group for node in child.iter()]
    leaves = [node for node in geometry_nodes if node.tag != ns + 'g']
    assert len(leaves) == check['leaves']
    geometry = sorted(json.dumps({'tag': node.tag, 'attributes': node.attrib}, sort_keys=True) for node in geometry_nodes)
    assert hashlib.sha256(json.dumps(geometry).encode()).hexdigest() == check['geometry_hash'], check['name']
    assert root.find(ns + 'defs/' + ns + 'style').text == check.get('style', '.cls-1{fill:#fff;}')
    print(f"PASS: {check['name']}: {len(groups)} groups, all {len(leaves)} original contours and transforms retained.")
