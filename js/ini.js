MaxLv =  55; // 最大Lv
MaxSt =  99; // 最大ステータス
MaxSk = 120; // 最大潜在技能

// ------------------------------ 種族
Name['Race'] = new Array();
Name['Race'][0] = new Array('人間'      ,'Human' ,'人類'  );
Name['Race'][1] = new Array('エルフ'    ,'Elf'   ,'精靈'  );
Name['Race'][2] = new Array('ドワーフ'  ,'Dwarf' ,'矮人'  );
Name['Race'][3] = new Array('マイリーン','Myrine','暗精靈');
Name['Race'][4] = new Array('エンキドゥ','Enkidu','巨人'  );
Name['Race'][5] = new Array('ラピン'    ,'Lapin' ,'拉比'  );

// ------------------------------ 種族技能
Name['Race']['Skill'] = new Array();
for (i=0;i<=5;i++)
  Name['Race']['Skill'][i] = new Array();
Name['Race']['Skill'][0][0] = new Array('闘争心'            ,'Fighting Spirit'    ,'鬥爭之心');
Name['Race']['Skill'][0][1] = new Array('適応能力'          ,'Adaptability'       ,'適應能力');
Name['Race']['Skill'][0][2] = new Array('薬学'              ,'Alchemy'            ,'藥理學'  );
Name['Race']['Skill'][1][0] = new Array('自然との調和'      ,'Harmony with Nature','自然協調');
Name['Race']['Skill'][1][1] = new Array('遠望'              ,'Eagle Eye'          ,'遠望'    );
Name['Race']['Skill'][1][2] = new Array('乱れぬ精神'        ,'Steadfastness'      ,'堅定意志');
Name['Race']['Skill'][2][0] = new Array('強靭な心'          ,'Stronghearted'      ,'堅韌之心');
Name['Race']['Skill'][2][1] = new Array('ドワーフ魂'        ,'Dwarf Spirit'       ,'矮人之魂');
Name['Race']['Skill'][2][2] = new Array('家族愛'            ,'Filial Piety'       ,'家族之愛');
Name['Race']['Skill'][3][0] = new Array('鋭敏な感覚'        ,'Acute Senses'       ,'敏銳感覺');
Name['Race']['Skill'][3][1] = new Array('怒りの回帰'        ,'Calmness'           ,'情緒掌控');
Name['Race']['Skill'][3][2] = new Array('直感回避'          ,'Sharpness'          ,'第六感'  );
Name['Race']['Skill'][4][0] = new Array('頑丈な皮膚'        ,'Stone Skin'         ,'石化皮膚');
Name['Race']['Skill'][4][1] = new Array('豪腕'              ,'Strong Arm'         ,'怪力'    );
Name['Race']['Skill'][4][2] = new Array('ラピンサポート'    ,'Lapin Support'      ,'拉比援護');
Name['Race']['Skill'][5][0] = new Array('魔抵抗体'          ,'Magic Resistance'   ,'魔抵阻抗');
Name['Race']['Skill'][5][1] = new Array('湧出する魔素'      ,'Inner Light'        ,'魔力湧泉');
Name['Race']['Skill'][5][2] = new Array('エンキドゥサポート','Enkidu Support'     ,'巨人援護');

// ------------------------------ 職業名
Name['Job'] = new Array();
Name['Job']['Sel'] = new Array();
Name['Job'][ 0] = new Array(0,'Wa' ,'ウォーリア'      ,'Warrior'    ,'戰士'    );Name['Job']['Sel'][ 0] = new Array(''    ,''                        ,''    );
Name['Job'][ 1] = new Array(0,'W2g','グラディエイター','Gradiator'  ,'角鬥士'  );Name['Job']['Sel'][ 1] = new Array('┣'  ,'&nbsp;&nbsp;'            ,'┣'  );
Name['Job'][ 2] = new Array(0,'W3j','ジャガーノート'  ,'Juggernaut' ,'狂戰士'  );Name['Job']['Sel'][ 2] = new Array('┃┣','&nbsp;&nbsp;&nbsp;&nbsp;','┃┣');
Name['Job'][ 3] = new Array(0,'W3d','ドラグーン'      ,'Dragoon'    ,'龍騎士'  );Name['Job']['Sel'][ 3] = new Array('┃┗','&nbsp;&nbsp;&nbsp;&nbsp;','┃┗');
Name['Job'][ 4] = new Array(0,'W2k','ナイト'          ,'Knight'     ,'騎士'    );Name['Job']['Sel'][ 4] = new Array('┗'  ,'&nbsp;&nbsp;'            ,'┗'  );
Name['Job'][ 5] = new Array(0,'W3g','ジェネラル'      ,'General'    ,'重裝騎士');Name['Job']['Sel'][ 5] = new Array('　┣','&nbsp;&nbsp;&nbsp;&nbsp;','　┣');
Name['Job'][ 6] = new Array(0,'W3p','パラディン'      ,'Paladin'    ,'聖騎士'  );Name['Job']['Sel'][ 6] = new Array('　┗','&nbsp;&nbsp;&nbsp;&nbsp;','　┗');
Name['Job'][ 7] = new Array(1,'Sc' ,'スカウト'        ,'Scout'      ,'斥候'    );Name['Job']['Sel'][ 7] = new Array(''    ,''                        ,''    );
Name['Job'][ 8] = new Array(1,'S2a','アーチャー'      ,'Archer'     ,'弓箭手'  );Name['Job']['Sel'][ 8] = new Array('┣'  ,'&nbsp;&nbsp;'            ,'┣'  );
Name['Job'][ 9] = new Array(1,'S3s','スナイパー'      ,'Sniper'     ,'狙擊手'  );Name['Job']['Sel'][ 9] = new Array('┃┣','&nbsp;&nbsp;&nbsp;&nbsp;','┃┣');
Name['Job'][10] = new Array(1,'S3p','プレデター'      ,'Hunter'     ,'狩獵手'  );Name['Job']['Sel'][10] = new Array('┃┗','&nbsp;&nbsp;&nbsp;&nbsp;','┃┗');
Name['Job'][11] = new Array(1,'S2g','エージェント'    ,'Provocateur','密探'    );Name['Job']['Sel'][11] = new Array('┗'  ,'&nbsp;&nbsp;'            ,'┗'  );
Name['Job'][12] = new Array(1,'S3a','アサシン'        ,'Assassin'   ,'刺客'    );Name['Job']['Sel'][12] = new Array('　┣','&nbsp;&nbsp;&nbsp;&nbsp;','　┣');
Name['Job'][13] = new Array(1,'S3d','ディスターバンス','Saboteur'   ,'機關師'  );Name['Job']['Sel'][13] = new Array('　┗','&nbsp;&nbsp;&nbsp;&nbsp;','　┗');
Name['Job'][14] = new Array(2,'Ac' ,'アコライト'      ,'Acolyte'    ,'聖職者'  );Name['Job']['Sel'][14] = new Array(''    ,''                        ,''    );
Name['Job'][15] = new Array(2,'A2p','プリースト'      ,'Priest'     ,'牧師'    );Name['Job']['Sel'][15] = new Array('┣'  ,'&nbsp;&nbsp;'            ,'┣'  );
Name['Job'][16] = new Array(2,'A3c','クレリック'      ,'Cleric'     ,'主教'    );Name['Job']['Sel'][16] = new Array('┃┣','&nbsp;&nbsp;&nbsp;&nbsp;','┃┣');
Name['Job'][17] = new Array(2,'A3e','エンチャンター'  ,'Enchanter'  ,'吟遊詩人');Name['Job']['Sel'][17] = new Array('┃┗','&nbsp;&nbsp;&nbsp;&nbsp;','┃┗');
Name['Job'][18] = new Array(2,'A2a','アセティック'    ,'Ascetic'    ,'苦修士'  );Name['Job']['Sel'][18] = new Array('┗'  ,'&nbsp;&nbsp;'            ,'┗'  );
Name['Job'][19] = new Array(2,'A3m','モンク'          ,'Monk'       ,'武僧'    );Name['Job']['Sel'][19] = new Array('　┣','&nbsp;&nbsp;&nbsp;&nbsp;','　┣');
Name['Job'][20] = new Array(2,'A3x','エクソシスト'    ,'Exorcist'   ,'驅魔人'  );Name['Job']['Sel'][20] = new Array('　┗','&nbsp;&nbsp;&nbsp;&nbsp;','　┗');
Name['Job'][21] = new Array(3,'Ma' ,'メイジ'          ,'Mage'       ,'法師'    );Name['Job']['Sel'][21] = new Array(''    ,''                        ,''    );
Name['Job'][22] = new Array(3,'M2w','ウィザード'      ,'Wizard'     ,'術士'    );Name['Job']['Sel'][22] = new Array('┣'  ,'&nbsp;&nbsp;'            ,'┣'  );
Name['Job'][23] = new Array(3,'M3w','ウォーロック'    ,'Warlock'    ,'元素師'  );Name['Job']['Sel'][23] = new Array('┃┣','&nbsp;&nbsp;&nbsp;&nbsp;','┃┣');
Name['Job'][24] = new Array(3,'M3c','コンジュラー'    ,'Conjurer'   ,'德魯伊'  );Name['Job']['Sel'][24] = new Array('┃┗','&nbsp;&nbsp;&nbsp;&nbsp;','┃┗');
Name['Job'][25] = new Array(3,'M2d','ダークロア'      ,'Sorcerer'   ,'巫師'    );Name['Job']['Sel'][25] = new Array('┗'  ,'&nbsp;&nbsp;'            ,'┗'  );
Name['Job'][26] = new Array(3,'M3j','ジェスター'      ,'Corrupter'  ,'幻術師'  );Name['Job']['Sel'][26] = new Array('　┣','&nbsp;&nbsp;&nbsp;&nbsp;','　┣');
Name['Job'][27] = new Array(3,'M3l','カラミティ'      ,'Shadowblade','咒術師'  );Name['Job']['Sel'][27] = new Array('　┗','&nbsp;&nbsp;&nbsp;&nbsp;','　┗');

// ------------------------------ 初期ステータス
Status = new Array();
Status['Set'] = new Array();
Status['Set']['Base'] = new Array();
Status['Set']['Base'][0] = new Array('人間'        , 5, 5, 5, 5, 5, 5);
Status['Set']['Base'][1] = new Array('エルフ'      , 3, 3, 6, 4, 7, 7);
Status['Set']['Base'][2] = new Array('ドワーフ'    , 6, 7, 5, 6, 3, 3);
Status['Set']['Base'][3] = new Array('マイリーン'  , 5, 5, 9, 6, 3, 2);
Status['Set']['Base'][4] = new Array('エンキドゥ'  , 8, 6, 4, 4, 6, 2);
Status['Set']['Base'][5] = new Array('ラピン'      , 3, 1, 6, 5, 9, 6);
Status['Set']['Job'] = new Array();
Status['Set']['Job'][0]  = new Array('ウォーリア系', 2, 3,-1, 1,-1, 0);
Status['Set']['Job'][1]  = new Array('スカウト系'  , 0, 2, 1, 2,-1, 0);
Status['Set']['Job'][2]  = new Array('アコライト系', 0, 2,-1, 0, 1, 2);
Status['Set']['Job'][3]  = new Array('メイジ系'    ,-1, 1,-1, 1, 1, 3);

// ------------------------------ 係数
Status['Mod'] = new Array();
Status['Mod'][ 0] = new Array(98,16,5.847,44.55,15.5,48.3);
Status['Mod'][ 1] = new Array(148,28,3.188,36.7,8.465,39.5);
Status['Mod'][ 2] = new Array(298,98,1.9601,32.2,2.2836,34.8);
Status['Mod'][ 3] = new Array(149,98,2.0033,30.9,3.572,33.3);
Status['Mod'][ 4] = new Array(149,118,2.975,29.15,7.881,31.4);
Status['Mod'][ 5] = new Array(498,179,1.1493,25.8,2.0618,20.589);
Status['Mod'][ 6] = new Array(398,178,1.4285,24.7,2.2322,19.94);
Status['Mod'][ 7] = new Array(84,44,7.23,37.2,19.2,40);
Status['Mod'][ 8] = new Array(109,48,4.4,31.2,11.67,33.3);
Status['Mod'][ 9] = new Array(198,69,3.333,21.95,3.803,20.146);
Status['Mod'][10] = new Array(151,56,3.111,22.6,4.464,19.7);
Status['Mod'][11] = new Array(109,48,4.007,33.1,10.63,35.97);
Status['Mod'][12] = new Array(149,53,2.123,24.44,3.922,20.58);
Status['Mod'][13] = new Array(205,59,2.53,22.6,3.773,17.92);
Status['Mod'][14] = new Array(73,58,8.16,18.06,21.51,19.48);
Status['Mod'][15] = new Array(88,198,4.475,14,11.874,15.08);
Status['Mod'][16] = new Array(199,235,2.75,8.875,3.745,9.897);
Status['Mod'][17] = new Array(197,253,3.33,8.24,3.745,8.861);
Status['Mod'][18] = new Array(89,163,3.883,16.72,10.298,18);
Status['Mod'][19] = new Array(299,189,1.961,12.9,2.681,14);
Status['Mod'][20] = new Array(203,197,2.578,8.5,3.83,9.16);
Status['Mod'][21] = new Array(59,89,8.44,17.6,22.48,18.9);
Status['Mod'][22] = new Array(73,253,5.753,10.57,15.28,11.41);
Status['Mod'][23] = new Array(148,254,4.006,5.915,5.405,6.366);
Status['Mod'][24] = new Array(142,254,3.756,7.45,4.95,8.016);
Status['Mod'][25] = new Array(73,119,4.86,12.63,12.88,13.63);
Status['Mod'][26] = new Array(166,203,3.53,9.4,4.84,12.3);
Status['Mod'][27] = new Array(151,195,3.339,11.23,5.26,10.14);

// ------------------------------ 技能値       1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20
Skill['D'] = new Array(); // 最小             斬,突,払,打,防,射,調,暗,仕,回,慈,祝,祓,聖,元,具,暗,惑,種,騎
Skill['D'][ 0] = new Array('ウォーリア系'    , 5, 2, 5, 2, 4, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
Skill['D'][ 1] = new Array('スカウト系'      , 4, 0, 0, 0, 0, 5, 4, 3, 0, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
Skill['D'][ 2] = new Array('アコライト系'    , 0, 0, 0, 2, 2, 0, 0, 0, 0, 0, 5, 5, 5, 0, 0, 0, 0, 0, 0, 0);
Skill['D'][ 3] = new Array('メイジ系'        , 2, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 5, 5, 0, 5, 0, 0);
Skill['P'] = new Array(); // 潜在             斬,突,払,打,防,射,調,暗,仕,回,慈,祝,祓,聖,元,具,暗,惑,種,騎
Skill['P'][ 0] = new Array('ウォーリア'      ,25,25,25,20,25, 5, 0, 0, 0, 5, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
Skill['P'][ 1] = new Array('グラディエイター',55,45,55,45,25,15, 0, 0, 0,10, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
Skill['P'][ 2] = new Array('ジャガーノート'  ,90,90,90,45,35,20, 0, 0, 0,20, 0, 0, 0, 0, 0, 0, 0, 0, 0,10);
Skill['P'][ 3] = new Array('ドラグーン'      ,60,90,60,30,50,20, 0, 0, 0,20, 0, 0, 0, 0, 0, 0, 0, 0, 0,70);
Skill['P'][ 4] = new Array('ナイト'          ,35,55,25,35,55, 5, 0, 0, 0,10,15, 0, 0, 0, 0, 0, 0, 0, 0,15);
Skill['P'][ 5] = new Array('ジェネラル'      ,50,80,60,60,90,20, 0, 0, 0,10,15, 0, 0, 0, 0, 0, 0, 0, 0,15);
Skill['P'][ 6] = new Array('パラディン'      ,80,55,25,45,60, 5, 0, 0, 0,10,55, 0,25, 0, 0, 0, 0, 0, 0,40);
Skill['P'][ 7] = new Array('スカウト'        ,10, 0, 0, 0,10,25,20,25,20,20, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
Skill['P'][ 8] = new Array('アーチャー'      ,30, 0, 0, 0,10,55,50,30,25,50, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
Skill['P'][ 9] = new Array('スナイパー'      ,30, 0, 0, 0,10,90,50,30,40,90, 0, 0, 0, 0, 0, 0,30, 0, 0,20);
Skill['P'][10] = new Array('プレデター'      ,30, 0, 0, 0,10,70,90,30,70,50, 0, 0, 0, 0, 0, 0, 0, 0, 0,50);
Skill['P'][11] = new Array('エージェント'    ,30, 0, 0, 0,20,30,25,55,50,40, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);
Skill['P'][12] = new Array('アサシン'        ,65, 0, 0, 0,20,30,50,90,50,65, 0, 0, 0, 0, 0, 0,20, 0, 0, 0);
Skill['P'][13] = new Array('ディスターバンス',45, 0, 0, 0,25,45,60,55,90,55, 0, 0, 0, 0, 0, 0, 0,15, 0,10);
Skill['P'][14] = new Array('アコライト'      , 0, 0, 0,20,20, 0, 0, 0, 0, 5,25,25,25, 0, 0, 0, 0, 0, 0, 0);
Skill['P'][15] = new Array('プリースト'      , 0, 0, 0,35,30, 0, 0, 0, 0, 5,55,55,30, 0, 0, 0, 0, 0, 0, 0);
Skill['P'][16] = new Array('クレリック'      , 0, 0,15,50,40, 0, 0, 0, 0, 5,90,55,40,45, 0,10, 0, 0, 0,15);
Skill['P'][17] = new Array('エンチャンター'  , 0, 0, 0,45,35, 0, 0, 0, 0, 5,55,90,30,65, 0,30, 0, 0, 0,20);
Skill['P'][18] = new Array('アセティック'    , 0, 0,15,50,20, 0, 0, 0, 0, 5,25,25,55, 0, 0, 0, 0, 0, 0, 0);
Skill['P'][19] = new Array('モンク'          , 0, 0,15,90,25, 0, 0, 0, 0,55,30,25,60, 0, 0, 0, 0, 0, 0,10);
Skill['P'][20] = new Array('エクソシスト'    , 0, 0,15,70,30, 0, 0, 0, 0,10,45,30,90,10, 0,40, 0, 0, 0,10);
Skill['P'][21] = new Array('メイジ'          ,15, 0, 0,15, 0, 0, 0, 0, 0, 5, 0, 0, 0, 0,25,25,20,25, 0, 0);
Skill['P'][22] = new Array('ウィザード'      ,20, 0, 0,30, 0, 0, 0, 0, 0, 5,10,10,20, 0,55,50,20,30, 0, 0);
Skill['P'][23] = new Array('ウォーロック'    ,30, 0, 0,30, 0, 0,40, 0, 0, 5,25,10,40, 0,90,50,30,40, 0,10);
Skill['P'][24] = new Array('コンジュラー'    ,25, 0, 0,30, 0, 0, 0, 0,20, 5,10,20,20, 0,60,90,40,50, 0,10);
Skill['P'][25] = new Array('ダークロア'      ,25, 0, 0,15, 0, 0,15,20, 0,10, 0, 0, 0, 0,30,25,55,55, 0, 0);
Skill['P'][26] = new Array('ジェスター'      ,30, 0, 0,15, 0, 0,45,20, 0,40, 0, 0, 0, 0,30,50,70,90, 0,10);
Skill['P'][27] = new Array('カラミティ'      ,65, 0, 0,15, 0, 0,15,30, 0,25, 0, 0, 0, 0,30,25,90,55, 0,50);

// ------------------------------ 技能名
Name['Skill'] = new Array();
Name['Skill'][ 0] = new Array(''    ,'近接','Melee'        ,'接近');
Name['Skill'][ 1] = new Array('A'   ,'斬る','Slash'        ,'斬殺');
Name['Skill'][ 2] = new Array('S'   ,'突く','Thrust'       ,'突刺');
Name['Skill'][ 3] = new Array('D'   ,'払う','Cleave'       ,'揮砍');
Name['Skill'][ 4] = new Array('F'   ,'打撃','Bash'         ,'打擊');
Name['Skill'][ 5] = new Array('G'   ,'防御','Defend'       ,'防禦');
Name['Skill'][ 6] = new Array(''    ,'技巧','Technique'    ,'刺殺');
Name['Skill'][ 7] = new Array('Z'   ,'射撃','Shot'         ,'射擊');
Name['Skill'][ 8] = new Array('X'   ,'調合','Alchemy'      ,'調合');
Name['Skill'][ 9] = new Array('C'   ,'暗殺','Assassination','暗殺');
Name['Skill'][10] = new Array('V'   ,'仕掛','Trapping'     ,'機關');
Name['Skill'][11] = new Array('B'   ,'回避','Dodge'        ,'迴避');
Name['Skill'][12] = new Array(''    ,'祈祷','Grace'        ,'神聖');
Name['Skill'][13] = new Array('H'   ,'慈愛','Banevolence'  ,'慈愛');
Name['Skill'][14] = new Array('J'   ,'祝福','Blessing'     ,'祝福');
Name['Skill'][15] = new Array('K'   ,'祓魔','Exorcism'     ,'退魔');
Name['Skill'][16] = new Array('L'   ,'聖歌','Hymn'         ,'聖歌');
Name['Skill'][17] = new Array(''    ,'魔術','Magic'        ,'魔法');
Name['Skill'][18] = new Array('N'   ,'元素','Elemental'    ,'元素');
Name['Skill'][19] = new Array('M'   ,'具現','Invocation'   ,'具現');
Name['Skill'][20] = new Array('&lt;','暗黒','Darkness'     ,'暗黑');
Name['Skill'][21] = new Array('&gt;','惑乱','Confusion'    ,'咒術');
Name['Skill'][22] = new Array(''    ,'特殊','Special'      ,'其他');
Name['Skill'][23] = new Array('?'   ,'種族','Racial'       ,'種族');
Name['Skill'][24] = new Array('_'   ,'騎乗','Horsemanship' ,'騎乘');

// ------------------------------ ログ用
Name['Log'] = new Array();
Name['Log'][0] = new Array('ポイント','Point','點');
Name['Log'][1] = new Array('潜'      ,'Po'   ,'潛');
Name['Log'][2] = new Array('限'      ,'Li'   ,'限');
Name['Log'][3] = new Array('残り'    ,'Rest' ,'其餘');

// ------------------------------ 武器の種類
Name['Equip'] = new Array();
Name['Equip'][ 0] = new Array('そうび','Equipment','裝備');
Name['Equip'][ 1] = new Array('右手'  ,'RHand'    ,'右手');
Name['Equip'][ 2] = new Array('左手'  ,'LHand'    ,'左手');
Name['Equip'][ 3] = new Array('頭'    ,'Helmet'   ,'頭盔');
Name['Equip'][ 4] = new Array('上半身','Torso'    ,'胸部');
Name['Equip'][ 5] = new Array('手'    ,'Glove'    ,'手套');
Name['Equip'][ 6] = new Array('下半身','Cuisse'   ,'褲子');
Name['Equip'][ 7] = new Array('靴'    ,'Boots'    ,'靴子');
Name['Equip'][ 8] = new Array('背'    ,'Cape'     ,'披風');
Name['Equip'][ 9] = new Array('耳飾り','Ear'      ,'耳環');
Name['Equip'][10] = new Array('首飾り','Neck'     ,'項鍊');
Name['Equip'][11] = new Array('ベルト','Belt'     ,'腰帶');
Name['Equip'][12] = new Array('指輪'  ,'Ring'     ,'戒指');

// ------------------------------ 一覧用
Name['List'] = new Array();
Name['List'][0] = new Array('名称'        ,'Name'     ,'名'      );
Name['List'][1] = new Array('Lv'          ,'Lv'       ,'Lv'      );
Name['List'][2] = new Array('ATK'         ,'ATK'      ,'ATK'     );
Name['List'][3] = new Array('DEF'         ,'DEF'      ,'DEF'     );
Name['List'][4] = new Array('補正'        ,'Option'   ,'修正'    );
Name['List'][5] = new Array('S'           ,'S'        ,'S'       );
Name['List'][6] = new Array('装備可能職業','Job'      ,'職業'    );
Name['List'][7] = new Array('装着可能部位','Region'   ,'網站'    );
Name['List'][8] = new Array('入手経路'    ,'Get route','獲得路由');

// ------------------------------ ルーン
Name['Rune'] = new Array();
Name['Rune'][0] = new Array(
  '<span title="ポーション回復量+5%" class="help">ウンジョー</span>'
 ,'<span title="Potion recovery increase+5%" class="help">(Jo-eun)</span>'
 ,'<span title="藥劑效果+5%" class="help">(喬銀)</span>'
);
Name['Rune'][1] = new Array(
  '<span title="攻撃速度+5%" class="help">オシラ</span>'
 ,'<span title="Attack speed+5%" class="help">(Oshira)</span>'
 ,'<span title="攻擊速度+5%" class="help">(Oshira)</span>'
);
Name['Rune'][2] = new Array(
  '<span title="MP自然回復量+?" class="help">ベルカナ</span>'
 ,'<span title="MP Recovery rate+?" class="help">(Bell Cana)</span>'
 ,'<span title="MP自然恢復量+?" class="help">(貝爾卡納)</span>'
);

// ------------------------------ クランバフ
Name['Clan'] = new Array();
Name['Clan'][ 0] = new Array(12,'クラン'              ,'Clan'             ,'巴生'    );
Name['Clan'][ 1] = new Array( 5,'フィジカル'          ,'Physical'         ,'體力'    );
Name['Clan'][ 2] = new Array( 5,'スピリット'          ,'Spirit'           ,'精神'    );
Name['Clan'][ 3] = new Array( 2,'フィジカルリカバリー','Physical Recovery','體力恢復');
Name['Clan'][ 4] = new Array( 2,'スピリットリカバリー','Spirit Recovery'  ,'精神恢復');
Name['Clan'][ 5] = new Array( 2,'フィジカルレジスト'  ,'Physical Resist'  ,'物理抗性');
Name['Clan'][ 6] = new Array( 2,'スピリットレジスト'  ,'Spirit Resist'    ,'精神抗性');
Name['Clan'][ 7] = new Array( 5,'エクスペリエンス'    ,'Experience'       ,'經驗'    );
Name['Clan'][ 8] = new Array( 3,'ヒーリング'          ,'Healing'          ,'癒合'    );
Name['Clan'][ 9] = new Array( 3,'コンバット'          ,'Combat'           ,'戰鬥'    );
Name['Clan'][10] = new Array( 3,'アラウズ'            ,'Arouse'           ,'喚醒'    );

// ------------------------------ 名誉バフ
Skill['Honor'] = new Array();
Skill['Honor'][ 0] = new Array(
  '<span title="体力+1、筋力+1、敏捷+1、器用+1、知性+1" class="help">強さへの探究心</span>'
 ,'<span title="STA+1, STR+1, AGI+1, DEX+1, INT+1" class="help">(Curiosity to the strength)</span>'
 ,'<span title="體力+1、力量+1、敏捷+1、技巧+1、靈感+1、智慧+1" class="help">(好奇心的力量)</span>'
);
Skill['Honor'][ 1] = new Array(
  '<span title="LP回復スキルの効果量+10%" class="help">清浄なる慈愛の心</span>'
 ,'<span title="Amount recovered healing skills+10%" class="help">(Heart of love)</span>'
 ,'<span title="HP回復技能的效果+10%" class="help">(慈善的心清清)</span>'
);
Skill['Honor'][ 2] = new Array(
  '<span title="攻撃力+2%、火炎属性魔法ダメージ+5%、火炎耐性+10%、冷気耐性-15%、火傷耐性+5%" class="help">脈動する猛火への道標</span>'
 ,'<span title="ATK+2%, Fire element magic damage+5%, Fire resist+10%, Ice resist-15%, Burn resist+10%" class="help">(Signs of fire)</span>'
 ,'<span title="攻擊力+2%、火屬性攻擊魔法+5%、火抗性+10%、冰抗性-15%、燒傷抗性+10%" class="help">(脈衝火焰指南)</span>'
);
Skill['Honor'][ 3] = new Array(
  '<span title="冷気属性魔法ダメージ+5%、詠唱キャンセル抵抗+2%、冷気耐性+10%、電撃耐性-15%、凍傷耐性+5%" class="help">渦巻く氷塊への道標</span>'
 ,'<span title="Ice element magic damage+5%, Casting resist+2%, Ice resist+10%, Lightning resist-15%, Frozen resist+5%" class="help">(Signs of ice)</span>'
 ,'<span title="冰屬性攻擊魔法+5%、吟詠取消抗性+2%、冰抗性+10%、雷抗性-15%、凍傷抗性+5%" class="help">(紛飛的跡象浮冰)</span>'
);
Skill['Honor'][ 4] = new Array(
  '<span title="命中+5、電撃属性魔法ダメージ+5%、火炎耐性-15%、電撃耐性+10%、転倒耐性+5%" class="help">突破せし稲妻への道標</span>'
 ,'<span title="Accuracy+5, Thunder magic damage+5%, Fire resist-15%, Lightning resist+10%, Knockdown resist+5%" class="help">(Signs of lightning)</span>'
 ,'<span title="命中+5、雷屬性攻擊魔法+5%、火抗性-15%、雷抗性+10%、擊倒抗性+5%" class="help">(閃電突破跡象)</span>'
);
Skill['Honor'][ 5] = new Array(
  '<span title="武器による物理ダメージ+15" class="help">猛り狂う豪腕</span>'
 ,'<span title="Physical damage weapon+15" class="help">(Australian arm rampage)</span>'
 ,'<span title="物理傷害的武器+15" class="help">(澳洲分部狂暴)</span>'
);
Skill['Honor'][ 6] = new Array(
  '<span title="騎乗時のステータス開放率+10%" class="help">融和する騎手</span>'
 ,'<span title="Release rate status on horseback+10%" class="help">(Jockey reconciled)</span>'
 ,'<span title="釋放速率在馬背上的地位+10%" class="help">(賽馬不甘心)</span>'
);
Skill['Honor'][ 7] = new Array(
  '<span title="被クリティカル発生率-10%、被クリティカルダメージ-10%" class="help">守護者の極意</span>'
 ,'<span title="Critical resist-10%, Critical damage resist-10%" class="help">(Secret of the Guardian)</span>'
 ,'<span title="防/暴擊率-10%、防/暴擊威力-10%" class="help">(秘密的守護者)</span>'
);
Skill['Honor'][ 8] = new Array(
  '<span title="光耐性-5%、闇耐性+10%、魅了耐性+5%、精神的状態異常耐性+6%" class="help">忌避すべき闇への道標</span>'
 ,'<span title="Light resist-5%, Darkness resist+10%, Charm resist+5%, Mental state resist+6%" class="help">(Signs of Darkness)</span>'
 ,'<span title="光抗性-5%、黑暗抗性+10%、魅惑抗性+5%、精神錯亂抗性+6%" class="help">(標誌應避免到黑暗)</span>'
);
Skill['Honor'][ 9] = new Array(
  '<span title="光耐性+10%、闇耐性-5%、魔術耐性+3%、身体的状態異常耐性+6%" class="help">崇高たる光明への道標</span>'
 ,'<span title="Light resist+10%, Darkness resist-5%, Magic resist+3%, Physical state resist+6% " class="help">(Signs of Light)</span>'
 ,'<span title="光抗性+10%、黑暗抗性-5%、秘法抗性+3%、異常體抗性+6%" class="help">(崇高塔如晃晃指南)</span>'
);
Skill['Honor'][10] = new Array(
  '<span title="POT回復量+5%、防御力+5、被物理ダメージ-5%" class="help">頑強なる肉体</span>'
 ,'<span title="POT Healed+5%, DEF+5, Physical damage-5%" class="help">(Solid body)</span>'
 ,'<span title="藥劑效果+5%、防禦力+5、物理傷害-5%" class="help">(頑強納魯身體)</span>'
);
Skill['Honor'][11] = new Array(
  '<span title="命中-10、回避+10、遠距離攻撃回避率+3%" class="help">軽業師の奥義</span>'
 ,'<span title="Accuracy-10, Dodge+10, Avoid long-distance rates+3%" class="help">(Mystery of Acrobat)</span>'
 ,'<span title="命中-10、迴避+10、迴/遠程+3%" class="help">(雜技演員的奧秘)</span>'
);
Skill['Honor'][12] = new Array(
  '<span title="命中+10、回避-10、正面から攻撃した時の攻撃力+10%" class="help">剣聖の秘伝</span>'
 ,'<span title="Accuracy+10, Dodge-10, Frontattack damage+10%" class="help">(Secrets of Swordsman)</span>'
 ,'<span title="命中+10、迴避-10、從背後攻擊+10%" class="help">(神聖之劍的秘密)</span>'
);

// ------------------------------ POT
Name['POT'] = new Array();
Name['POT'][ 0] = new Array(
  '<span title="基本LP回復量 : 20" class="help">肉塊</span>'
 ,'<span title="LP recovery amount : 20" class="help">Meat loaf</span>'
 ,'<span title="基本數額的生命值恢復 : 20" class="help">肉塊</span>'
);
Name['POT'][ 1] = new Array(
  '<span title="基本LP回復量 : 60" class="help">痛み止め</span>'
 ,'<span title="LP recovery amount : 60" class="help">Painkiller</span>'
 ,'<span title="基本數額的生命值恢復 : 60" class="help">止痛藥</span>'
);
Name['POT'][ 2] = new Array(
  '<span title="基本LP回復量 : 120" class="help">傷薬</span>'
 ,'<span title="LP recovery amount : 120" class="help">Salve</span>'
 ,'<span title="基本數額的生命值恢復 : 120" class="help">蠟膏</span>'
);
Name['POT'][ 3] = new Array(
  '<span title="基本LP回復量 : 180" class="help">治療薬</span>'
 ,'<span title="LP recovery amount : 180" class="help">Remedy</span>'
 ,'<span title="基本數額的生命值恢復 : 180" class="help">補救</span>'
);
Name['POT'][ 4] = new Array(
  '<span title="基本LP回復量 : 450" class="help">特治療薬</span>'
 ,'<span title="LP recovery amount : 450" class="help">Remedy(SP)</span>'
 ,'<span title="基本數額的生命值恢復 : 450" class="help">特蠟膏</span>'
);
Name['POT'][ 5] = new Array(
  '<span title="基本LP回復量 : 175" class="help">神秘のポーション</span>'
 ,'<span title="Mysterious Potion\nLP recovery amount : 175" class="help">Mysterious POT</span>'
 ,'<span title="基本數額的生命值恢復 : 175" class="help">神秘的藥水</span>'
);
Name['POT'][ 6] = new Array(
  '<span title="基本LP回復量 : 10" class="help">雪割草</span>'
 ,'<span title="LP recovery amount : 10" class="help">Hapetica</span>'
 ,'<span title="基本數額的生命值恢復 : 10" class="help">赫帕卡</span>'
);
Name['POT'][ 7] = new Array(
  '<span title="基本LP回復量 : 25" class="help">蓬莱花</span>'
 ,'<span title="LP recovery amount : 25" class="help">Penglai Flower</span>'
 ,'<span title="基本數額的生命值恢復 : 25" class="help">蓬萊花</span>'
);
Name['POT'][ 8] = new Array(
  '<span title="基本LP回復量 : 200" class="help">カボチャクッキー</span>'
 ,'<span title="LP recovery amount : 200" class="help">Pumpkin Cookies</span>'
 ,'<span title="基本數額的生命值恢復 : 200" class="help">南瓜餅乾</span>'
);
Name['POT'][ 9] = new Array(
  '<span title="アスティアンキャンディ\n基本LP回復量 : 150" class="help">キャンディ</span>'
 ,'<span title="LP recovery amount : 150" class="help">Asutian Candy</span>'
 ,'<span title="基本數額的生命值恢復 : 150" class="help">糖果</span>'
);
Name['POT'][10] = new Array(
  '<span title="リボン付きシャンパン\n基本LP回復量 : 5%" class="help">シャンパン</span>'
 ,'<span title="LP recovery amount : 5%" class="help">Champagne</span>'
 ,'<span title="基本數額的生命值恢復 : 5%" class="help">香檳酒</span>'
);
Name['POT'][11] = new Array(
  '<span title="快復のポーション\n基本LP回復量 : 15%" class="help">快復</span>'
 ,'<span title="Restoration Potion\nLP recovery amount : 15%" class="help">Rest POT</span>'
 ,'<span title="基本數額的生命值恢復 : 15%" class="help">恢復藥水</span>'
);
Name['POT'][12] = new Array(
  '<span title="生命のポーション\n基本LP回復量 : 30%" class="help">生命</span>'
 ,'<span title="LP recovery amount : 30%" class="help">Life Potion</span>'
 ,'<span title="基本數額的生命值恢復 : 30%" class="help">生命藥水</span>'
);
Name['POT'][13] = new Array(
  '<span title="基本LP回復量 : 18%" class="help">テイワズ</span>'
 ,'<span title="LP recovery amount : 18%" class="help">(Rune)</span>'
 ,'<span title="基本數額的生命值恢復 : 18%" class="help">石版畫</span>'
);

// ------------------------------ ジェム系
Name['Gem'] = new Array();
Name['Gem'][0] = new Array();
Name['Gem'][1] = new Array();
Name['Gem'][0][0] = new Array('物','Nor'    ,'物'  );
Name['Gem'][0][1] = new Array('魔','Mag'    ,'魔'  );
Name['Gem'][1][0] = new Array('炎','Fire'   ,'火'  );
Name['Gem'][1][1] = new Array('氷','Ice'    ,'冰'  );
Name['Gem'][1][2] = new Array('雷','Thunder','雷'  );
Name['Gem'][1][3] = new Array('毒','Poison' ,'毒'  );
Name['Gem'][1][4] = new Array('光','Light'  ,'光'  );
Name['Gem'][1][5] = new Array('闇','Dark'   ,'黑暗');
Name['Gem'][1][6] = new Array('虹','Rainbow','虹'  );

Name['Enhance'] = new Array();
Name['Enhance'][0] = new Array();
Name['Enhance'][1] = new Array();
Name['Enhance'][2] = new Array();
Name['Enhance'][3] = new Array();
Name['Enhance'][0][0] = new Array('炎の '        ,'Fire '      ,'火之'    );
Name['Enhance'][0][1] = new Array('氷の '        ,'Ice '       ,'冰之 '   );
Name['Enhance'][0][2] = new Array('雷の '        ,'Thunder '   ,'雷之 '   );
Name['Enhance'][0][3] = new Array('毒の '        ,'Poison '    ,'毒之 '   );
Name['Enhance'][0][4] = new Array('聖なる '      ,'Holy '      ,'光之 '   );
Name['Enhance'][0][5] = new Array('闇の '        ,'Dark '      ,'黑暗之 ' );
Name['Enhance'][0][6] = new Array(''             ,''           ,''        );
Name['Enhance'][1][0] = new Array('イグニス '    ,'Ignis '     ,'鬼火 '   );
Name['Enhance'][1][1] = new Array('グラース '    ,'Grasse '    ,'格拉斯 ' );
Name['Enhance'][1][2] = new Array('ブリッツ '    ,'Blitz '     ,'閃電 '   );
Name['Enhance'][1][3] = new Array('ベノム '      ,'Venom '     ,'毒液 '   );
Name['Enhance'][1][4] = new Array('ライト '      ,'Light '     ,'光 '     );
Name['Enhance'][1][5] = new Array('ノワール '    ,'Noir '      ,'比諾 '   );
Name['Enhance'][1][6] = new Array(''             ,''           ,''        );
Name['Enhance'][2][0] = new Array(' オブファイア',' of Fire'   ,' of 防火');
Name['Enhance'][2][1] = new Array(' オブアイス'  ,' of Ice'    ,' of 冰'  );
Name['Enhance'][2][2] = new Array(' オブサンダー',' of Thunder',' of 雷電');
Name['Enhance'][2][3] = new Array(' オブポイズン',' of Poison' ,' of 毒化');
Name['Enhance'][2][4] = new Array(' オブセイント',' of Saint'  ,' of 聖人');
Name['Enhance'][2][5] = new Array(' オブハーデス',' of Hades'  ,' of 冥王');
Name['Enhance'][2][6] = new Array(''             ,''           ,''        );
Name['Enhance'][3][0] = new Array('ダブル'       ,'Double '    ,'雙重'    );
Name['Enhance'][3][1] = new Array('トリプル'     ,'Triple '    ,'三重'    );

// -------------------------------------------------------------------------------------
Name['Title'] = new Array(Ver,'ぱんどらしみゅ','Pandora Saga Simulator','潘朵拉 模擬器');

Name['Menu'] = new Array('旧シミュレータ','old version','以前的版本');

Name['Tab'] = new Array();
Name['Tab'][0] = new Array('職業'    ,'JOB'    ,'職業'    );
Name['Tab'][1] = new Array('技能'    ,'SKILL'  ,'技能'    );
Name['Tab'][2] = new Array('攻撃系'  ,'ATTACK' ,'攻擊系統');
Name['Tab'][3] = new Array('防御系'  ,'DEFENSE','防禦系統');
Name['Tab'][4] = new Array('補助'    ,'BUFF'   ,'輔助'    );
Name['Tab'][5] = new Array('ログ'    ,'LOG'    ,'記錄'    );
Name['Tab'][6] = new Array('ファイル','FILE'   ,'文件'    );

Name['Text'] = new Array();
Name['Text'][ 0] = new Array('種族'                  ,'Race'                                ,'種族'               );
Name['Text'][ 1] = new Array('技能'                  ,'Skill'                               ,'技能'               );
Name['Text'][ 2] = new Array('職業'                  ,'Job'                                 ,'職業'               );
Name['Text'][ 3] = new Array('技能を使用'            ,'Use skills'                          ,'使用陳列技巧'       );
Name['Text'][ 4] = new Array('ログを使用'            ,'Use log'                             ,'使用記錄'           );
Name['Text'][ 5] = new Array('技能効果値を使用'      ,'Use skills value'                    ,'使用技能的效果'     );
Name['Text'][ 6] = new Array('POT効果値を使用'       ,'Use Potions value'                   ,'藥物使用的影響'     );
Name['Text'][ 7] = new Array('ステータス初期化'      ,'Status reset'                        ,'初始化狀態'         );
Name['Text'][ 8] = new Array('技能初期化'            ,'Skill reset'                         ,'技能初始化'         );
Name['Text'][ 9] = new Array('全て初期化'            ,'All reset'                           ,'初始化所有'         );
Name['Text'][10] = new Array(Name['Option'][ 0][3]   ,Name['Option'][ 0][4]                 ,Name['Option'][ 0][5]);
Name['Text'][11] = new Array(Name['Option'][ 1][3]   ,Name['Option'][ 1][4]                 ,Name['Option'][ 1][5]);
Name['Text'][12] = new Array(Name['Option'][ 2][3]   ,Name['Option'][ 2][4]                 ,Name['Option'][ 2][5]);
Name['Text'][13] = new Array(Name['Option'][ 3][3]   ,Name['Option'][ 3][4]                 ,Name['Option'][ 3][5]);
Name['Text'][14] = new Array(Name['Option'][ 4][3]   ,Name['Option'][ 4][4]                 ,Name['Option'][ 4][5]);
Name['Text'][15] = new Array(Name['Option'][ 5][3]   ,Name['Option'][ 5][4]                 ,Name['Option'][ 5][5]);
Name['Text'][16] = new Array('騎乗'                  ,'Horsemanship'                        ,'騎術'               );
Name['Text'][17] = new Array('技能効果値'            ,'Skill Effects'                       ,'該技能的效果'       );
Name['Text'][18] = new Array('POT効果値'             ,'POT Effects'                         ,'藥物的效果'         );
Name['Text'][19] = new Array(Name['Option'][81][3]   ,Name['Option'][81][4]                 ,Name['Option'][81][5]);
Name['Text'][20] = Name['Tab'][4];
Name['Text'][21] = new Array(Name['Option'][ 4][3]   ,Name['Option'][ 4][4]                 ,Name['Option'][4][5] );
Name['Text'][22] = new Array(Name['Skill'][14][1]    ,Name['Skill'][14][2]                  ,Name['Skill'][14][3] );
Name['Text'][23] = new Array(Name['Skill'][16][1]    ,Name['Skill'][16][2]                  ,Name['Skill'][16][3] );
Name['Text'][24] = new Array('クラン'                ,'Clan'                                ,'巴生'               );
Name['Text'][25] = new Array('名誉'                  ,'Honor'                               ,'榮譽'               );
Name['Text'][26] = new Array('装備初期化'            ,'Equipment reset'                     ,'裝備初始化');

Name['Learn'] = new Array();
Name['Learn'][0] = Name['Text'][1];
Name['Learn'][1] = new Array(Name['Option'][76][3],Name['Option'][76][4]   ,Name['Option'][76][5]);
Name['Learn'][2] = new Array(Name['Option'][78][3],Name['Option'][78][4]   ,Name['Option'][78][5]);
Name['Learn'][3] = new Array('再使用時間'         ,'Cooldown'              ,'冷卻時間');
Name['Learn'][4] = new Array('秒'                 ,'s&nbsp;'               ,'秒');
Name['Learn'][5] = new Array('持続時間'           ,'Duration'              ,'持續時間');
Name['Learn'][6] = new Array('習得条件'           ,'Prerequisites'         ,'先修條件');
Name['Learn'][7] = new Array('装備条件'           ,'Equipment requirements','裝備條件');

// ------------------------------ ステ表示設定
Set = new Array();
Set['Status'] = new Array();
Set['Status'][ 0] = new Array(  6,0,   7,0,   0,0);
Set['Status'][ 1] = new Array(  8,1,  11,1,  76,1);
Set['Status'][ 2] = new Array( 18,0,  19,1,  20,1);
Set['Status'][ 3] = new Array( 42,1,   0,0,   0,0);
Set['Status'][ 4] = new Array( 49,0,  50,1,  51,1);
Set['Status'][ 5] = new Array( 52,0,  52,1,  60,1);
Set['Status'][ 6] = new Array( 62,0,  63,0,   0,0);
Set['Status'][ 7] = new Array(  0,0,  69,1,  71,1);
Set['Status'][ 8] = new Array( 65,0,  70,1,  72,1);
Set['Status'][ 9] = new Array( 66,1,  67,1,  68,1);
Set['Status'][10] = new Array( 40,0,  41,0, 138,1);
Set['Status'][11] = new Array( 73,1,   0,0, 139,1);
Set['Status'][12] = new Array( 77,1,  78,1, 140,1);
Set['Status'][13] = new Array( 79,1,   0,0, 141,1);
Set['Status'][14] = new Array( 74,1,  75,1, 142,1);
Set['Status'][15] = new Array(  0,0,   0,0, 143,1);
Set['Status'][16] = new Array(  0,0,   0,0, 144,1);
Set['Status'][17] = new Array(146,1, 147,1, 145,1);

// ------------------------------ 攻撃系ステ表示設定
Set['ATK'] = new Array();
Set['ATK'][ 0] = new Array( 22,1,  34,0,  43,1,   0,1,  85,1,   0,0);
Set['ATK'][ 1] = new Array( 23,1,  35,0,  44,1,   0,1,  86,1,   0,0);
Set['ATK'][ 2] = new Array( 24,1,  36,0,  45,1,   0,1,  89,1,  90,1);
Set['ATK'][ 3] = new Array( 25,1,  37,0,  46,1,   0,1,  91,1,  92,1);
Set['ATK'][ 4] = new Array( 26,1,  38,0,  47,1,   0,1,  93,1,  94,1);
Set['ATK'][ 5] = new Array( 27,1,  39,0,  48,1,   0,1,  95,1,  96,1);
Set['ATK'][ 6] = new Array( 28,1,   0,0,   0,0,   0,1,  97,1,  98,1);
Set['ATK'][ 7] = new Array(  0,0,   0,0,   0,0,   0,1,  99,1, 100,1);
Set['ATK'][ 8] = new Array( 21,0,  33,1,  80,1,   0,1, 103,1, 104,1);
Set['ATK'][ 9] = new Array( 29,1,   0,0,   0,0,   0,1, 105,1, 106,1);
Set['ATK'][10] = new Array( 30,1,   0,0,   0,0,   0,1, 107,1, 108,1);
Set['ATK'][11] = new Array( 31,1,   0,0,   0,0,   0,1, 109,1, 110,1);
Set['ATK'][12] = new Array( 32,1,   0,0,   0,0,   0,1, 119,1, 120,1);
Set['ATK'][13] = new Array(  0,0,   0,0,   0,0,   0,1, 123,1, 124,1);
Set['ATK'][14] = new Array(  0,0,   0,0,   0,0,   0,1, 129,1, 130,1);

// ------------------------------ 防御系ステ表示設定
Set['RES'] = new Array();
Set['RES'][ 0] = new Array( 12,0,  13,0,   0,1, 148,1);
Set['RES'][ 1] = new Array(  9,1,  10,1,   0,1, 149,1);
Set['RES'][ 2] = new Array( 14,0,  15,0,   0,1, 150,1);
Set['RES'][ 3] = new Array( 16,0,  17,0,   0,1, 151,1);
Set['RES'][ 4] = new Array(  0,0,   0,0,   0,1, 152,1);
Set['RES'][ 5] = new Array( 53,1,  61,0,   0,1, 153,1);
Set['RES'][ 6] = new Array( 54,1, 133,1,   0,1, 154,0);
Set['RES'][ 7] = new Array( 55,1, 134,1,   0,1, 156,1);
Set['RES'][ 8] = new Array( 56,1, 135,1,   0,1, 157,1);
Set['RES'][ 9] = new Array( 57,1, 136,1,   0,1, 158,1);
Set['RES'][10] = new Array( 58,1, 137,1,   0,1, 159,1);
Set['RES'][11] = new Array( 59,1, 162,1,   0,1, 160,1);
Set['RES'][12] = new Array( 82,1,  83,1,   0,1, 161,1);

// ------------------------------ バフ表示設定
Set['Buff'] = new Array();
Set['Buff'][ 0] = new Array( 0, 7, 0,   1, 4, 0,  14, 3, 5);
Set['Buff'][ 1] = new Array( 0, 8, 0,   3, 2, 1,  14, 4, 0);
Set['Buff'][ 2] = new Array( 6, 2, 2,   5, 5, 0,  14, 6, 0);
Set['Buff'][ 3] = new Array( 6, 3, 0,  11, 3, 1,  14, 8, 0);
Set['Buff'][ 4] = new Array(14, 0, 1,  11, 6, 0,  14, 9, 0);
Set['Buff'][ 5] = new Array(14, 1, 0,   0, 0, 0,  15, 0, 0);
Set['Buff'][ 6] = new Array(14, 2, 1,   0, 9, 0,  15, 8, 0);
Set['Buff'][ 7] = new Array(15, 1, 0,   0,10, 0,  16, 0, 0);
Set['Buff'][ 8] = new Array( 0, 0, 0,   0,11, 0,  16, 2, 1);
Set['Buff'][ 9] = new Array(30, 0, 0,   7, 0, 1,  16, 3, 1);
Set['Buff'][10] = new Array(30, 1, 4,   7, 1, 1,   0, 0, 0);
Set['Buff'][11] = new Array(30, 2, 1,  11, 0, 3,  18, 8, 6);
Set['Buff'][12] = new Array( 0, 0, 0,   0, 0, 0,  18, 9, 7);
Set['Buff'][13] = new Array( 0, 0, 0,   8, 1, 1,  18,10, 8);
Set['Buff'][14] = new Array( 0, 0, 0,  20, 3, 0,  20, 7, 9);
Set['Buff'][15] = new Array( 0, 0, 0,   0, 0, 0,  21, 7,10);

// ------------------------------ スキル表示設定
Name['Text']['Skill'] = new Array();
Name['Text']['Skill']['Heal'] = new Array();
Name['Text']['Skill']['Heal'][ 0] = new Array(Skill[0][13][ 5][0],Skill[1][13][ 5][0],Skill[2][13][ 5][0]);
Name['Text']['Skill']['Heal'][ 1] = new Array(Skill[0][13][ 0][0],Skill[1][13][ 0][0],Skill[2][13][ 0][0]);
Name['Text']['Skill']['Heal'][ 2] = new Array(Skill[0][13][10][0],Skill[1][13][10][0],Skill[2][13][10][0]);
Name['Text']['Skill']['Heal'][ 3] = new Array(Skill[0][13][ 2][0],Skill[1][13][ 2][0],Skill[2][13][ 2][0]);
Name['Text']['Skill']['Heal'][ 4] = new Array(Skill[0][13][ 9][0],Skill[1][13][ 9][0],Skill[2][13][ 9][0]);
Name['Text']['Skill']['Buff'] = new Array();
Name['Text']['Skill']['Buff'][ 0] = new Array(1,Skill[0][14][3][0],Skill[1][14][3][0],Skill[2][14][3][0]);
Name['Text']['Skill']['Buff'][ 1] = new Array(0,Skill[0][14][4][0],Skill[1][14][4][0],Skill[2][14][4][0]);
Name['Text']['Skill']['Buff'][ 2] = new Array(1,Skill[0][14][6][0],Skill[1][14][6][0],Skill[2][14][6][0]);
Name['Text']['Skill']['Buff'][ 3] = new Array(2,Skill[0][15][8][0],Skill[1][15][8][0],Skill[2][15][8][0]);
Name['Text']['Skill']['Buff'][ 4] = new Array(2,'<span title="' + Skill[0][20][3][0] + '" class="help">' + Skill[0][20][3][0].slice(0,5) + '</span>'
                                               ,Skill[1][20][3][0]
                                               ,Skill[2][20][3][0]);
Name['Text']['Skill']['Buff'][ 5] = new Array(1,'<span title="' + Skill[0][14][2][0] + ' (魔法攻撃力)" class="help">' + Skill[0][14][2][0].slice(0,3) + ' (魔攻)</span>'
                                               ,'<span title="' + Skill[1][14][2][0] + ' (Magic attack)" class="help">' + Skill[1][14][2][0].slice(0,7) + ' (MATK)</span>'
                                               ,Skill[2][14][2][0] + ' (魔攻)');
Name['Text']['Skill']['Buff'][ 6] = new Array(2,'<span title="' + Skill[0][14][2][0] + ' (オーラダメージ)" class="help">' + Skill[0][14][2][0].slice(0,3) + ' (オーラ)</span>'
                                               ,'<span title="' + Skill[1][14][2][0] + ' (Aura damage)" class="help">' + Skill[1][14][2][0].slice(0,7) + ' (Aura)</span>'
                                               ,Skill[2][14][2][0] + ' (靈氣)');
Name['Text']['Skill']['Buff'][ 7] = new Array(0,Skill[0][16][0][0],Skill[1][16][0][0],Skill[2][16][0][0]);
Name['Text']['Skill']['Buff'][ 8] = new Array(0,Skill[0][16][2][0],Skill[1][16][2][0],Skill[2][16][2][0]);
Name['Text']['Skill']['Buff'][ 9] = new Array(2,Skill[0][16][3][0] + '(魔攻)'
                                               ,'<span title="' + Skill[1][16][3][0] + ' (MATK)" class="help">' + Skill[1][16][3][0].slice(0,10) + ' (MATK)</span>'
                                               ,Skill[2][16][3][0] + ' (魔攻)');
Name['Text']['Skill']['Buff'][10] = new Array(1,Skill[0][16][3][0] + '(再使用)'
                                               ,'<span title="' + Skill[1][16][3][0] + ' (Delay)" class="help">' + Skill[1][16][3][0].slice(0,10) + ' (Delay)</span>'
                                               ,Skill[2][16][3][0] + ' (冷卻)');
Name['Text']['Skill']['Other'] = new Array();
Name['Text']['Skill']['Other'][ 0] = new Array(2,'<span title="' + Skill[0][8][1][0] + '" class="help">' + Skill[0][8][1][0].slice(0,5) + '</span>',Skill[1][8][1][0],Skill[2][8][1][0]);
Name['Text']['Skill']['Other'][ 1] = new Array(2,Skill[0][8][5][0],Skill[1][8][5][0],Skill[2][8][5][0]);
Name['Text']['Skill']['Text'] = new Array();
Name['Text']['Skill']['Text'][0] = new Array('次の霊感','Next SPR','下面靈感');
Name['Text']['Skill']['Text'][1] = new Array('次の祝福','Next BLE','下面祝福');
Name['Text']['Skill']['Text'][2] = new Array('段階','ph','級');

// -------------------------------------------------------------------------------------
function CalcSet(a,b,c,d) {
  var a,b,c,d,i,tmp;
  tmp = new Array();
  switch (a) {
    case 'ALL':
      for (i=0;i<Name['Option'].length;i++)
        Calc(Name['Option'][i][2],b);
      Calc('FirstAid');Calc('Heal');Calc('Regenerate');Calc('HealingAura');Calc('Sanctuary');Calc('Restoration');Calc('RecoveryBelt');Calc('CharityAmulet');Calc('Velox');Calc('LapisMedio');Calc('GroupBarrier');Calc('BlessWeapon');Calc('Gloom');Calc('Enchantment');Calc('MinstrelSong');Calc('PeacefulHymn');Calc('SageSong');Calc('Toxify');Calc('ToxicAura');
      Calc('POT_A');Calc('POT_B');
    break;
    case 'Lev':   Calc('LP');Calc('MP');Calc('POT');Calc('ACC');Calc('Dodge');Calc('DAMPoison');Calc('POT_B'); break;
    case 'STA':   Calc(a);Calc('LP');Calc('POT');Calc('LPRec');Calc('LPRecSPD');Calc('RESPDebuff');Calc('POT_A');Calc('POT_B'); break;
    case 'STR':   Calc(a);Calc('ATK'); break;
    case 'AGI':   Calc(a);Calc('Dodge');Calc('ATKSPD'); break;
    case 'DEX':   Calc(a);Calc('ACC');Calc('Cri');Calc('CastSPD'); break;
    case 'SPR':   Calc(a);Calc('MP');Calc('MPRec');Calc('MPRecSPD');Calc('RESMDebuff');Calc('Regenerate');Calc('Restoration');Calc('Velox');Calc('LapisMedio');Calc('GroupBarrier');Calc('BlessWeapon');Calc('Gloom');Calc('Enchantment');Calc('MinstrelSong');Calc('PeacefulHymn');Calc('SageSong'); break;
    case 'INT':   Calc(a);Calc('MATK');Calc('ReduceMP');Calc('Cooldown');Calc('FirstAid');Calc('Heal');Calc('HealingAura');Calc('Sanctuary');Calc('RecoveryBelt');Calc('CharityAmulet'); break;
    case 'Horse': Calc('ATK');Calc('MATK');Calc('DEF');Calc('ACC');Calc('Dodge');Calc('ATKSPD');Calc('CastSPD');Calc('Cooldown');Calc('RelHorse'); break;
    case 'Job':
      StatusSet('Status','Job');
      StatusSet('Skill');
      RJText('Job');
      ListCreate('Equip');
      ListCreate('SoulCheck');
      for (i=0;i<4;i++)
        Learn[i] = new Array();
      for (i=0;i<Name['Skill'].length;i++) {
        SkillList('Potential',i);
        SkillList('Adeptness',i);
      }
      SkillList('Create');
      SkillList('Color');
      CalcSet('ALL');
    break;
    case 'Skill':
      StatusMove(a,b,c,d);
      if (d == 'Potential') {
        Learn[1] = new Array();
        for (i=0;i<Name['Skill'].length;i++)
          SkillList('Potential',i);
        SkillList('Adeptness',b);
      } else
        SkillList('Adeptness',b);
      SkillList('Create');
      SkillList('Color');
      if (Status['Job'][2] >= 0 && Status['Job'][2] <= 6 && b >= 1 && b <= 5) { // ヲリ系：回復量増加：近接系列
        Calc('POT');Calc('POT_A');Calc('POT_B');
      }
      if (Status['Job'][2] >= 1 && Status['Job'][2] <= 3 && b >= 1 && b <= 5) // グラ系：ハイパワー：近接系列
        Calc('WeaDAM');
      if (Flag['0_11'] && b >= 1 && b <= 5) // デスペラード：近接系列
        Calc('ATK');
      if (Flag['3_2'] && b >= 3) // イエール：払う
        Calc('Cri');
      if (Status['Job'][2] == 6 && b == 5) // パラ：フィラクテリー：防御
        Calc('RESMagic');
      if (Status['Job'][2] >= 8 && Status['Job'][2] <= 10 && b >= 7 && b <= 11) // 弓系：鷹の目：技巧系列
        Calc('ACC');
      if (Status['Job'][2] >= 11 && Status['Job'][2] <= 13 && b >= 7 && b <= 11) // エジェ系：クイックステップ：技巧系列
        Calc('Dodge');
      if (Flag['8_1'] && b >= 8) // フォックスグローブ：調合
        Calc('DAMPoison');
      if (b == 8) { // 調合
        Calc('Toxify');Calc('ToxicAura');
      }
      if (Status['Job'][2] >= 15 && Status['Job'][2] <= 17 && b >= 13 && b <= 16) // プリ系：インスピレーション：祈祷系列
        Calc('SPR');
      if (Status['Job'][2] >= 18 && Status['Job'][2] <= 20 && b >= 13 && b <= 16) { // アセ系：ホーリーディバイン：祈祷系列
        Calc('RESPoison');Calc('RESCharm');Calc('RESMagic');
      }
      if (b == 13) { // 慈愛
        Calc('FirstAid');Calc('Heal');Calc('HealingAura');Calc('Sanctuary');Calc('Regenerate');Calc('Restoration');
      }
      if (b == 14) { // 祝福
        Calc('Velox');Calc('LapisMedio');Calc('GroupBarrier');Calc('Enchantment');
      }
      if (b == 16) { // 聖歌
        Calc('MinstrelSong');Calc('PeacefulHymn');Calc('SageSong');
      }
      if (Status['Job'][2] >= 22 && Status['Job'][2] <= 24 && b >= 18 && b <= 21) // WIZ系：魔力上昇：魔術系列
        Calc('MATK');
      if (Status['Job'][2] >= 25 && Status['Job'][2] <= 27 && b >= 18 && b <= 21) { // ロア系：ダークバインド：魔術系列
        Calc('RESFire');Calc('RESIce');Calc('RESLightning');
      }
      if (b == 24) // 騎乗ステータス開放率：騎乗
        CalcSet('Horse');
    break;
    case 'Equip': EquipCheck(); break;
    case 'Clan':
      switch ($('SelBuffClan_0').selectedIndex) {
        case  0: $('SelBuffClan_1').selectedIndex = 0;$('SelBuffClan_2').selectedIndex = 0;$('SelBuffClan_3').selectedIndex = 0;$('SelBuffClan_4').selectedIndex = 0;$('SelBuffClan_5').selectedIndex = 0;$('SelBuffClan_6').selectedIndex = 0;$('SelBuffClan_7').selectedIndex = 0; break;
        case  1: $('SelBuffClan_1').selectedIndex = 0;$('SelBuffClan_2').selectedIndex = 0;$('SelBuffClan_3').selectedIndex = 0;$('SelBuffClan_4').selectedIndex = 0;$('SelBuffClan_5').selectedIndex = 0;$('SelBuffClan_6').selectedIndex = 0;$('SelBuffClan_7').selectedIndex = 1; break;
        case  2: $('SelBuffClan_1').selectedIndex = 1;$('SelBuffClan_2').selectedIndex = 1;$('SelBuffClan_3').selectedIndex = 0;$('SelBuffClan_4').selectedIndex = 0;$('SelBuffClan_5').selectedIndex = 0;$('SelBuffClan_6').selectedIndex = 0;$('SelBuffClan_7').selectedIndex = 1; break;
        case  3: $('SelBuffClan_1').selectedIndex = 1;$('SelBuffClan_2').selectedIndex = 1;$('SelBuffClan_3').selectedIndex = 0;$('SelBuffClan_4').selectedIndex = 0;$('SelBuffClan_5').selectedIndex = 0;$('SelBuffClan_6').selectedIndex = 0;$('SelBuffClan_7').selectedIndex = 2; break;
        case  4: $('SelBuffClan_1').selectedIndex = 2;$('SelBuffClan_2').selectedIndex = 2;$('SelBuffClan_3').selectedIndex = 1;$('SelBuffClan_4').selectedIndex = 1;$('SelBuffClan_5').selectedIndex = 0;$('SelBuffClan_6').selectedIndex = 0;$('SelBuffClan_7').selectedIndex = 2; break;
        case  5: $('SelBuffClan_1').selectedIndex = 2;$('SelBuffClan_2').selectedIndex = 2;$('SelBuffClan_3').selectedIndex = 1;$('SelBuffClan_4').selectedIndex = 1;$('SelBuffClan_5').selectedIndex = 0;$('SelBuffClan_6').selectedIndex = 0;$('SelBuffClan_7').selectedIndex = 3; break;
        case  6: $('SelBuffClan_1').selectedIndex = 3;$('SelBuffClan_2').selectedIndex = 3;$('SelBuffClan_3').selectedIndex = 1;$('SelBuffClan_4').selectedIndex = 1;$('SelBuffClan_5').selectedIndex = 1;$('SelBuffClan_6').selectedIndex = 1;$('SelBuffClan_7').selectedIndex = 3; break;
        case  7: $('SelBuffClan_1').selectedIndex = 3;$('SelBuffClan_2').selectedIndex = 3;$('SelBuffClan_3').selectedIndex = 1;$('SelBuffClan_4').selectedIndex = 1;$('SelBuffClan_5').selectedIndex = 1;$('SelBuffClan_6').selectedIndex = 1;$('SelBuffClan_7').selectedIndex = 4; break;
        case  8: $('SelBuffClan_1').selectedIndex = 4;$('SelBuffClan_2').selectedIndex = 4;$('SelBuffClan_3').selectedIndex = 2;$('SelBuffClan_4').selectedIndex = 2;$('SelBuffClan_5').selectedIndex = 1;$('SelBuffClan_6').selectedIndex = 1;$('SelBuffClan_7').selectedIndex = 4; break;
        case  9: $('SelBuffClan_1').selectedIndex = 4;$('SelBuffClan_2').selectedIndex = 4;$('SelBuffClan_3').selectedIndex = 2;$('SelBuffClan_4').selectedIndex = 2;$('SelBuffClan_5').selectedIndex = 1;$('SelBuffClan_6').selectedIndex = 1;$('SelBuffClan_7').selectedIndex = 5; break;
        case 10:
          case 11:
          case 12:
            $('SelBuffClan_1').selectedIndex = 5;$('SelBuffClan_2').selectedIndex = 5;$('SelBuffClan_3').selectedIndex = 2;$('SelBuffClan_4').selectedIndex = 2;$('SelBuffClan_5').selectedIndex = 2;$('SelBuffClan_6').selectedIndex = 2;$('SelBuffClan_7').selectedIndex = 5;
        break;
      }
      CalcSet('ALL');
    break;
    case 'ViewSkill':
      Calc('FirstAid');Calc('Heal');Calc('Regenerate');Calc('HealingAura');Calc('Sanctuary');Calc('Restoration');Calc('RecoveryBelt');Calc('CharityAmulet');Calc('Velox');Calc('LapisMedio');Calc('GroupBarrier');Calc('BlessWeapon');Calc('Gloom');Calc('Enchantment');Calc('MinstrelSong');Calc('PeacefulHymn');Calc('SageSong');Calc('Toxify');Calc('ToxicAura');
    break;
    case 'ViewPOT': CalcSet('POT_A');CalcSet('POT_B'); break;
  }
//  ts.innerHTML = a;
}
// -------------------------------------------------------------------------------------
function StatusColor(a,b,c,d) {
  var a,b,c,d,i,tmp;
  if (!a) return false;

  $(a + '_0').innerHTML = b + c + d;
  if (b + c + d > b + c)
    $(a + '_0').className = 'col_txt_green';
  else if  (b + c + d < b + c)
    $(a + '_0').className = 'col_txt_red';
  else
    $(a + '_0').className = '';
  $(a + '_1').innerHTML = b + c;
  if (d > 0) {
    $(a + '_2').innerHTML = '<span class="col_txt_green">+</span>';
    $(a + '_3').className = 'col_txt_green';
  } else if (d < 0) {
    $(a + '_2').innerHTML = '<span class="col_txt_red">-</span>';
    $(a + '_3').className = 'col_txt_red';
    d *= -1;
  } else {
    $(a + '_2').innerHTML = '&nbsp;';
    $(a + '_3').className = '';
  }
  $(a + '_3').innerHTML = (d == 0) ? '&nbsp;': d;
}
// -------------------------------------------------------------------------------------
function EquipOption(a,b,c,d,e,f,g) {
// 魂とか鍛錬値とか
// a:アイテムID b:ジェムの種類 c:ジェムの属性 d:鍛錬値 e:魂1 f:魂2 g:魂3
// 戻り値 例:毒の ダブルヘイスティ トゥワイス ミスリルソード +10
  var a,b,c,d,e,f,g,tmp;
  tmp = new Array();
  tmp[1] = Math.floor(a / 10000);
  tmp[2] = a % 10000
  tmp[0] = '';
  tmp[0] += (tmp[2] > 0 && d > 0 && tmp[1] < 20) ? Name['Enhance'][b][c][Flag[0]]: '';
  if (e > 0 && f > 0 && g > 0 && e == f && e == g && f == g) tmp[0] += Name['Enhance'][3][1][Flag[0]] + SoulData[Flag[0]][e][1] + '&nbsp;';
  else if (e > 0 && e == f) tmp[0] += (g > 0) ? Name['Enhance'][3][0][Flag[0]] + SoulData[Flag[0]][e][1] + '&nbsp;' + SoulData[Flag[0]][g][1] + '&nbsp;': Name['Enhance'][3][0][Flag[0]] + SoulData[Flag[0]][e][1] + '&nbsp;';
  else if (e > 0 && e == g) tmp[0] += (f > 0) ? Name['Enhance'][3][0][Flag[0]] + SoulData[Flag[0]][e][1] + '&nbsp;' + SoulData[Flag[0]][f][1] + '&nbsp;': Name['Enhance'][3][0][Flag[0]] + SoulData[Flag[0]][e][1] + '&nbsp;';
  else if (f > 0 && f == g) tmp[0] += (e > 0) ? Name['Enhance'][3][0][Flag[0]] + SoulData[Flag[0]][f][1] + '&nbsp;' + SoulData[Flag[0]][e][1] + '&nbsp;': Name['Enhance'][3][0][Flag[0]] + SoulData[Flag[0]][f][1] + '&nbsp;';
  else {
   if (e > 0) tmp[0] += SoulData[Flag[0]][e][1] + '&nbsp;';
   if (f > 0) tmp[0] += SoulData[Flag[0]][f][1] + '&nbsp;';
   if (g > 0) tmp[0] += SoulData[Flag[0]][g][1] + '&nbsp;';
  }
  tmp[0] += (tmp[2] > 0) ? EquipData[Flag[0]][tmp[1]][tmp[2]][0]: '-----';
  tmp[0] += (tmp[2] > 0 && d > 0 && tmp[1] >= 20) ? Name['Enhance'][2][c][Flag[0]]: '';
  tmp[0] += (tmp[2] > 0 && d > 0) ? '&nbsp;+' + d: '';
  return tmp[0];
}


// Name['Item'][ 0] = new Array('武器'      ,'Weapon'   ,'武器類');
// Name['Item'][ 1] = new Array('片手剣'    ,'1H Sword' ,'單手劍');
// Name['Item'][ 2] = new Array('両手剣'    ,'2H Sword' ,'雙手劍');
// Name['Item'][ 3] = new Array('片手斧'    ,'1H Axe'   ,'單手斧');
// Name['Item'][ 4] = new Array('両手斧'    ,'2H Axe'   ,'雙手斧');
// Name['Item'][ 5] = new Array('片手槍'    ,'1H Spear' ,'單手槍');
// Name['Item'][ 6] = new Array('両手槍'    ,'2H Spear' ,'雙手槍');
// Name['Item'][ 7] = new Array('短剣'      ,'Knife'    ,'短劍'  );
// Name['Item'][ 8] = new Array('格闘'      ,'Fist'     ,'格鬥'  );
// Name['Item'][ 9] = new Array('弓'        ,'Bow'      ,'弓'    );
// Name['Item'][10] = new Array('弩'        ,'Crossbow' ,'十字弩');
// Name['Item'][11] = new Array('片手鈍器'  ,'1H Hammer','單手棍');
// Name['Item'][12] = new Array('両手鈍器'  ,'2H Hammer','雙手棍');
// Name['Item'][13] = new Array('片手杖'    ,'1H Wand'  ,'單手杖');
// Name['Item'][14] = new Array('両手杖'    ,'2H Wand'  ,'雙手杖');
// Name['Item'][15] = new Array('防具'      ,'Armor'    ,'護身類');
// Name['Item'][16] = new Array('盾'        ,'Shield'   ,'盾牌'  );
// Name['Item'][17] = new Array('ヘルメット','Helmet'   ,'頭盔'  );
// Name['Item'][18] = new Array('トーソ'    ,'Torso'    ,'胸部'  );
// Name['Item'][19] = new Array('グローブ'  ,'Glove'    ,'手套'  );
// Name['Item'][20] = new Array('クィス'    ,'Cuisse'   ,'褲子'  );
// Name['Item'][21] = new Array('ブーツ'    ,'Boots'    ,'靴子'  );
// Name['Item'][22] = new Array('マント'    ,'Cape'     ,'披風'  );
// Name['Item'][23] = new Array('イヤリング','Earring'  ,'耳環'  );
// Name['Item'][24] = new Array('ネックレス','Necklace' ,'項鍊'  );
// Name['Item'][25] = new Array('ベルト'    ,'Belt'     ,'腰帶'  );
// Name['Item'][26] = new Array('リング'    ,'Ring'     ,'戒指'  );
// Name['Item'][27] = new Array('魂'        ,'Soul'     ,'魂魄'  );
// Name['Item'][28] = new Array('武器'      ,'Weapon'   ,'武器'  );
// Name['Item'][29] = new Array('盾'        ,'Shield'   ,'盾牌'  );
// Name['Item'][30] = new Array('頭部'      ,'Helmet'   ,'頭部'  );
// Name['Item'][31] = new Array('上半身'    ,'Torso'    ,'胸部'  );
// Name['Item'][32] = new Array('腕'        ,'Glove'    ,'手臂'  );
// Name['Item'][33] = new Array('下半身'    ,'Cuisse'   ,'下半身');
// Name['Item'][34] = new Array('靴'        ,'Boots'    ,'鞋'    );
// Name['Item'][35] = new Array('ベルト'    ,'Belt'     ,'腰帶'  );
