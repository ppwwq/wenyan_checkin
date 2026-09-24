import copy, hashlib, json, shutil, tempfile, unittest
from pathlib import Path
from apply_chapter import HERE, read, apply_chapter, apply_sequence

class ChapterProtection(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.dir=Path(self.tmp.name)
  for name in ['baseline-bank.json','manifest.json','lunyu-revisions.json','source-evidence.json']:shutil.copyfile(HERE/name,self.dir/name)
  self.base=read(self.dir/'baseline-bank.json')['questions']
 def tearDown(self):self.tmp.cleanup()
 def change_pack(self,fn):
  path=self.dir/'lunyu-revisions.json';pack=read(path);fn(pack)
  path.write_text(json.dumps(pack,ensure_ascii=False),encoding='utf-8')
  m=read(self.dir/'manifest.json');m['packSha256']=hashlib.sha256(path.read_bytes()).hexdigest()
  (self.dir/'manifest.json').write_text(json.dumps(m),encoding='utf-8')
 def test_full_coverage_and_unchanged_others(self):
  before=copy.deepcopy(self.base);after,s=apply_chapter(self.base,self.dir)
  self.assertEqual(self.base,before);self.assertEqual(s['questions'],266)
  for old,new in zip(before,after):
   self.assertEqual(old['id'],new['id']);self.assertEqual(old['memoryId'],new['memoryId']);self.assertEqual(old['answerId'],new['answerId'])
   if 'essay-01' not in old['essayIds']:self.assertEqual(old,new)
   else:self.assertEqual(new['version'],old['version']+1)
 def test_missing_record_rejected(self):
  self.change_pack(lambda p:p['records'].pop())
  with self.assertRaisesRegex(ValueError,'coverage'):apply_chapter(self.base,self.dir)
 def test_changed_key_rejected(self):
  self.change_pack(lambda p:p['records'][0]['patch'].update(answerId='b'))
  with self.assertRaisesRegex(ValueError,'unapproved'):apply_chapter(self.base,self.dir)
 def test_wrong_highlight_rejected(self):
  self.change_pack(lambda p:p['records'][0]['patch'].update(targetStart=99999))
  with self.assertRaisesRegex(ValueError,'highlight'):apply_chapter(self.base,self.dir)
 def test_stale_question_rejected(self):
  self.change_pack(lambda p:p['records'][0].update(baseQuestionHash='stale'))
  with self.assertRaisesRegex(ValueError,'Stale'):apply_chapter(self.base,self.dir)
 def test_changed_input_rejected(self):
  self.base[-1]['stem']+=' changed'
  with self.assertRaisesRegex(ValueError,'baseline'):apply_chapter(self.base,self.dir)
 def test_unfrozen_file_rejected(self):
  with (self.dir/'lunyu-revisions.json').open('a',encoding='utf-8') as f:f.write(' ')
  with self.assertRaisesRegex(ValueError,'Frozen'):apply_chapter(self.base,self.dir)
 def setup_sequence(self):
  child=self.dir/'essay-02';child.mkdir()
  for name in ['baseline-bank.json','manifest.json','revisions.json','source-evidence.json']:shutil.copyfile(HERE/'essay-02'/name,child/name)
  (self.dir/'sequence.json').write_text(json.dumps({'chapters':['essay-02']}),encoding='utf-8')
 def test_sequence_preserves_previous_chapter_and_deduplicates_cross_questions(self):
  self.setup_sequence();first,s=apply_chapter(self.base,self.dir);after,total=apply_sequence(self.base,self.dir)
  expected,last=apply_chapter(first,self.dir/'essay-02')
  self.assertEqual(after,expected);self.assertEqual(total['uniqueQuestions'],336);self.assertEqual(total['chapterCount'],2)
  for a,b in zip(first,after):
   if 'essay-02' not in a['essayIds']:self.assertEqual(a,b)
  self.assertEqual([q['answerId'] for q in self.base],[q['answerId'] for q in after])
 def test_sequence_rejects_duplicate_phase(self):
  self.setup_sequence();(self.dir/'sequence.json').write_text(json.dumps({'chapters':['essay-02','essay-02']}),encoding='utf-8')
  with self.assertRaisesRegex(ValueError,'Duplicate'):apply_sequence(self.base,self.dir)
 def test_sequence_rejects_missing_phase(self):
  (self.dir/'sequence.json').write_text(json.dumps({'chapters':['essay-99']}),encoding='utf-8')
  with self.assertRaisesRegex(ValueError,'Missing'):apply_sequence(self.base,self.dir)
if __name__=='__main__':unittest.main()
