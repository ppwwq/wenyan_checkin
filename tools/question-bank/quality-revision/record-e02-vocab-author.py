"""Author a source-checked, unreleased essay-02 vocabulary revision pack."""
import json
from pathlib import Path

from apply_quality import digest, read

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[2]
OUT = HERE / 'drafts/record-e02-vocab.json'


def row(text, explanation, attraction, misreading, follow_up):
    return dict(text=text, explanation=explanation, attraction=attraction,
                misreading=misreading, followUp=follow_up)


SPECS = {
    'q-e02-exp-002': dict(
        objective='由「患有所不辟」判斷「辟」通「避」，指躲避禍患。',
        reason='四項改為同一行動維度，分清躲避、防備、排除和承受；逐項解釋「不辟」的語境。',
        explanation='「患」是禍患，「不辟」是面對某些禍患仍不躲避；孟子以此說明有比死亡更令人厭惡的事。「辟」通「避」，不是預作防備或把禍患消除。',
        summary='辟通「避」：躲避禍患。',
        options={
            'a': row('躲避禍患', '「患有所不辟」說有些禍患不去躲避；「辟」通「避」。', '辟與避字形音義相通', '正解：此處說是否躲開禍患', '連讀「患」「不辟」，再看上句為何寧願面對禍患。'),
            'b': row('預防禍患', '「不辟」談面對禍患時是否躲開，不是事先預防它發生。', '防與避同屬應對危險', '把避免遭遇讀成事前防範', '看「患有所不辟」是否交代了事前措施。'),
            'c': row('消除禍患', '孟子沒有說能令禍患消失；「不辟」只是說有人不選擇躲避。', '消除危險也可保全生命', '把個人不躲避讀成消滅禍患', '分清禍患是否仍存在與人是否避開。'),
            'd': row('承受禍患', '承受可能是不躲避後的結果，「辟」本身仍是躲避的動作。', '下文確實可推知有人承受禍患', '把「不辟」的後果當「辟」字義', '先解「辟」，再解否定詞「不」所形成的整句意思。'),
        }),
    'q-e02-exp-004': dict(
        objective='辨別「所識窮乏者得我與」的「得」通「德」，指窮乏者感激我。',
        reason='將四項改成相近的兩字動詞，排除正解長度提示；分清得到、認得、感激、報答。',
        explanation='「所識窮乏者」是受施的人，「我」是可能施予的人；「得我」指他們感激我，得通「德」。此處追問自己是否為了別人的感激而接受萬鍾，不是說自己得到或認得誰。',
        summary='得通「德」：感激。',
        options={
            'a': row('得到', '若解為取得，就成了窮乏者「得到我」；句子所問的是他們會否感激我。', '得的常用義是取得', '把通假字照常用的取得義讀', '把「所識窮乏者」和「我」分作動作主體、對象再譯。'),
            'b': row('認得', '「所識」已交代被我認識的窮乏者；「得我」另問他們是否感激我。', '所識與認識有語義聯繫', '把前面的「所識」移作「得」字義', '分別解「所識」和「得我」兩段。'),
            'c': row('感激', '得通「德」；窮乏者感激施予者，才與追問受萬鍾的動機相連。', '通假注釋與受惠關係都指向感激', '正解：窮乏者因受惠而感激我', '連接「所識窮乏者」與「我」，說清誰感激誰。'),
            'd': row('報答', '報答是以行動回報；原句只問窮乏者會否感激我，沒有說他們再給我甚麼。', '感激之後可能有報答', '把感謝之情擴作已採取回報行動', '看原句是否寫出任何回報行為。'),
        }),
    'full-a-e02-p01-b00-v02': dict(
        objective='由「舍魚而取熊掌」的取捨關係判斷「舍」通「捨」，指放棄魚。',
        reason='四項同以魚為對象，改成可比較的動作；去掉正解獨有的通假說明，另在解析補回。',
        explanation='「二者不可得兼」先定不能兩全，接着「舍魚而取熊掌」寫放棄魚、選取熊掌。「舍」通「捨」，是放棄，不是保存、轉贈或安放魚。',
        summary='舍通「捨」：放棄。',
        options={
            'a': row('留下魚', '「取熊掌」與「舍魚」成對；魚被放棄，並非留下。', '兩種食物都是所欲，可能想保留魚', '忽略「不可得兼」與「取熊掌」的取捨', '把「舍魚」和「取熊掌」作兩個相反動作來譯。'),
            'b': row('贈送魚', '原句只比較自己取與舍，未寫把魚交給別人。', '舍可令人想到施捨', '把放棄一物增寫成送給他人', '找原句有沒有魚的受贈者。'),
            'c': row('安置魚', '把魚安置好仍是保留它；「不可得兼」要求在兩物間放棄一物。', '舍另有居所、安置相關字義', '套用不同語境的舍字義', '用「不可得兼」核對此處所需的動作。'),
            'd': row('放棄魚', '舍通「捨」；在兩物不能兼得時，捨魚而取熊掌。', '與取熊掌形成相反的取捨', '正解：放棄魚而選熊掌', '以魚／熊掌對應後文生／義的取捨。'),
        }),
    'full-a-e02-p02-b00-v02': dict(
        objective='由「莫甚於生」的比較結構判斷「莫」表示沒有甚麼。',
        reason='將四項統一為兩字詞義，排除正解篇幅提示；分別辨明否定存在、禁止、時間否定與推測。',
        explanation='「所欲莫甚於生」是假設沒有任何想要的事物超過生命，後面才推說人會使用一切求生辦法。「莫」否定有這樣的事物，並非叫人不要、說尚未或表示猜測。',
        summary='莫：沒有甚麼。',
        options={
            'a': row('不要', '「莫甚於生」不是勸人不要超過生命，而是假設沒有更想要的事物。', '莫在別處可作禁止詞', '把存在判斷誤作命令', '把「人之所欲莫甚於生」譯成陳述，再辨是否有命令對象。'),
            'b': row('沒有', '「莫甚於生」指沒有甚麼所欲超過生命，與下句「凡可以得生者」的假設推論相接。', '莫字否定更高的欲望', '正解：沒有甚麼超過生命', '把「莫」與「甚於生」合讀。'),
            'c': row('或許', '「如使」已引出假設；「莫」在假設內作否定，不是推測可能有更想要的事物。', '假設句容易被讀成不確定推測', '把假設標記的作用移給莫', '分清「如使」引假設與「莫」否定存在。'),
            'd': row('尚未', '「尚未」只說目前沒有，容許日後改變；「莫甚於生」是假定沒有更重於生的所欲。', '未與莫都有否定色彩', '把一般否定讀成時間上的未發生', '看原句有沒有表示時間先後的詞。'),
        }),
    'full-a-e02-p03-b00-v08': dict(
        objective='以「蹴爾而與之，乞人不屑」判斷不屑是不認為值得接受受辱施予。',
        reason='保留核心判斷，讓錯項各借同段的獲得、禮義和維生線索，逐項說明何處越界。',
        explanation='行人對「嘑爾」的給予「弗受」，乞人對「蹴爾」的給予「不屑」；兩句並列，重點是施予方式帶侮辱，受者認為不值得接受，並不是取不到、毋須辨禮義或食物不能維生。',
        summary='不屑：認為不值得接受。',
        options={
            'a': row('認為不值得接受', '「弗受」與「不屑」並列，乞人因受辱而不願接受被踐踏後給的食物。', '上下兩句的拒受行為相互說明', '正解：從侮辱性的給予判斷拒受原因', '比較「嘑爾」與「蹴爾」兩種施予方式。'),
            'b': row('認為無法取得食物', '食物已由人「蹴爾而與之」；問題不是得不到，而是乞人不願接受。', '前句說不得食會死', '把是否能取得誤作是否肯接受', '按「與之」確認食物是否已被提供。'),
            'c': row('認為不必分辨禮義', '「不辯禮義」屬後文受萬鍾者的行為；乞人拒受反而顯示其有所辨。', '緊接的萬鍾句含不辯禮義', '把後文受祿者的態度移到乞人', '分清乞人與受萬鍾者兩種行為。'),
            'd': row('認為食物不足維生', '前文明言「得之則生」；拒受由施予方式引起，非因份量不足。', '一簞食一豆羹看似少', '把拒受歸因於份量而非受辱', '連讀「得之則生」與「蹴爾而與之」。'),
        }),
    'full-a-e02-p03-b00-v10': dict(
        objective='辨明「不辯禮義而受之」的辯通辨，指分辨受祿是否合乎禮義。',
        reason='四項都圍繞受祿及禮義，減少通假說明造成的長度提示；逐項辨析論辯、申辯、分辨和辯護。',
        explanation='孟子批評「萬鍾則不辯禮義而受之」：受俸祿之前不分辨是否合乎禮義。「辯」通「辨」；不是與人討論、為自己解釋或替受祿辯護。',
        summary='辯通「辨」：分辨禮義。',
        options={
            'a': row('討論禮義', '此處問接受萬鍾前有否分辨合乎禮義，不是與人討論禮義道理。', '辯常指口頭論辯', '把內在辨別讀成對外討論', '看「不辯禮義」後緊接哪個行動。'),
            'b': row('申明理由', '句中沒有向他人解說理由；「而受之」顯示問題在接受前未作判別。', '辯也可帶申辯之義', '把判斷是非換成陳述理由', '將「辯禮義」與「受之」連讀。'),
            'c': row('辨別禮義', '辯通「辨」；須辨接受萬鍾是否合乎禮義，才能判斷該不該受。', '禮義是受祿時要判別的標準', '正解：辨明行為合不合禮義', '對照前面的乞人拒受與後面的萬鍾受之。'),
            'd': row('辯護受祿', '辯護是替接受萬鍾找藉口；原句說的是未辨禮義便受下俸祿。', '受祿者可能會替自己找說法', '把辨別標準改作事後辯護', '按「不辯……而受之」判先後。'),
        }),
    'full-a-e02-p03-b00-v11': dict(
        objective='由「萬鍾於我何加焉」判斷加指對自己有何增益或好處。',
        reason='四項統一為四字語境解釋，分清益處、數量、懲罰與比較；不讓正解獨長。',
        explanation='孟子問「萬鍾於我何加焉」：豐厚俸祿對我有甚麼益處？下句列宮室、妻妾等誘惑，再反問是否值得為此失去禮義。「加」指增益、好處，不是單說俸祿數量增加。',
        summary='加：對我有何增益。',
        options={
            'a': row('增加俸祿', '「萬鍾」已指豐厚俸祿；「於我何加」追問它對自己有何益處，非問再加多少。', '加常指數量增加', '把價值追問縮成俸祿數目變化', '把「何加」接在「於我」後譯。'),
            'b': row('所添好處', '「於我」點明受益對象，「何加」追問這份俸祿對我究竟有甚麼好處，並非斷言它真有益。', '與「於我何加焉」問句直接相合', '正解：追問有何增益', '分清物質引誘與孟子要衡量的價值。'),
            'c': row('加諸責罰', '下文列美宅與侍奉等誘惑，不是責罰；「於我何加」問好處。', '加可接「加罪」等施加動作', '把加諸某物的動詞義硬套此句', '查下文舉的是好處還是處罰。'),
            'd': row('勝過他人', '「於我」是在問對自己的益處，沒有比較另一個人的得失。', '加可聯想超出、更加', '憑字面添入句中沒有的比較對象', '找出「於我」指向誰，並查有沒有「他人」。'),
        }),
    'full-a-e02-p03-b00-v14': dict(
        objective='辨明「所識窮乏者得我與」句末「與」通「歟」，用來發問。',
        reason='四項都改為四字語法作用，排除正解獨長；解釋本句末字與同段「與之」的動詞義不同。',
        explanation='「所識窮乏者得我與？」末字在句尾，通「歟」，構成對受祿動機的追問。它不同於前面「嘑爾而與之」的「與」（給予），也不是並列或參與。',
        summary='與通「歟」：句末疑問。',
        options={
            'a': row('句末發問', '句末「與」通「歟」，把「窮乏者得我」提出來反問。', '位於句末並承接動機追問', '正解：語氣助詞表疑問', '將本句末「與」和同段「與之」對照。'),
            'b': row('把物給人', '「嘑爾而與之」的與才是給予；本句末「與」後沒有受物者或所給之物。', '同段出現動詞「與之」', '把前一句同字動詞義移到句末助詞', '比較兩個與字的位置和後面是否接賓語。'),
            'c': row('與人一同', '本句沒有「與某人」共同做事的結構；「與」在疑問句末。', '與在別處可作偕同', '把介詞或連詞義套入句末', '找本句有沒有「與」後的共同對象。'),
            'd': row('參與其事', '此處不是說窮乏者參與受祿；「與」在句末標示孟子的追問。', '參與也可用與字表示', '把句末語氣詞讀成動詞', '先辨「與」的句法位置，再解整句。'),
        }),
    'full-a-e02-p04-b00-v00': dict(
        objective='以「鄉……今……」的今昔對照判斷鄉通向，指從前。',
        reason='選項改成同長的時間、方向、地方與人物解法；主解析補出「鄉／今」對照。',
        explanation='「鄉為身死而不受，今為宮室之美為之」對照以前與現在的取捨；「鄉」通「向」，在此指從前，不是故鄉或朝向。',
        summary='鄉通「向」：從前。',
        options={
            'a': row('往日住處', '「鄉」與「今」相對，說的是往日做法，不是住過的地方。', '鄉常指故鄉', '把時間副詞讀成地點名詞', '用「今」找與它對應的時間詞。'),
            'b': row('朝向一方', '「向」在此為從前義；句中沒有行走或面向的方向。', '鄉通向可能引出面向義', '只見通假字形而套入另一向字義', '把「鄉……今……」作今昔對照來譯。'),
            'c': row('鄉里的人', '句子比較同一人從前與如今是否接受，沒有換成鄉里別人的行為。', '鄉可指鄉里', '把時間主語換作地方人物', '看「鄉為」與「今為」是否同一人的對照。'),
            'd': row('從前時候', '「鄉」通「向」而指從前，正與後面的「今」形成時間對照。', '鄉今兩字直接對應', '正解：從前與如今對比', '連讀三次「鄉為身死而不受」與相應的「今為」。'),
        }),
    'full-a-e02-p09-b01-g01': dict(
        objective='由「何不為也」承接避患辦法，辨明為是做、實行。',
        reason='將四項改成兩字詞義並逐項說明語法位置，去掉只有正解附兩義造成的形式提示。',
        quote='使人之所惡莫甚於死者，則凡可以辟患者，何不為也？',
        explanation='上文說「凡可以辟患者」，「何不為也」接着問為何不去做那些可避患的事。「為」是實行，不是表目的、原因或被動。',
        summary='為：做、實行避患之事。',
        options={
            'a': row('為了', '「何不為也」缺少為了甚麼的後接目的；它問何以不實行避患辦法。', '為在同篇另一句可表目的', '把「今為宮室之美」前為的目的義移來', '對照同篇前後兩個為的後接成分。'),
            'b': row('實行', '「凡可以辟患者，何不為也」問何以不實行能避患的做法。', '何不後接動作', '正解：實行避患之事', '把「何不為也」連到上句可避患之法。'),
            'c': row('因為', '因為需引出原因；此處「何不」後要接所做之事。', '同篇「鄉為身死」的為可表原因', '把另一句的因由義挪到問句', '看「何不」後的為能否直接回答做甚麼。'),
            'd': row('被動', '本句沒有施事者加在「為」後，問的是人不去做避患之事。', '為可在別句表示被動', '把主動的實行讀成承受他人動作', '找句中有沒有使人受動的施事者。'),
        }),
    'full-a-e02-p09-b01-g04': dict(
        objective='由「鄉……不受，今……為之」辨明後一個為是做、實行此事。',
        reason='補足鄉今對照引文並重定位後為；四項分清目的、變成、代人及實行，避免答案依賴未呈現的萬鍾句。',
        quote='鄉為身死而不受，今為宮室之美為之；',
        explanation='「鄉為身死而不受」與「今為宮室之美為之」相對：以前不接受，如今卻為美宅而做這件事。前一個「為」表目的，後一個「為」接「之」，是做、實行，不是再次表示目的，也不是變成宮室或替別人做。',
        summary='後為：做、實行此事。',
        options={
            'a': row('為求美宅', '這是前一個「為宮室之美」的目的；後一個為接「之」，指因目的而做的事。', '同一句前為確有目的義', '把前後兩個為的作用混同', '把前為與後為各接哪些字畫出來。'),
            'b': row('變成美宅', '「宮室之美」是如今行事的目的，不是人或任何物變成房屋。', '為有成為義', '把目的賓語誤作變化結果', '看「今為宮室之美」與「為之」的分句關係。'),
            'c': row('替人行事', '所示兩句都是同一人從前不受、如今為之的對照，沒有另一個人請他代做。', '為可表替、給', '憑同字添入代他人行事的主體', '核對「鄉……不受」與「今……為之」的行動者。'),
            'd': row('實行此事', '後一個為與「之」連用，和先前「不受」相對，指如今卻做這件事。', '前後不受與為之形成行為對照', '正解：因宮室之美而實行此事', '比較以前「不受」和如今「為之」兩個動作。'),
        }),
}


def main():
    baseline = read(HERE / 'baseline-bank.json')
    bank = read(ROOT / 'web-study/content/bank.json')
    released = set(read(HERE / 'release-manifest.json')['reviewedIds'])
    calibration = {r['id'] for r in read(HERE / 'record-calibration-2026-09-23.json')['records']}
    pending = {r['id']: r for r in read(HERE / 'prior-review-inventory.json')['records']
               if r['eligibilityCandidate'] == 'requires-review'}
    old_by_id = {q['id']: q for q in baseline['questions']}
    live_by_id = {q['id']: q for q in bank['questions']}
    records = []
    for ident, spec in SPECS.items():
        if ident in released or ident in calibration or ident not in pending:
            raise ValueError('Not an eligible pending ID: ' + ident)
        old = old_by_id[ident]
        if (old != live_by_id[ident] or old['essayIds'] != ['essay-02']
                or old['ability'] != 'vocabulary'):
            raise ValueError('Question scope or frozen input drift: ' + ident)
        answer = old['answerId']
        if set(spec['options']) != {c['id'] for c in old['choices']}:
            raise ValueError('Option IDs differ: ' + ident)
        choices = [{'id': choice['id'], 'text': spec['options'][choice['id']]['text'],
                    'explanation': spec['options'][choice['id']]['explanation']}
                   for choice in old['choices']]
        if len({c['text'] for c in choices}) != 4:
            raise ValueError('Repeated option text: ' + ident)
        source = old['source']
        evidence = [{'blockPath': source['blockPath'], 'pdfPage': source['pdfPage'],
                     'quote': spec.get('quote', old['quote']) if source['blockPath'] not in (
                         '$[1].pages[9].blocks[1]',) else source['anchor'],
                     'claim': spec['objective']}]
        for related in source.get('relatedSources', []):
            evidence.append({'blockPath': related['blockPath'], 'pdfPage': related['pdfPage'],
                             'quote': spec.get('quote', related['anchor']), 'claim': spec['objective']})
        option_audit = []
        for choice in old['choices']:
            option = spec['options'][choice['id']]
            option_audit.append({'id': choice['id'], 'attraction': option['attraction'],
                                 'misreading': option['misreading'],
                                 'refutation': option['explanation'],
                                 'followUp': option['followUp'],
                                 'evidenceType': 'hypothesis'})
        wrong = [a for a in option_audit if a['id'] != answer]
        patch = {'choices': choices, 'explanation': spec['explanation'],
                 'summary': spec['summary'],
                 'misconception': '；'.join(a['misreading'] for a in wrong),
                 'revisionReason': spec['reason']}
        if 'quote' in spec:
            patch['quote'] = spec['quote']
            patch['targetStart'] = spec['quote'].rfind(old['target'])
            if patch['targetStart'] < 0:
                raise ValueError('Target missing from new quote: ' + ident)
        record = {'id': ident, 'baseQuestionHash': digest(old), 'decision': 'revise',
                  'patch': patch, 'reason': spec['reason'], 'objective': spec['objective'],
                  'evidence': evidence, 'optionAudit': option_audit,
                  'gates': {
                      'G1': f"核對《魚我所欲也》來源第{source['pdfPage']}物理頁及{source['blockPath']}：{spec['objective']}；屬書本詞注與本文，不冒稱官方評分。",
                      'G2': f"作者逐項反駁：{answer} 項符合「{spec['objective']}」；其餘三項逐項用上下文排除，見 optionAudit；待獨立審稿。",
                      'G3': '錯項分別測：' + '；'.join(a['misreading'] for a in wrong) + '。吸引點只是命題假設，未作學生實測。',
                      'G4': f"四項同測「{old['target']}」的原有詞義；檢查正解長度、絕對詞及同組提示，不以外形替代閱讀。",
                      'G5': f"保留 id、memoryId、essayIds、answerId={answer}、四項邏輯 ID及來源定位；更新選項與解析一致性。" + ('引文補足上句，targetStart 重定位。' if 'quote' in spec else '引文保留。'),
                  }, 'empiricalValidation': 'not-run', 'teacherReview': 'not-run'}
        records.append(record)
    output = {'author': 'record_e02_vocab_author', 'records': records}
    if OUT.exists():
        raise ValueError('Draft already exists; preserve previous authoring file')
    OUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'draft': str(OUT), 'records': len(records),
                      'ids': [r['id'] for r in records]}, ensure_ascii=False))


if __name__ == '__main__':
    main()
