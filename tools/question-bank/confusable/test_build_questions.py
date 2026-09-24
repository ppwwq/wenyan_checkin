import copy
import sys
import unittest
from build_questions import ROOT, add_confusable_questions, read
sys.path.insert(0,str(ROOT / 'tools/question-bank/quality-revision'))
from apply_quality import apply_quality


class ConfusableBuildTest(unittest.TestCase):
    def setUp(self):
        self.live_bank = read(ROOT / 'web-study/content/bank.json')
        # This generator precedes the quality-revision layer. Test its fixed
        # upstream contract independently from later approved content edits.
        baseline = ROOT / 'tools/question-bank/quality-revision/baseline-bank.json'
        self.bank = read(baseline) if baseline.exists() else self.live_bank
        self.originals = [q for q in self.bank['questions'] if 'confusable' not in q.get('tags', [])]

    def test_preserves_original_questions_and_cards_and_rebuilds_idempotently(self):
        before = copy.deepcopy(self.originals)
        cards = copy.deepcopy(self.bank['comparisons'])
        questions, summary = add_confusable_questions(self.originals, self.bank['comparisons'])
        self.assertEqual(questions[:len(before)], before)
        self.assertEqual(self.originals, before)
        self.assertEqual(self.bank['comparisons'], cards)
        self.assertEqual(len(questions), len(before) + 3)
        self.assertEqual(questions, self.bank['questions'])
        self.assertEqual(add_confusable_questions(questions, cards), (questions, summary))

    def test_quality_revision_layer_preserves_cards_and_reproduces_current_release(self):
        manifest = ROOT / 'tools/question-bank/quality-revision/release-manifest.json'
        if not manifest.exists():
            self.skipTest('No quality revision has been released')
        questions, _ = add_confusable_questions(self.originals, self.bank['comparisons'])
        revised, _ = apply_quality(questions)
        self.assertEqual(revised, self.live_bank['questions'])
        self.assertEqual(self.bank['comparisons'], self.live_bank['comparisons'])

    def test_rejects_withdrawn_source_and_missing_context(self):
        for field, value in [('active', False), ('quote', '缺少原文')]:
            questions = copy.deepcopy(self.originals)
            question = next(q for q in questions if q['id'] == 'pilot-01-03-05')
            question[field] = value
            with self.assertRaises(ValueError):
                add_confusable_questions(questions, self.bank['comparisons'])

    def test_rejects_single_essay_or_unverified_meaning(self):
        cards = copy.deepcopy(self.bank['comparisons'])
        group = next(g for g in cards if g['id'] == 'compare-1')
        group['items'][1]['questionId'] = group['items'][0]['questionId']
        with self.assertRaises(ValueError):
            add_confusable_questions(self.originals, cards)
        group['items'][1] = copy.deepcopy(self.bank['comparisons'][0]['items'][1])
        group['items'][0]['meaning'] = '沒有依據的詞義'
        with self.assertRaises(ValueError):
            add_confusable_questions(self.originals, cards)


if __name__ == '__main__':
    unittest.main()
