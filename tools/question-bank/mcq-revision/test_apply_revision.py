import copy,hashlib,json,tempfile,unittest
from pathlib import Path
from apply_revision import apply_revision

class RevisionReleaseTests(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.directory=Path(self.tmp.name)
        self.q={'id':'q','memoryId':'m','version':1,'essayIds':['essay-01'],
          'source':{'anchor':'原文'},'answerId':'a','status':'reviewed','active':True,
          'stem':'舊問法','quote':'原文','explanation':'解析',
          'choices':[{'id':x,'text':x,'explanation':'理由'} for x in 'abcd']}
        self.appendix={**copy.deepcopy(self.q),'id':'appendix','memoryId':'appendix','essayIds':[]}
        self.original=[self.q,self.appendix]
        self.revision={**copy.deepcopy(self.q),'version':2,'stem':'新問法',
          'revisionReason':'具體文本判斷','assessmentType':'文意辨析'}
        self.pack={'questions':[self.revision],'reviewedIds':['q'],'unchangedIds':[]}
        self.dump('baseline-bank.json',{'questions':self.original})
        self.approve()
    def dump(self,name,data):
        (self.directory/name).write_text(json.dumps(data,ensure_ascii=False),encoding='utf-8')
    def approve(self):
        self.dump('part-a.json',self.pack)
        sha=lambda name:hashlib.sha256((self.directory/name).read_bytes()).hexdigest()
        self.dump('release-manifest.json',{'version':'test','baselineSha256':sha('baseline-bank.json'),
          'packs':[{'file':'part-a.json','sha256':sha('part-a.json')}]})
    def test_applies_revision_without_mutating_original_or_appendix(self):
        result,report=apply_revision(self.original,self.directory)
        self.assertEqual(result[0]['stem'],'新問法')
        self.assertEqual(result[0]['responseFormat'],'single-choice')
        self.assertEqual(self.q['stem'],'舊問法')
        self.assertEqual(result[1],self.appendix)
        self.assertEqual(report['unchangedAppendix'],1)
    def test_unapproved_draft_is_ignored(self):
        self.dump('part-d.json',{'questions':[{'id':'unrelated'}]})
        result,_=apply_revision(self.original,self.directory)
        self.assertEqual(len(result),2)
    def test_changed_author_pack_requires_new_approval(self):
        self.revision['stem']='未核查修改'
        self.dump('part-a.json',self.pack)
        with self.assertRaisesRegex(ValueError,'Unapproved revision'):apply_revision(self.original,self.directory)
    def test_upstream_changes_are_not_silently_overwritten(self):
        current=copy.deepcopy(self.original);current[0]['stem']='上游新改稿'
        with self.assertRaisesRegex(ValueError,'differs'):apply_revision(current,self.directory)
    def test_source_and_memory_identity_changes_are_rejected(self):
        for field,new in [('memoryId','other'),('source',{'anchor':'另一來源'})]:
            with self.subTest(field=field):
                original=self.revision[field];self.revision[field]=new;self.approve()
                with self.assertRaisesRegex(ValueError,'identity/source'):apply_revision(self.original,self.directory)
                self.revision[field]=original
    def test_incomplete_disposition_is_rejected(self):
        self.pack={'questions':[],'reviewedIds':[],'unchangedIds':[]};self.approve()
        with self.assertRaisesRegex(ValueError,'incomplete'):apply_revision(self.original,self.directory)
    def test_choice_collision_and_version_regression_are_rejected(self):
        self.revision['choices'][1]['text']='a';self.approve()
        with self.assertRaisesRegex(ValueError,'Invalid choices'):apply_revision(self.original,self.directory)
        self.revision['choices'][1]['text']='b';self.revision['version']=1;self.approve()
        with self.assertRaisesRegex(ValueError,'increment'):apply_revision(self.original,self.directory)

if __name__=='__main__':unittest.main()
