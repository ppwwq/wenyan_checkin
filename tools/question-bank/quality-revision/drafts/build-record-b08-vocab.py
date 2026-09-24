"""Build the source-reviewed essay-08 vocabulary draft pack only."""
import hashlib
import json
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
EXPECTED_IDS = [
    'full-b-08-01-03-1', 'full-b-08-01-03-10', 'full-b-08-01-03-11',
    'full-b-08-01-03-12', 'full-b-08-01-03-13', 'full-b-08-01-03-14',
    'full-b-08-01-03-15', 'full-b-08-01-03-17', 'full-b-08-01-03-18',
    'full-b-08-01-03-19', 'full-b-08-01-03-2', 'full-b-08-01-03-4',
    'full-b-08-01-03-5', 'full-b-08-01-03-6', 'full-b-08-01-03-7',
    'full-b-08-01-03-9', 'full-b-08-02-03-0', 'full-b-08-02-03-1',
    'full-b-08-02-03-10', 'full-b-08-02-03-11',
]

def row(cid, text, explanation, attraction, misreading):
    return (cid, text, explanation, attraction, misreading)

items = [
    dict(id='full-b-08-01-03-1', objective='「居是州」的「是」指這個州。',
         main='「居是州」說住在這個州。「是」限定「州」的所指；後文「凡是州之山」中表「所有」的是「凡」。',
         g4='四項涉及「是」的判斷義、鄰字「凡」的範圍義及遠近指代，須看「居＋是州」。',
         rows=[
             row('a','事情確實如此','「居是州」後接處所「州」；「是」限定哪一州，不是判某事正確。','現代是常表正確','把指示詞讀成真偽判斷'),
             row('b','這個州','「是」緊接「州」，指作者被貶後所住的這個州。','是後直接接州','正解；指示這個州'),
             row('c','所有州郡','「凡是州之山」的「凡」才表所有；單問「是」，仍指這個州。','後文凡是可誤合讀','把凡的範圍義移給是'),
             row('d','先前住過的別州','「是」就近指此時所居之州；原句沒有提另一個先前住過的州。','是州可被誤作回指前述地點','把近指此州換成別州')]),
    dict(id='full-b-08-01-03-10', objective='「幽泉」是幽僻處的泉水。',
         main='「幽泉怪石」是漫遊所見；幽泉指幽僻的泉水，幽不直接說水深、藏地下或發出低沉聲音。',
         g4='四項都描述泉的特徵，須按「無遠不到」的遊覽語境辨幽僻。',
         rows=[
             row('a','光線昏暗的深泉','來源釋「幽」為幽僻，說環境僻靜；句中沒有測泉深或光線。','幽可聯想幽暗','把僻靜讀成深暗'),
             row('b','幽僻處的泉水','PDF字詞表釋幽泉為幽僻的泉水，與怪石並列。','原文景物與注釋相合','正解；泉在幽僻處'),
             row('c','埋在地下的泉水','「幽泉怪石，無遠不到」說遊覽所見，不是看不到的地下水。','幽字可聯想地下','把所見泉水變地下水'),
             row('d','聲音低沉的泉水','原句未寫泉聲，「幽」限定環境，不是聽覺特點。','幽可聯想幽怨聲','添入未寫泉聲')]),
    dict(id='full-b-08-01-03-11', objective='「披草而坐」的「披」是撥開草。',
         main='到了山中，作者撥開草而坐，隨後倒酒；披在此是撥開，不是披衣、鋪墊或砍草。',
         g4='四項同問草的處理方式，須比較「到則披草而坐」與後段「斫／焚」。',
         rows=[
             row('a','撥開身邊的草','到達後撥草以便坐下，PDF釋披為撥開。','坐前要清出地方','正解；為坐下撥草'),
             row('b','把草披在身上','現代披可指披衣；此處「而坐」需清出坐處，不是拿草作衣。','現代披衣常用','把草當衣物'),
             row('c','把草鋪成坐墊','來源釋撥開，未說取草鋪成坐墊。','而坐可誘作鋪墊','把撥草增寫成鋪墊'),
             row('d','把草全部割去','登西山才有斫、焚開路；此處是到後撥草坐下。','後文斫焚可誤移','把局部撥開誇成割盡')]),
    dict(id='full-b-08-01-03-12', objective='「傾壺而醉」是倒盡壺中的酒而飲。',
         main='「傾壺」是把壺中酒倒盡飲用，「而醉」接續飲酒後果；並非注酒入壺或只倒少量。',
         g4='四項都談同一壺酒的流向和份量，須同時核「傾」及「而醉」。',
         rows=[
             row('a','把酒重新注滿壺中','傾壺方向是從壺倒出；後接「而醉」，不是把酒存入。','倒與注方向可混','倒置酒的流向'),
             row('b','把壺傾斜卻沒有飲酒','只傾斜而不飲，不能解釋後面的「而醉」。','只看傾字未看而醉','忽略飲後醉'),
             row('c','倒盡壺中酒而飲','PDF釋為倒盡壺中酒，緊接「而醉」說飲酒的結果。','來源詞注與後果一致','正解；倒盡且飲'),
             row('d','只倒出少量酒後留在壺中','傾壺強調盡倒；只倒少量與來源詞義不合。','傾可誤讀成斟少量','削弱傾壺的程度')]),
    dict(id='full-b-08-01-03-13', objective='「更相枕以臥」的「更」表示輪流。',
         group='b08-vocab-geng-xiangzhen',
         main='醉後同伴「更相枕」，更說輪流相互枕靠，不是程度更深、改換地方或夜間更次。',
         g4='四項都是更的常見不同用法，須與「相枕」的施動者關係配對。',
         rows=[
             row('a','愈來愈深地睡','此處配相枕說人輪替，未比較睡眠深淺。','現代更可表程度','把輪替讀成程度遞增'),
             row('b','改換成另一個睡處','原句說同伴相枕，並未交代改換地點。','更可指更改','把人輪替讀成改地點'),
             row('c','到了夜間更次','醉則接相枕睡夢；來源釋更為輪流，不是報時更次。','更可指夜更','把動作副詞讀成時間名詞'),
             row('d','輪流相互枕靠','PDF注「更＝輪流」；眾人輪流互相枕靠着躺下。','更相枕構成輪替','正解；輪流互靠')]),
    dict(id='full-b-08-01-03-14', objective='「相枕」指同伴互相枕靠着身體而臥。',
         group='b08-vocab-geng-xiangzhen',
         main='「更相枕以臥」寫醉後同伴輪流相互枕靠着身體睡下，並未處理枕具或山石。',
         g4='四項都說睡覺支撐方式，須解「相」和「枕」的組合。',
         rows=[
             row('a','彼此讓出自己的枕頭','句中沒有實物枕頭交接；相枕說人的身體互相倚靠。','枕可被當實物','把互靠讀成交換枕頭'),
             row('b','互相枕靠着身體','PDF語譯與詞注均說同伴互相枕靠着躺下。','相枕與語譯一致','正解；相字指互相'),
             row('c','一起共用同一個枕頭','相說人與人互相枕靠，不能憑枕字添入同一件枕具。','相枕可被誤作共用枕具','把人際動作物化為枕具'),
             row('d','各自倚着山石睡覺','相表同伴之間互相動作，沒有提山石作枕。','山中石可被誤作依靠物','忽略相字並添石頭')]),
    dict(id='full-b-08-01-03-15', objective='「意有所極」的「極」是心意到達某處。',
         main='「意有所極，夢亦同趣」兩者方向相同：心意到哪裏，夢也往哪裏；極指到達。',
         g4='四項取極的不同義類，須與「夢亦同趣」的去向配對。',
         rows=[
             row('a','到達所想之處','語譯作心意想到哪裏、夢也往那裏；極為到達。','PDF譯想到哪裏','正解；有所至'),
             row('b','停在思緒的極限','句子說心意所到及夢的去向，未說思想不能延伸。','極點字形可誘作極限','把去向當思考限度'),
             row('c','極力追求遊樂','極力是程度副詞；「有所極」說到達方向。','極可作程度副詞','把到達當努力程度'),
             row('d','耗盡全部心力','竭盡會使心力用完；原句只說心意所至與夢所往。','極可聯想到盡','把所至當耗盡心力')]),
    dict(id='full-b-08-01-03-17', objective='「覺而起」是睡醒後起身。',
         main='「臥而夢」後接「覺而起」，標示做夢到睡醒再起身的順序；覺是睡醒。',
         g4='四項都與夢或遊山有表面聯繫，只有醒來可接「臥而夢→覺而起」。',
         rows=[
             row('a','察覺自己正在做夢','覺而起接臥而夢，說睡醒才起，不是夢中自覺。','夢境可引自覺','把醒來當夢中察覺'),
             row('b','從睡夢中醒來','前句臥而夢，後句覺而起順接睡醒、起身、回去。','睡夢起身有順序','正解；從夢中醒'),
             row('c','認出夢中所見的人','未交代夢中人物；覺是醒來，非認人。','夢可誘作認人','增添夢中人物'),
             row('d','感到行走疲倦','睡後起身與回去有先後，沒有把覺寫作疲倦感覺。','遊山可聯想疲倦','把睡醒當感覺疲倦')]),
    dict(id='full-b-08-01-03-18', objective='「未始知西山」的「未始」是未曾。',
         group='b08-vocab-weishi-guaite',
         main='作者自以為州內奇山已遊盡，卻「未始知」西山特別；未始否定先前經驗，指未曾。',
         g4='四項都談先前與現在，須看「未始知」受否定的是知而非遊。',
         rows=[
             row('a','還未開始遊西山','句子說過去未曾知道其怪特，不是說遊山行程尚未開始。','未始字面可拆未開始','把知的否定改成遊的時間'),
             row('b','從未曾知道','PDF釋未始為未曾；作者從前卻未識西山怪特。','來源明釋未曾','正解；此前不曾知道'),
             row('c','剛剛開始知道','而未始知是到此之前不曾知道，非說已剛開始。','始可指開始','把否定改成已開始'),
             row('d','不願去了解','未始否定既往認知，未說不願了解。','未可被誤作不願','把既往認知改成意願')]),
    dict(id='full-b-08-01-03-19', objective='「怪特」形容西山奇異卓絕。',
         group='b08-vocab-weishi-guaite',
         main='前文說州內異態山都遊過，卻未識西山「怪特」；這裏稱整座西山奇異卓絕，不是只說局部怪石、與舊遊相同，或僅在高度一項特出。',
         g4='四項都承認西山有異處，須辨怪特指整座西山的卓絕，不能只看選項語氣。',
         rows=[
             row('a','山石奇異但只是局部','「西山之怪特」說整座西山的特殊，不能縮為幾塊怪石。','前句有幽泉怪石','把西山整體縮為局部'),
             row('b','整座西山奇異卓絕','PDF釋怪特為奇異卓絕；前文舊遊諸山也有異態，西山仍別具特點。','來源詞注明列','正解；西山整體特出'),
             row('c','山形奇異而與舊遊相同','前文雖遊過異態諸山，「未始知西山之怪特」正突出不同。','前文諸山也有異態','把西山特出抹平成同類'),
             row('d','山勢高峻但別處平常','此句說西山「怪特」，未把卓絕限定為只在高度一項。','後文寫西山高峻','把整體特出限於高度')]),
    dict(id='full-b-08-01-03-2', objective='「恒惴慄」的「恒」是經常。',
         main='作者說被貶居永州後「恒惴慄」，是經常恐懼不安；後文偶有空閒漫遊，不能把恒解成偶爾。',
         g4='四項均為時間頻率或變化，須把「恒」和後文「其隙也」分清。',
         rows=[
             row('a','偶爾發生','恒表經常，不是只在少數時候惴慄；空閒漫遊才是另一時段。','其隙也寫偶有空閒','把持續憂懼當偶發'),
             row('b','暫時如此','原句以「居是州，恒惴慄」概括貶居常態，未限定短暫一刻。','暫居可聯想暫時','把常態縮成一時'),
             row('c','日漸加深','恒只說出現頻率，沒有說恐懼隨時間加重。','惴慄情緒可想像加深','把頻率改成程度變化'),
             row('d','經常如此','PDF字詞表明釋恒為經常，與貶居後常憂懼的語譯一致。','來源明釋經常','正解；貶居的常態')]),
    dict(id='full-b-08-01-03-4', objective='「其隙也」的「隙」指公務的空閒時間。',
         main='作者貶居時經常惴慄，「其隙也」才外出漫遊；隙是公務的空閒，非人際嫌隙或山石縫隙。',
         g4='四項都是隙的可能所指，須以「則施施而行」判時間空檔。',
         rows=[
             row('a','與別人的嫌隙','後文說一有隙便出去遊山，並未敘述與誰不和。','隙可指嫌隙','把時間空檔讀成人際不和'),
             row('b','山石間的裂縫','「其隙也，則……而行」先給出何時遊覽，不是要走進石縫。','遊山有山石','把遊覽時段讀成地形'),
             row('c','同行人群的空位','這裏沒有擁擠人群；空閒與出遊的時間關係才相合。','徒為同伴可聯想人群','把空閒時間讀成空間'),
             row('d','公務以外的空閒','PDF詞注「隙＝公務的空閒」，有空便緩行漫遊。','其隙則行有條件關係','正解；有空時出遊')]),
    dict(id='full-b-08-01-03-5', objective='「施施而行」的「施施」指緩慢行走的樣子。',
         group='b08-vocab-shishi-manman',
         main='「施施而行，漫漫而遊」說外在遊態：步子緩慢、行動隨意；不能因此斷定作者內心全無憂懼。',
         g4='四項都描述行走狀態或相伴感受；須看與「漫漫而遊」的並列，並保留內心未必快樂的界線。',
         rows=[
             row('a','急促趕路的樣子','PDF釋施施為緩慢行走；此處是有空漫遊，非趕路。','被貶惴慄可誘作慌張','把外在慢行讀成急行'),
             row('b','緩慢行走的樣子','來源詞注與語譯都把施施解作緩慢行走。','施施與漫漫並列遊態','正解；緩步而行'),
             row('c','心中完全快樂的樣子','「施施」只說步態；來源旁批提醒不能據此判內心已全然快樂。','慢行可令人想到悠然','把外在遊態推成內心全樂'),
             row('d','施捨財物的樣子','句中接「而行」，說行走方式，沒有布施財物或受者。','施字有施與義','按字形誤讀為施捨')]),
    dict(id='full-b-08-01-03-6', objective='「漫漫而遊」的「漫漫」是隨意、不受拘束。',
         group='b08-vocab-shishi-manman',
         main='「施施而行，漫漫而遊」說緩行與隨意遊覽的外在狀態；漫漫不是路途極長或水勢漫流。',
         g4='四項同解漫漫的不同義向，須和「而遊」配對；也不由隨意遊覽推斷內心全然快樂。',
         rows=[
             row('a','路途遙遠無盡','「漫漫而遊」描寫遊覽方式，未量行程長度。','漫漫常形容路長','把遊態改為距離'),
             row('b','隨意不受拘束','PDF字詞表釋漫漫為隨意、不受拘束，與緩行相並。','來源明釋隨意','正解；外在遊態'),
             row('c','水流漫過道路','句中「而遊」的施動者是作者，不是溪水漫流。','遊山有迴溪','把人遊誤作水漫'),
             row('d','心神散漫而無目標','漫漫指行動隨意，不等於斷言心神渙散；作者仍遍遊山水。','隨意可誤作散漫','把不拘束加成精神渙散')]),
    dict(id='full-b-08-01-03-7', objective='「日與其徒」的「徒」指同伴。',
         main='作者每日與同伴上山入林；徒在此指同行者，不是徒步的方式、學生身分或徒然無功。',
         g4='四項都與徒的字形或同行情境有關；須判「其徒」是名詞指人。',
         rows=[
             row('a','同行的夥伴','「與其徒」中與後接人；PDF釋徒為同伴。','與其徒需人作賓語','正解；同行者'),
             row('b','受教的學生','徒可指門徒，但文中未有教學師生關係，只寫一同遊山。','徒可指門徒','增添師生關係'),
             row('c','徒步的方式','徒步是步行方式；「與其徒」把徒作同行的人。','上山可徒步','把人稱名詞改成行路方式'),
             row('d','白白地遊覽','徒然指無結果，但「其徒」有其作限定，須指同伴。','徒也可表徒然','把人改為副詞')]),
    dict(id='full-b-08-01-03-9', objective='「迴溪」是曲折縈迴的溪流。',
         main='作者與同伴進深林，沿曲折溪流走到盡頭；迴形容溪流蜿蜒，不是逆流回源或河道乾涸。',
         g4='四項都描述溪流走向或狀態，須分「窮」的走到盡頭與「迴溪」的曲折形狀。',
         rows=[
             row('a','逆流回到源頭的溪流','迴寫溪流曲折形狀，沒有說水倒流或回到源頭。','迴可聯想回返','把彎曲誤作逆流'),
             row('b','寬闊筆直的溪流','PDF釋迴溪為曲折縈迴，與筆直相反。','山中溪流也可寬闊','忽略迴的彎曲'),
             row('c','曲折縈迴的溪流','來源字詞表明釋迴溪為曲折縈迴的溪流。','迴與溪構成景物','正解；溪流蜿蜒'),
             row('d','水流已盡的乾溪床','「窮迴溪」的窮說人走到溪流盡頭，不說溪水乾涸。','窮可聯想耗盡','把行程盡頭改成水乾')]),
    dict(id='full-b-08-02-03-0', objective='「因坐法華西亭」的「因」表示因為、由於。',
         main='作者因坐在法華西亭而望見西山；因在此引出發現西山的緣由，不是沿着、依靠或隨即。',
         g4='四項都是因可聯想的連接或介引用法；須看坐亭與望山的因果關係。',
         rows=[
             row('a','沿着','坐在亭中不表沿路移動；因在此引出緣由。','因可有循沿義','把坐亭讀成沿路'),
             row('b','依靠','亭是觀看西山時所在之處，不是借亭力量完成動作。','因可有憑藉義','把緣由當工具'),
             row('c','隨即','後文遂才表接續行動；因坐先說發現西山的原因。','前後動作可誤作相繼','把因果當時間承接'),
             row('d','由於','PDF釋因為、由於；因坐亭而望見西山，句意相連。','來源語譯因為坐亭','正解；引出緣由')]),
    dict(id='full-b-08-02-03-1', objective='「始指異之」的「始」表到這時才。',
         main='前段作者未曾認出西山怪特，到坐亭望見時才指着它覺得奇異；始表此時才，不是早已或曾經。',
         stem='承接前文作者未曾認識西山，這裏「始」表示哪種時間關係？',
         g4='題幹給出未曾識的前提；四項同問先後時點，須辨「未始知→始指異之」的轉變。',
         rows=[
             row('a','最初便已','作者先前未識西山怪特，不是從一開始便認為它奇異。','始可聯想起初','把此時才改成最初已然'),
             row('b','很早以前','句中有今年九月二十八日的發現時點；早前仍未識。','上段已有舊遊','把新發現前移'),
             row('c','曾經如此','「始指異之」寫此刻新判斷，不是在回憶以往曾經的判斷。','始與未始字形相連','把才發現改成曾經'),
             row('d','到這時才','PDF釋始為才；坐亭望西山後才指着它認為奇異。','望後方知之','正解；到此方發現')]),
    dict(id='full-b-08-02-03-10', objective='「茅茷」是茂密的茅草。',
         main='登山時「焚茅茷」是燒去茂密的茅草以開路；茅茷不是茅屋、草筏或焚後的灰。',
         g4='四項同由茅、茷、焚的局部信息構成，須判被燒去的是叢密植物。',
         rows=[
             row('a','茂密的茅草','PDF詞注釋茅茷為茂密的茅草，與斫榛莽並列清障。','斫榛莽焚茅茷並列','正解；燒草開路'),
             row('b','茅草搭成的屋舍','此段為登山斫草開路，沒有焚燒屋舍；茅茷指植物。','茅可搭屋','把植物讀成房屋'),
             row('c','可渡溪流的草筏','前文過江緣溪，這句已登山焚草；茷不是行水的筏。','茷與筏字形近','把山上茅草讀成舟筏'),
             row('d','燒草後剩下的灰','「焚茅茷」中茅茷是被燒之物，不是焚後產物。','焚字可聯想灰','把受事當結果')]),
    dict(id='full-b-08-02-03-11', objective='「窮山之高」是走到山的最高處。',
         main='僕人斫榛莽、焚茅茷後一直登到山的最高處才停；窮在此表走到盡頭，不是力盡或搜財。',
         g4='四項都說登山何處或為何而止，須連讀「山之高而止」辨目標和停止點。',
         rows=[
             row('a','走到山腳便停止','「山之高」指定向高處去，到山腳即停與原句相反。','登山有山腳起點','把終點換成起點'),
             row('b','到達山的最高處','PDF釋窮山之高為到達最高處，與「而止」的終點相合。','高而止指出終點','正解；到達高處'),
             row('c','把山中財物搜盡','窮可與貧乏相關，但本句以山之高作所窮，並未尋財物。','窮常聯想財物','把地勢盡頭讀成財物耗盡'),
             row('d','體力耗盡才停止','句子說到達山的最高處才止，沒有交代因疲倦而停。','窮可聯想力盡','把抵達目標讀成疲憊')]),
]

def digest(q):
    raw = json.dumps(q, ensure_ascii=False, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(raw.encode('utf-8')).hexdigest()

def build():
    queue = json.loads((ROOT / 'prior-review-work-queue.json').read_text(encoding='utf-8'))
    used = set(json.loads((ROOT / 'release-manifest.json').read_text(encoding='utf-8')).get('reviewedIds', []))
    for path in HERE.glob('*.json'):
        if path.name == 'record-b08-vocab.json':
            continue
        used.update(row['id'] for row in json.loads(path.read_text(encoding='utf-8')).get('records', []))
    candidates = []
    for group in queue['groups']:
        if (group.get('essay'), group.get('ability'), group.get('template')) == ('essay-08', 'vocabulary', 'echo-template-phrase'):
            candidates.extend(qid for qid in group['ids'] if qid not in used)
    if candidates[:20] != EXPECTED_IDS:
        raise ValueError('Queue or other drafts changed; reselect before writing')
    if [item['id'] for item in items] != EXPECTED_IDS:
        raise ValueError('Draft item selection differs')
    baseline = json.loads((ROOT / 'baseline-bank.json').read_text(encoding='utf-8'))
    current = json.loads((ROOT.parent.parent.parent / 'web-study/content/bank.json').read_text(encoding='utf-8'))
    old = {q['id']: q for q in baseline['questions']}
    now = {q['id']: q for q in current['questions']}
    records = []
    for item in items:
        qid = item['id']
        question = old[qid]
        if question != now[qid]:
            raise ValueError('Pending question drift: ' + qid)
        choices = [{'id': cid, 'text': text, 'explanation': explanation} for cid, text, explanation, _, _ in item['rows']]
        if {c['id'] for c in choices} != {c['id'] for c in question['choices']}:
            raise ValueError('Choice ID drift: ' + qid)
        patch = {
            'choices': choices,
            'explanation': item['main'],
            'summary': item['objective'],
            'misconception': '；'.join(misreading for cid, _, _, _, misreading in item['rows'] if cid != question['answerId']),
            'revisionReason': '保留原詞義目標，改同句近似錯項並補各項排除依據：' + item['objective'],
        }
        if item.get('stem'):
            patch['stem'] = item['stem']
        if item.get('group'):
            patch['practiceGroup'] = item['group']
        source = question['source']
        quote = question['quote']
        evidence = [{'blockPath': source['blockPath'], 'pdfPage': source['pdfPage'], 'quote': quote, 'claim': item['objective']}]
        audits = [
            {'id': cid, 'attraction': attraction, 'misreading': misreading, 'refutation': explanation,
             'followUp': f'重看 PDF 第{source["pdfPage"]}頁「{quote[:28]}」，分清本詞與鄰近詞／動作。', 'evidenceType': 'hypothesis'}
            for cid, _, explanation, attraction, misreading in item['rows']
        ]
        wrong = [audit for audit in audits if audit['id'] != question['answerId']]
        key = next(choice for choice in choices if choice['id'] == question['answerId'])
        gates = {
            'G1': f'核 PDF 物理頁{source["pdfPage"]}與{source["blockPath"]}：{item["objective"]} 原文與自擬錯項分層。',
            'G2': f'作者遮標答後據原句判 {key["id"]}「{key["text"]}」；另三項：' + '；'.join(a['id'] + a['refutation'] for a in wrong) + '；待另一審稿者核。',
            'G3': '三錯項的假設吸引點／誤讀分別是：' + '；'.join(a['id'] + a['attraction'] + '→' + a['misreading'] for a in wrong) + '；尚無學生實測。',
            'G4': item['g4'] + (f' 同組互提示：{item["group"]} 的兩題新抽取只選其一；作答歷史不改。' if item.get('group') else ''),
            'G5': (f'保留 {qid}、memoryId、答案 {key["id"]}、四選項 ID 與來源；'
                   + ('題幹依前文消歧；' if item.get('stem') else '原題幹不變；')
                   + '原引文及 target 定位未改，新選項與逐項解析對齊。'
                   + (f' 新抽取分組為 {item["group"]}。' if item.get('group') else '')),
        }
        records.append({
            'id': qid, 'baseQuestionHash': digest(question), 'decision': 'revise', 'patch': patch,
            'reason': patch['revisionReason'], 'objective': item['objective'], 'evidence': evidence,
            'optionAudit': audits, 'gates': gates, 'empiricalValidation': 'not-run', 'teacherReview': 'not-run',
        })
    target = HERE / 'record-b08-vocab.json'
    target.write_text(json.dumps({'author': 'record_b08_vocab_author', 'records': records}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(target, len(records), hashlib.sha256(target.read_bytes()).hexdigest())

if __name__ == '__main__':
    build()
