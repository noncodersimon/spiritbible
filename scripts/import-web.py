"""Reproduce the Catholic selection from pinned, official WEB verse archives.

Python 3 standard library only. No downloads and no editorial text replacements.
Run from any directory: python3 scripts/import-web.py [--check]
"""
import hashlib
import json
from pathlib import Path
import re
import sys
import xml.etree.ElementTree as ET
import zipfile

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'data/sources/web'


def read_edition(edition, manifest):
    archive = SOURCE / (edition + '_vpl.zip')
    assert hashlib.sha256(archive.read_bytes()).hexdigest() == manifest['archives'][edition]['sha256'], 'Archive hash mismatch'
    with zipfile.ZipFile(archive) as z:
        checks = re.findall(r'^([0-9a-f]{64})\s+\*?(.+)$', z.read('signature.txt.asc').decode(), re.M)
        assert checks, 'Missing publisher checksums'
        for digest, name in checks:
            assert hashlib.sha256(z.read(name.strip())).hexdigest() == digest, name
        root = ET.fromstring(z.read(edition + '_vpl.xml'))
    result = {}
    for verse in root:
        key = (verse.attrib['b'], int(verse.attrib['c']), verse.attrib['v'])
        assert key not in result, ('Duplicate source reference', key)
        # The official VPL format is plain Bible text, without notes or headings.
        assert not list(verse), ('Unexpected inline markup', key)
        result[key] = (verse.text or '').strip()
    return result


def convert():
    manifest = json.loads((SOURCE / 'manifest.json').read_text())
    catholic = read_edition('eng-web-c', manifest)
    british = read_edition('eng-webbe', manifest)
    names = {b['code']: b['name'] for b in manifest['books']}
    assert len(names) == 73 and set(names) == {key[0] for key in catholic}
    assert set(catholic) <= set(british), 'British source lacks Catholic references'
    rows = []
    summary = []
    for code, name in names.items():
        source = [(key, british[key]) for key in catholic if key[0] == code]
        for (_, chapter, verse), text in source:
            match = re.fullmatch(r'(\d+)(?:-(\d+))?', verse)
            assert match, ('Unsupported verse reference', code, chapter, verse)
            start = int(match[1])
            end = int(match[2] or start)
            assert start > 0 and end >= start
            # Five Sirach ranges are empty placeholders in both official editions.
            # Expand these reference slots without inventing or repeating prose.
            assert start == end or not text, 'Nonempty verse bridge needs an explicit representation'
            for number in range(start, end + 1):
                rows.append({'book': name, 'chapter': chapter, 'verse': number, 'text': text})
        selected = [r for r in rows if r['book'] == name]
        chapters = sorted({r['chapter'] for r in selected})
        assert chapters == list(range(1, max(chapters) + 1)), name
        summary.append({'code': code, 'name': name, 'chapters': max(chapters), 'verses': len(selected)})
    keys = [(r['book'], r['chapter'], r['verse']) for r in rows]
    assert len(keys) == len(set(keys)), 'Duplicate output reference'
    return rows, summary


def main():
    rows, summary = convert()
    outputs = {ROOT / 'data/bible.json': rows, ROOT / 'src/lib/books.json': summary}
    for path, value in outputs.items():
        if '--check' in sys.argv:
            assert json.loads(path.read_text()) == value, f'{path} differs from pinned source'
        else:
            path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(f"Verified {len(summary)} books, {len(rows)} verse slots, {sum(not r['text'] for r in rows)} publisher blank slots.")


if __name__ == '__main__':
    main()
