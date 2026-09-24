import copy
import unittest
from common import student_state, validate_question, resolve_source
from build_inputs import families, evidence_excerpt
from run_batch import validate_result, cached

class SafetyTests(unittest.TestCase):
    def q(self,id='one'):
        return {'id':id,'version':1,'memoryId':id,'essayIds':['e1'],'source':{'blockPath':'p'},'stem':'word?',
                'quote':'text','answerId':'a','review':{'accepted':True},'explanation':'SECRET',
                'choices':[{'id':c,'text':c,'explanation':'SECRET'} for c in 'abcd']}
    def test_student_view_cannot_leak_key_or_rationale(self):
        self.assertNotIn('SECRET',str(student_state(self.q())))
        self.assertEqual(set(student_state(self.q())),{'material','stem','options'})
    def test_duplicate_or_unknown_answer_refused(self):
        q=self.q();q['answerId']='z'
        with self.assertRaises(ValueError):validate_question(q)
        q=self.q();q['choices'][1]['id']='a'
        with self.assertRaises(ValueError):validate_question(q)
    def test_related_memory_and_source_families_transitive(self):
        a,b,c=[self.q(x) for x in 'abc'];a['source']['blockPath']='x';b['memoryId']='a'
        f=families([a,b,c]);self.assertEqual(len(set(f.values())),1)
    def test_out_of_schema_output_cannot_be_completed(self):
        t={'questions':{'x':{'criteria':{'yes':'y','no':'n'}}}}
        with self.assertRaises(ValueError):validate_result(t,{'answers':{'x':{'choice':'approve-bank'}}})
        with self.assertRaises(ValueError):validate_result(t,{'answers':{}})
    def test_resume_never_reuses_changed_input_or_failed_call(self):
        t={'inputHash':'new'}
        self.assertFalse(cached(t,{'inputHash':'old','status':'completed'}))
        self.assertFalse(cached(t,{'inputHash':'new','status':'failed'}))
        self.assertTrue(cached(t,{'inputHash':'new','status':'abstained'}))
    def test_source_absence_does_not_resolve_silently(self):
        with self.assertRaises(IndexError):resolve_source('$[9].pages[0].blocks[0]',[],{})
    def test_evidence_dedup_keeps_negations_and_conditions(self):
        q={'quote':'二者不可得兼'}
        ev=[{'locator':{'anchor':'二者不可得兼','excerpt':'不能兼得時才捨生取義'}},
            {'locator':{'anchor':'不能兼得時才捨生取義','excerpt':'不能把它說成厭生'}}]
        texts=evidence_excerpt(q,ev)
        self.assertEqual(texts,['不能兼得時才捨生取義','不能把它說成厭生'])
    def test_evidence_no_truncation_even_if_long(self):
        text='必要語境'*3000
        self.assertEqual(evidence_excerpt({'quote':''},[{'locator':{'anchor':text}}]),[text])

if __name__=='__main__':unittest.main()
