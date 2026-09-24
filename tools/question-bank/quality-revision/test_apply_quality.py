import copy, hashlib, json, tempfile, unittest
from pathlib import Path
from apply_quality import apply_quality, digest, reuse_risks

class MergeTests(unittest.TestCase):
 def setUp(self):
  self.tmp=tempfile.TemporaryDirectory();self.addCleanup(self.tmp.cleanup);self.d=Path(self.tmp.name)
  self.q={'id':'q','version':2,'memoryId':'m','essayIds':['e'],'status':'reviewed','active':True,'stem':'問','quote':'原文','target':'原','targetStart':0,'answerId':'a','explanation':'舊解','choices':[{'id':x,'text':x,'explanation':'理由'} for x in 'abcd']}
  self.save('baseline-bank.json',{'questions':[self.q]})
  self.record={'id':'q','baseQuestionHash':digest(self.q),'decision':'revise','patch':{'explanation':'新解'},'reason':'原解缺推理','objective':'辨別','evidence':[{'blockPath':'$[0]','quote':'原文','claim':'依據','pdfPage':1}],'optionAudit':[{'id':x,'attraction':'吸引','misreading':'錯步','refutation':'排除','followUp':'回看'} for x in 'abcd'],'gates':{f'G{i}':'具體核對' for i in range(1,6)}}
 def save(self,name,obj):
  p=self.d/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(obj,ensure_ascii=False),encoding='utf-8');return hashlib.sha256(p.read_bytes()).hexdigest()
 def release(self,records=None,reviewer='other',verdict='approve'):
  records=records or [self.record]
  ph=self.save('draft.json',{'author':'writer','records':records})
  rh=self.save('review.json',{'reviewer':reviewer,'packSha256':ph,'records':[{'id':r['id'],'verdict':verdict,'notes':'核對來源及全部選項'} for r in records]})
  self.save('release-manifest.json',{'version':'new','baselineSha256':hashlib.sha256((self.d/'baseline-bank.json').read_bytes()).hexdigest(),'packs':[{'file':'draft.json','sha256':ph,'review':'review.json','reviewSha256':rh}],'reviewedIds':[r['id'] for r in records]})
 def test_success_preserves_old_and_increments_once(self):
  self.release();old=copy.deepcopy(self.q);new,summary=apply_quality([self.q],self.d)
  self.assertEqual(self.q,old);self.assertEqual(new[0]['version'],3);self.assertEqual(new[0]['memoryId'],'m')
  self.assertEqual(apply_quality([self.q],self.d)[0],new)
 def test_stale_source_rejected(self):
  self.release();q={**self.q,'explanation':'elsewhere edit'}
  with self.assertRaisesRegex(ValueError,'baseline'):apply_quality([q],self.d)
 def test_unreviewed_and_self_review_rejected(self):
  for reviewer,verdict in [('writer','approve'),('other','revise')]:
   self.release(reviewer=reviewer,verdict=verdict)
   with self.assertRaises(ValueError):apply_quality([self.q],self.d)
 def test_identity_and_unknown_field_rejected(self):
  for field in ['memoryId','version','invented']:
   self.record['patch']={field:'x'};self.release()
   with self.assertRaisesRegex(ValueError,'field'):apply_quality([self.q],self.d)
 def test_duplicate_or_unknown_id_rejected(self):
  self.release([self.record,self.record])
  with self.assertRaises(ValueError):apply_quality([self.q],self.d)
  self.record['id']='unknown';self.release()
  with self.assertRaises(ValueError):apply_quality([self.q],self.d)
 def test_pack_tamper_rejected(self):
  self.release();(self.d/'draft.json').write_text('{}')
  with self.assertRaisesRegex(ValueError,'hash'):apply_quality([self.q],self.d)
 def test_hold_keeps_history_and_requires_evidence(self):
  self.record.update(decision='hold',patch={'active':False});self.release(verdict='hold')
  new,_=apply_quality([self.q],self.d);self.assertFalse(new[0]['active']);self.assertTrue(self.q['active'])
 def test_changed_highlight_and_duplicate_choices_rejected(self):
  for patch in [{'quote':'別句'},{'choices':[self.q['choices'][0]]*4}]:
   self.record['patch']=patch;self.release()
   with self.assertRaises(ValueError):apply_quality([self.q],self.d)
 def reuse_release(self,change=None,audit_change=None):
  self.q['explanation']='原句支持正解的具體判斷'
  for c in self.q['choices']:c['explanation']='根據原句辨別'+c['id']
  self.q['source']={'blockPath':'$[0]','pdfPage':1,'anchor':'原文'}
  self.q['review']={'method':'source-review','date':'2026-09-20','scope':'逐項核對原文與答案'}
  self.save('baseline-bank.json',{'questions':[self.q]})
  r={'id':'q','version':2,'baseQuestionHash':digest(self.q),'currentQuestionHash':digest(self.q),'priorReviewHash':digest(self.q['review']),'priorReview':{'path':'baseline-bank.json','pointer':'/questions/0/review','method':'source-review','reviewedAt':'2026-09-20','scope':'逐項核對原文與答案'},'evidence':{'answerBasis':self.q['explanation'],'optionReasons':{c['id']:c['explanation'] for c in self.q['choices'] if c['id']!='a'},'provenance':{'answerBasis':'question.explanation','optionReasons':'choices[].explanation'}},'sourceChecks':[{'blockPath':'$[0]','pdfPage':1,'blockResolved':True,'anchorInPdf':True,'sourceMetadataMatches':True,'sourceSha256Status':'not-provided'}],'riskSignals':[],'eligibilityCandidate':'reuse-candidate'}
  if change:change(r)
  rh=self.save('reuse-packs/p.json',{'records':[r]})
  sample={'id':'q','reviewer':'another','verdict':'approve','notes':'核對原句、正解與三個錯項','questionHash':digest(self.q),'sourceChecked':True,'answerChecked':True,'optionsChecked':True}
  audit={'sampleSeed':'fixed-seed','records':[sample],'findings':[],'escalatedStrata':[]}
  if audit_change:audit_change(audit)
  ah=self.save('reuse-audits/p.json',audit)
  self.save('release-manifest.json',{'version':'new','baselineSha256':hashlib.sha256((self.d/'baseline-bank.json').read_bytes()).hexdigest(),'packs':[],'reviewedIds':[],'reusePacks':[{'file':'reuse-packs/p.json','sha256':rh,'audit':'reuse-audits/p.json','auditSha256':ah}]})
 def test_reuse_preserves_question_and_keeps_separate_count(self):
  self.reuse_release();new,summary=apply_quality([self.q],self.d)
  self.assertEqual(new,[self.q]);self.assertEqual(summary['reviewed'],0)
  self.assertEqual(summary['reusedPriorReview'],1);self.assertEqual(summary['sampledCrossReviewed'],1);self.assertEqual(summary['pending'],0)
 def test_reuse_hash_risk_and_evidence_fail_closed(self):
  for change in (lambda r:r.update(currentQuestionHash='wrong'),lambda r:r.update(priorReviewHash='wrong'),lambda r:r['evidence'].update(answerBasis='asserted'),lambda r:r.update(riskSignals=['generic-reason'])):
   self.reuse_release(change=change)
   with self.assertRaises(ValueError):apply_quality([self.q],self.d)
 def test_reuse_requires_real_sample_and_source_check(self):
  self.reuse_release(audit_change=lambda a:a.update(records=[]))
  with self.assertRaisesRegex(ValueError,'sample coverage'):apply_quality([self.q],self.d)
  self.reuse_release(audit_change=lambda a:a.update(findings=['wrong answer']))
  with self.assertRaisesRegex(ValueError,'escalation'):apply_quality([self.q],self.d)
  self.reuse_release(change=lambda r:r['sourceChecks'][0].update(anchorInPdf=False))
  with self.assertRaisesRegex(ValueError,'source check'):apply_quality([self.q],self.d)
 def test_reuse_rejects_computed_text_risk(self):
  for c in self.q['choices'][1:]:c['text']='只有'+c['id']
  self.reuse_release()
  with self.assertRaisesRegex(ValueError,'unresolved risk'):apply_quality([self.q],self.d)
 def test_reuse_rejects_duplicate_id_even_with_frozen_hash(self):
  self.reuse_release()
  pack=json.loads((self.d/'reuse-packs/p.json').read_text(encoding='utf-8'))
  pack['records'].append(copy.deepcopy(pack['records'][0]))
  ph=self.save('reuse-packs/p.json',pack)
  manifest=json.loads((self.d/'release-manifest.json').read_text(encoding='utf-8'))
  manifest['reusePacks'][0]['sha256']=ph
  self.save('release-manifest.json',manifest)
  with self.assertRaisesRegex(ValueError,'duplicate reuse ID'):apply_quality([self.q],self.d)
 def author_release(self,patch=None,old_same=False):
  for c in self.q['choices']:c['explanation']='具體理由'+c['id']
  if old_same:
   for c in self.q['choices'][1:]:c['explanation']='同一個空泛理由'
  self.q['source']={'blockPath':'$[0]','pdfPage':1,'anchor':'原文'}
  self.save('baseline-bank.json',{'questions':[self.q]})
  r=copy.deepcopy(self.record);r['baseQuestionHash']=digest(self.q);r['patch']=patch or {'explanation':'新解'};r['riskSignals']=reuse_risks(self.q);r['contentRisk']='none'
  ph=self.save('author-drafts/p.json',{'author':'writer','records':[r]})
  expected=copy.deepcopy(self.q);expected.update(r['patch']);expected['version']=3;expected['responseFormat']='single-choice';expected['revisionReason']=r['reason']
  expected['review']={'method':'source-review-and-author-check','date':'2026-09-23','author':'writer','disposition':'revise','scope':'作者逐項核對來源及選項；抽樣覆核另有記錄，非全題交叉審查或教師終審。','evidence':'原文'}
  audit={'sampleSeed':'fixed-seed','records':[{'id':'q','reviewer':'other','verdict':'approve','notes':'核對原句與選項','questionHash':digest(expected),'sourceChecked':True,'answerChecked':True,'optionsChecked':True}],'findings':[],'escalatedStrata':[]}
  ah=self.save('author-audits/p.json',audit)
  self.save('release-manifest.json',{'version':'new','baselineSha256':hashlib.sha256((self.d/'baseline-bank.json').read_bytes()).hexdigest(),'packs':[],'reviewedIds':[],'authorPacks':[{'file':'author-drafts/p.json','sha256':ph,'audit':'author-audits/p.json','auditSha256':ah}],'authorReviewedIds':['q']})
 def test_author_reviewed_revision_is_distinct_and_sampled(self):
  self.author_release();new,summary=apply_quality([self.q],self.d)
  self.assertEqual(new[0]['review']['method'],'source-review-and-author-check')
  self.assertEqual(summary['reviewed'],0);self.assertEqual(summary['revisedAuthorReviewed'],1)
  self.assertEqual(summary['sampledCrossReviewed'],1)
 def test_author_only_cannot_change_key_or_source(self):
  for patch in ({'answerId':'b'},{'source':{'blockPath':'$[1]','pdfPage':1}},{'active':False}):
   self.author_release(patch)
   with self.assertRaisesRegex(ValueError,'High-risk revision'):apply_quality([self.q],self.d)
 def test_author_can_repair_text_flag_with_sample(self):
  choices=copy.deepcopy(self.q['choices'])
  for c in choices:c['explanation']='具體排除'+c['id']
  self.author_release({'choices':choices,'explanation':'新解'},old_same=True)
  new,summary=apply_quality([self.q],self.d)
  self.assertEqual(summary['revisedAuthorReviewed'],1)
  self.assertEqual(new[0]['review']['method'],'source-review-and-author-check')

if __name__=='__main__':unittest.main()
