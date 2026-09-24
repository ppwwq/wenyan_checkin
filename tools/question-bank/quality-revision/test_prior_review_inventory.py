import unittest

from apply_quality import digest, read
from prior_review_inventory import HERE, ROOT, inventory, source_check, source_entries, text_signals, work_queue


class PriorReviewInventoryTests(unittest.TestCase):
    def test_source_checks_all_locators_and_rejects_missing_anchor(self):
        primary = {'blockPath': '$[0].pages[0].blocks[0]', 'pdfPage': 1, 'anchor': '子曰'}
        related = {'blockPath': '$[0].pages[0].blocks[0]', 'pdfPage': 1, 'anchor': '仁'}
        supporting = {'blockPath': '$[0].pages[0].blocks[0]', 'pdfPage': 1, 'anchor': '義'}
        q = {'source': {**primary, 'relatedSources': [related]},
             'supportingSources': [supporting]}
        entries = list(source_entries(q))
        self.assertEqual([kind for kind, _, _ in entries],
                         ['source', 'source.relatedSources', 'supportingSources'])
        data = [{'pages': [{'blocks': ['原文']}]}]
        self.assertTrue(source_check(*entries[0], data, {}, ['子曰仁'], 'abc')['anchorInPdf'])
        self.assertFalse(source_check(*entries[2], data, {}, ['子曰仁'], 'abc')['anchorInPdf'])

    def test_key_disparity_and_most_extreme_options_route_to_review(self):
        q = {'answerId': 'c', 'stem': '請判斷', 'essayIds': ['essay-01'],
             'explanation': '根據材料判斷其意義，應逐項核對原因。',
             'revisionReason': '已有逐項審稿',
             'choices': [
                 {'id': 'a', 'text': '一定錯', 'explanation': '理由甲已寫清'},
                 {'id': 'b', 'text': '只能錯', 'explanation': '理由乙已寫清'},
                 {'id': 'c', 'text': '依據原文條件說明其具體且完整的意義', 'explanation': '正解依據'},
                 {'id': 'd', 'text': '另一意', 'explanation': '理由丙已寫清'},
             ]}
        signals = text_signals(q)
        self.assertIn('most-wrong-absolute', signals)
        self.assertIn('key-length-disparity', signals)
        self.assertIn('correct-uniquely-longest', signals)
        q['choices'][1]['id'] = 'a'
        self.assertIn('invalid-choice-or-answer-structure', text_signals(q))

    def test_live_inventory_excludes_released_ids_and_fixes_provenance(self):
        result = inventory(ROOT / 'web-study/content/bank.json', HERE / 'baseline-bank.json',
                           HERE / 'release-manifest.json', ROOT / 'web-study/content/sources',
                           ROOT / 'tools/question-bank/pdf-pages.json')
        manifest = read(HERE / 'release-manifest.json')
        baseline = read(HERE / 'baseline-bank.json')
        released = set(manifest['reviewedIds'])
        records = result['records']
        self.assertEqual(len(records), len(baseline['questions']) - len(released))
        self.assertFalse(released & {r['id'] for r in records})
        self.assertTrue(all(r['baseQuestionHash'] == r['currentQuestionHash'] for r in records))
        self.assertTrue(all(r['priorReviewHash'] == digest(baseline['questions'][int(r['priorReview']['pointer'].split('/')[2])]['review']) for r in records))
        self.assertTrue(all(r['semanticApproval'] == 'not-evaluated' for r in records))
        self.assertTrue(all(r['eligibilityCandidate'] != 'reuse-candidate' or not r['riskSignals'] for r in records))
        self.assertFalse(result['summary']['bulkReuseApproved'])
        by_id = {r['id']: r for r in records}
        for ident in ('full-a-e02-p03-b00-v02', 'full-a-e03-p02-b00-v01',
                      'full-a-e04-p01-b00-v04', 'full-c-12-07-02-80',
                      'full-c-13-02-03-00', 'full-c-12-01-03-03'):
            self.assertEqual(by_id[ident]['eligibilityCandidate'], 'requires-review')
            self.assertIn('calibration-requires-revision', by_id[ident]['riskSignals'])
        queue = work_queue(result)
        self.assertEqual({ident for group in queue['groups'] for ident in group['ids']}, set(by_id))
        self.assertEqual(sum(group['count'] for group in queue['groups']), len(records))


if __name__ == '__main__':
    unittest.main()
