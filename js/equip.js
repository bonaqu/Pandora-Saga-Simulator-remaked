function EquipCheck() {
  var i,tmp,We,Sh,He,To,Gl,Ku,Bo,Cl,E1,E2,Ne,Be,R1,R2;
  SPOpt = new Array();
  SPOpt[0] = new Array();
  SPOpt[1] = new Array();
  for (i=0;i<=13;i++) {
    SPOpt[1][i] = new Array();
    for (j=0;j<=3;j++)
      SPOpt[1][i][j] = new Array();
  }
  tmp = Math.floor(Status['Equip'][0][0] / 10000);
// 両手武器の場合、左手を強制解除
  if (tmp == 1 || tmp == 3 || tmp == 5 || tmp == 7 || tmp == 8 || tmp == 9 || tmp == 11 || tmp == 13) {
    Status['Equip'][1] = new Array(0,0,0,0,0,0,0);
    for (i=0;i<=6;i++)
      $('SelEquip_1_' + i).selectedIndex = 0;
    ListCreate('SoulCheck');
  }
// 装備部位が特殊な物
  tmp = new Array(Math.floor(Status['Equip'][3][0] / 10000),Status['Equip'][3][0] % 10000);
  To = new Array();To['N'] = EquipData[0][tmp[0]][tmp[1]][0];
  if (
    To['N'] == 'アスティアンドレス'
 || To['N'] == '碧色アスティアンドレス'
 || To['N'] == '雪色アスティアンドレス'
 || To['N'] == '翠色アスティアンドレス'
 || To['N'] == '夜色アスティアンドレス'
 || To['N'] == '緋色アスティアンドレス'
 || To['N'] == '芳色アスティアンドレス'
 || To['N'] == '月色アスティアンドレス'
 || To['N'] == 'クリスマスドレス'
  ) {
    Status['Equip'][5] = new Array(0,0,0,0,0,0,0);
    for (i=0;i<=6;i++)
      $('SelEquip_5_' + i).selectedIndex = 0;
    ListCreate('SoulCheck');
  }
  if (To['N'] == 'フォビドゥンローブ') {
    Status['Equip'][2] = new Array(0,0,0,0,0,0,0);
    Status['Equip'][7] = new Array(0,0,0,0,0,0,0);
    for (i=0;i<=6;i++) {
      $('SelEquip_2_' + i).selectedIndex = 0;
      $('SelEquip_7_' + i).selectedIndex = 0;
    }
    ListCreate('SoulCheck');
  }
  if (To['N'] == 'サジェスルージュローブ') {
    Status['Equip'][2] = new Array(0,0,0,0,0,0,0);
    for (i=0;i<=6;i++)
      $('SelEquip_2_' + i).selectedIndex = 0;
    ListCreate('SoulCheck');
  }

  tmp = new Array();
  SN = new Array();
  SE = new Array();
// 通常の補正を特殊補正にぶち込む
  for (i=0;i<=13;i++) {
    tmp = new Array(Math.floor(Status['Equip'][i][0] / 10000),Status['Equip'][i][0] % 10000);
    if (EquipData[0][tmp[0]][tmp[1]][7]) {
      if (EquipData[0][tmp[0]][tmp[1]][7].search(/_/i) != -1) {
        tmp[1] = EquipData[0][tmp[0]][tmp[1]][7].split('_');
        for (j=0;j<tmp[1].length;j++)
          SPOpt[0].push(tmp[1][j]);
      } else
        if (EquipData[0][tmp[0]][tmp[1]][7])
          SPOpt[0].push(EquipData[0][tmp[0]][tmp[1]][7]);
    }
  }

  tmp = new Array();
  for (i=0;i<=13;i++)
    tmp[i] = new Array(Math.floor(Status['Equip'][i][0] / 10000),Status['Equip'][i][0] % 10000);
  We = new Array();We['N'] = EquipData[0][tmp[ 0][0]][tmp[ 0][1]][0];We['G1'] = Name['Gem'][0][Status['Equip'][ 0][1]][0];We['G2'] = Name['Gem'][1][Status['Equip'][ 0][2]][0];We['E'] = Status['Equip'][ 0][3];SN[ 0] = new Array(SoulData[0][Status['Equip'][ 0][4]][0],SoulData[0][Status['Equip'][ 0][5]][0],SoulData[0][Status['Equip'][ 0][6]][0]);SE[ 0] = Status['Equip'][ 0][3];
  Sh = new Array();Sh['N'] = EquipData[0][tmp[ 1][0]][tmp[ 1][1]][0];Sh['G1'] = Name['Gem'][0][Status['Equip'][ 1][1]][0];Sh['G2'] = Name['Gem'][1][Status['Equip'][ 1][2]][0];Sh['E'] = Status['Equip'][ 1][3];SN[ 1] = new Array(SoulData[0][Status['Equip'][ 1][4]][0],SoulData[0][Status['Equip'][ 1][5]][0],SoulData[0][Status['Equip'][ 1][6]][0]);SE[ 1] = Status['Equip'][ 1][3];
  He = new Array();He['N'] = EquipData[0][tmp[ 2][0]][tmp[ 2][1]][0];He['G1'] = Name['Gem'][0][Status['Equip'][ 2][1]][0];He['G2'] = Name['Gem'][1][Status['Equip'][ 2][2]][0];He['E'] = Status['Equip'][ 2][3];SN[ 2] = new Array(SoulData[0][Status['Equip'][ 2][4]][0],SoulData[0][Status['Equip'][ 2][5]][0],SoulData[0][Status['Equip'][ 2][6]][0]);SE[ 2] = Status['Equip'][ 2][3];
  To = new Array();To['N'] = EquipData[0][tmp[ 3][0]][tmp[ 3][1]][0];To['G1'] = Name['Gem'][0][Status['Equip'][ 3][1]][0];To['G2'] = Name['Gem'][1][Status['Equip'][ 3][2]][0];To['E'] = Status['Equip'][ 3][3];SN[ 3] = new Array(SoulData[0][Status['Equip'][ 3][4]][0],SoulData[0][Status['Equip'][ 3][5]][0],SoulData[0][Status['Equip'][ 3][6]][0]);SE[ 3] = Status['Equip'][ 3][3];
  Gl = new Array();Gl['N'] = EquipData[0][tmp[ 4][0]][tmp[ 4][1]][0];Gl['G1'] = Name['Gem'][0][Status['Equip'][ 4][1]][0];Gl['G2'] = Name['Gem'][1][Status['Equip'][ 4][2]][0];Gl['E'] = Status['Equip'][ 4][3];SN[ 4] = new Array(SoulData[0][Status['Equip'][ 4][4]][0],SoulData[0][Status['Equip'][ 4][5]][0],SoulData[0][Status['Equip'][ 4][6]][0]);SE[ 4] = Status['Equip'][ 4][3];
  Ku = new Array();Ku['N'] = EquipData[0][tmp[ 5][0]][tmp[ 5][1]][0];Ku['G1'] = Name['Gem'][0][Status['Equip'][ 5][1]][0];Ku['G2'] = Name['Gem'][1][Status['Equip'][ 5][2]][0];Ku['E'] = Status['Equip'][ 5][3];SN[ 5] = new Array(SoulData[0][Status['Equip'][ 5][4]][0],SoulData[0][Status['Equip'][ 5][5]][0],SoulData[0][Status['Equip'][ 5][6]][0]);SE[ 5] = Status['Equip'][ 5][3];
  Bo = new Array();Bo['N'] = EquipData[0][tmp[ 6][0]][tmp[ 6][1]][0];Bo['G1'] = Name['Gem'][0][Status['Equip'][ 6][1]][0];Bo['G2'] = Name['Gem'][1][Status['Equip'][ 6][2]][0];Bo['E'] = Status['Equip'][ 6][3];SN[ 6] = new Array(SoulData[0][Status['Equip'][ 6][4]][0],SoulData[0][Status['Equip'][ 6][5]][0],SoulData[0][Status['Equip'][ 6][6]][0]);SE[ 6] = Status['Equip'][ 6][3];
  Cl = new Array();Cl['N'] = EquipData[0][tmp[ 7][0]][tmp[ 7][1]][0];Cl['G1'] = Name['Gem'][0][Status['Equip'][ 7][1]][0];Cl['G2'] = Name['Gem'][1][Status['Equip'][ 7][2]][0];Cl['E'] = Status['Equip'][ 7][3];SN[ 7] = new Array(SoulData[0][Status['Equip'][ 7][4]][0],SoulData[0][Status['Equip'][ 7][5]][0],SoulData[0][Status['Equip'][ 7][6]][0]);SE[ 7] = Status['Equip'][ 7][3];
  E1 = new Array();E1['N'] = EquipData[0][tmp[ 8][0]][tmp[ 8][1]][0];E1['G1'] = Name['Gem'][0][Status['Equip'][ 8][1]][0];E1['G2'] = Name['Gem'][1][Status['Equip'][ 8][2]][0];E1['E'] = Status['Equip'][ 8][3];SN[ 8] = new Array(SoulData[0][Status['Equip'][ 8][4]][0],SoulData[0][Status['Equip'][ 8][5]][0],SoulData[0][Status['Equip'][ 8][6]][0]);SE[ 8] = Status['Equip'][ 8][3];
  E2 = new Array();E2['N'] = EquipData[0][tmp[ 9][0]][tmp[ 9][1]][0];E2['G1'] = Name['Gem'][0][Status['Equip'][ 9][1]][0];E2['G2'] = Name['Gem'][1][Status['Equip'][ 9][2]][0];E2['E'] = Status['Equip'][ 9][3];SN[ 9] = new Array(SoulData[0][Status['Equip'][ 9][4]][0],SoulData[0][Status['Equip'][ 9][5]][0],SoulData[0][Status['Equip'][ 9][6]][0]);SE[ 9] = Status['Equip'][ 9][3];
  Ne = new Array();Ne['N'] = EquipData[0][tmp[10][0]][tmp[10][1]][0];Ne['G1'] = Name['Gem'][0][Status['Equip'][10][1]][0];Ne['G2'] = Name['Gem'][1][Status['Equip'][10][2]][0];Ne['E'] = Status['Equip'][10][3];SN[10] = new Array(SoulData[0][Status['Equip'][10][4]][0],SoulData[0][Status['Equip'][10][5]][0],SoulData[0][Status['Equip'][10][6]][0]);SE[10] = Status['Equip'][10][3];
  Be = new Array();Be['N'] = EquipData[0][tmp[11][0]][tmp[11][1]][0];Be['G1'] = Name['Gem'][0][Status['Equip'][11][1]][0];Be['G2'] = Name['Gem'][1][Status['Equip'][11][2]][0];Be['E'] = Status['Equip'][11][3];SN[11] = new Array(SoulData[0][Status['Equip'][11][4]][0],SoulData[0][Status['Equip'][11][5]][0],SoulData[0][Status['Equip'][11][6]][0]);SE[11] = Status['Equip'][11][3];
  R1 = new Array();R1['N'] = EquipData[0][tmp[12][0]][tmp[12][1]][0];R1['G1'] = Name['Gem'][0][Status['Equip'][12][1]][0];R1['G2'] = Name['Gem'][1][Status['Equip'][12][2]][0];R1['E'] = Status['Equip'][12][3];SN[12] = new Array(SoulData[0][Status['Equip'][12][4]][0],SoulData[0][Status['Equip'][12][5]][0],SoulData[0][Status['Equip'][12][6]][0]);SE[12] = Status['Equip'][12][3];
  R2 = new Array();R2['N'] = EquipData[0][tmp[13][0]][tmp[13][1]][0];R2['G1'] = Name['Gem'][0][Status['Equip'][13][1]][0];R2['G2'] = Name['Gem'][1][Status['Equip'][13][2]][0];R2['E'] = Status['Equip'][13][3];SN[13] = new Array(SoulData[0][Status['Equip'][13][4]][0],SoulData[0][Status['Equip'][13][5]][0],SoulData[0][Status['Equip'][13][6]][0]);SE[13] = Status['Equip'][13][3];

// ---------- セット効果
  if (We['N'] == '風詠みの団扇' && He['N'] == 'ラピニィお面') {
    SPOpt[0].push('0=1');SPOpt[0].push('1=1');SPOpt[0].push('2=1');SPOpt[0].push('3=1');SPOpt[0].push('4=1');SPOpt[0].push('5=1');
  }
  if (We['N'] == '風詠みの団扇' && He['N'] == 'エンキお面') {
    SPOpt[0].push('0=2');SPOpt[0].push('1=2');SPOpt[0].push('2=2');SPOpt[0].push('3=2');SPOpt[0].push('4=2');SPOpt[0].push('5=2');
  }
  if (We['N'] == '夕涼みの扇子' && He['N'] == 'ドワーフお面') {
    SPOpt[0].push('0=2');SPOpt[0].push('1=1');SPOpt[0].push('2=1');SPOpt[0].push('3=2');SPOpt[0].push('4=1');SPOpt[0].push('5=2');
  }
  if (We['N'] == '祭祀の杖' && Ne['N'] == '祭祀のネックレス') {
    SPOpt[0].push('139=8');
  }
  if (Sh['N'] == 'ロデラ' && He['N'] == 'アイアンブレスレット') {
    SPOpt[0].push('76=-35');
  }
  if (Sh['N'] == 'カイトシールド' && To['N'] == 'ゴシックプレート' && Ku['N'] == 'ゴシッククィス' && Ne['N'] == '堅牢のアミュレット') {
    SPOpt[0].push('0=3');SPOpt[0].push('133=3');SPOpt[0].push('146=5');
  }
  if (Sh['N'] == 'ガノイドシールド' && He['N'] == 'ガノイドハット' && Gl['N'] == 'ガノイドグローブ' && Bo['N'] == 'ガノイドブーツ') {
    if (Sh['E'] >= 6) {
      SPOpt[0].push('5=2');SPOpt[0].push('52=-4%');SPOpt[0].push('77=3');SPOpt[0].push('138=8');SPOpt[0].push('139=8');
    }
  }
  if (Sh['N'] == 'セントリーガード' && He['N'] == 'ディバインブレーサー') {
    SPOpt[0].push('0=2');SPOpt[0].push('20=15');
  }
  if (He['N'] == 'ウィザードハット' && Gl['N'] == 'ルーナグローブ' && Bo['N'] == 'ルーナブーツ' && Ne['N'] == '月明のアミュレット') {
    SPOpt[0].push('134=30');SPOpt[0].push('156=40');
  }
  if (He['N'] == 'ティアラ' && To['N'] == '祓魔のローブ' && Ku['N'] == '祓魔のアルブ' && Ne['N'] == '祓魔のアミュレット') {
    SPOpt[0].push('0=1');SPOpt[0].push('4=2');SPOpt[0].push('11=4');SPOpt[0].push('136=20');SPOpt[0].push('147=10');
  }
  if (He['N'] == 'スイートキャップ' && Gl['N'] == 'スイートミトン' && Bo['N'] == 'スイートブーツ') {
    SPOpt[0].push('75=10');SPOpt[0].push('133=30');
  }
  if (He['N'] == '祭祀の仮面' && Ne['N'] == '祭祀のネックレス') {
    SPOpt[0].push('145=8');
  }
  if (He['N'] == 'グレートヘルム' && To['N'] == 'ゴジックプレート') {
    SPOpt[0].push('0=1');SPOpt[0].push('52=-3%');
  }
  if (To['N'] == 'ゴシックプレート' && Gl['N'] == 'ゴシックガントレット') {
    SPOpt[0].push('60=-3');SPOpt[0].push('133=5');
  }
  if (He['N'] == 'ファルコンマスク' && Gl['N'] == 'ファルコングローブ' && Bo['N'] == 'ファルコンブーツ') {
    if (He['E'] >= 6) {
      SPOpt[0].push('3=1');SPOpt[0].push('62=5%');SPOpt[0].push('41=1');SPOpt[0].push('76=-5');
    }
  }
  if (He['N'] == 'ファルコンマスク' && To['N'] == 'ファルコンジャケット' && Gl['N'] == 'ファルコングローブ' && Ku['N'] == 'ファルコンボトム' && Bo['N'] == 'ファルコンブーツ') {
    SPOpt[0].push('62=15');SPOpt[0].push('76=5');
    if (To['E'] >= 3) SPOpt[0].push('41=' + (To['E'] - 2));
    if (To['E'] >= 7) SPOpt[0].push('30=15');
  }
  if (To['N'] == 'スカーメイル' && Gl['N'] == 'スパイクグローブ' && Ku['N'] == 'スカーショウス' && Bo['N'] == 'スパイクブーツ') {
    if (To['E'] >= 5) {
      SPOpt[0].push('18=2');SPOpt[0].push('76=-5');
      SPOpt[0].push('18=' + ((To['E'] - 4) * 2));
    }
  }
  if (Sh['N'] == 'スパイクシールド' && To['N'] == 'スカーメイル' && Gl['N'] == 'スパイクグローブ' && Ku['N'] == 'スカーショウス' && Bo['N'] == 'スパイクブーツ' && Cl['N'] == 'バックスパイクシールド') {
    SPOpt[0].push('135=12');
    SPOpt[0].push('145=10');
  }
  if (Sh['N'] == 'スパイクシールド' && Gl['N'] == 'スパイクグローブ' && Bo['N'] == 'スパイクブーツ') {
    SPOpt[0].push('1=1');SPOpt[0].push('18=10');SPOpt[0].push('76=-8');SPOpt[0].push('145=10');
  }
  if (He['N'] == 'ヴィヤグラマスク' && Gl['N'] == 'ヴィヤグラグローブ' && Bo['N'] == 'ヴィヤグラブーツ') {
    if (He['E'] >= 6) {
      SPOpt[0].push('0=2');SPOpt[0].push('1=1');SPOpt[0].push('6=300');SPOpt[0].push('7=150');SPOpt[0].push('69=4');
    }
  }
  if (He['N'] == 'ヴィヤグラマスク' && To['N'] == 'ティーガートーソ' && Gl['N'] == 'ヴィヤグラグローブ' && Ku['N'] == 'ティーガークィス' && Bo['N'] == 'ヴィヤグラブーツ') {
    if (To['E'] >= 5) {
      SPOpt[0].push('69=2');SPOpt[0].push('70=5');
      if (To['E'] >= 5) SPOpt[0].push('71=' + ((To['E'] - 4) * 1));
    }
  }
  if (He['N'] == 'ヴィヤグラマスク' && To['N'] == 'ティーガートーソ' && Gl['N'] == 'ヴィヤグラグローブ' && Ku['N'] == 'ティーガークィス' && Bo['N'] == 'ヴィヤグラブーツ' && Ne['N'] == 'ティーガーネックレス') {
      SPOpt[0].push('18=5%');SPOpt[0].push('71=7');
  }
  if (He['N'] == 'ホワイトチャームキャップ' && To['N'] == 'ホワイトチャームコート' && Gl['N'] == 'ホワイトチャームミトン' && Ku['N'] == 'ホワイトチャームボトム') {
    SPOpt[0].push('0=1');SPOpt[0].push('1=1');SPOpt[0].push('2=1');SPOpt[0].push('3=1');SPOpt[0].push('4=1');SPOpt[0].push('5=1');
    if (Gl['E'] >= 5) SPOpt[0].push('70=-5');
    if (Gl['E'] >= 7) SPOpt[0].push('11=' + ((To['E'] - 6) * 5));
  }
  if (He['N'] == 'ホワイトチャームキャップ' && Gl['N'] == 'ホワイトチャームミトン' && Bo['N'] == 'ホワイトチャームブーツ') {
    SPOpt[0].push('0=1');SPOpt[0].push('1=1');SPOpt[0].push('2=1');SPOpt[0].push('3=1');SPOpt[0].push('4=1');SPOpt[0].push('5=1');SPOpt[0].push('75=20');
  }
  if (He['N'] == 'ブラウンキュートキャップ' && To['N'] == 'ブラウンキュートコート' && Gl['N'] == 'ブラウンキュートミトン' && Ku['N'] == 'ブラウンキュートボトム') {
    SPOpt[0].push('7=70');
    if (Gl['E'] >= 5) {
      SPOpt[0].push('18=10');
      SPOpt[0].push('42=10');
    }
    if (Gl['E'] >= 6) {
      SPOpt[0].push('18=' + ((Gl['E'] - 5) * 5));
      SPOpt[0].push('42=' + ((Gl['E'] - 5) * 5));
    }
  }
  if (He['N'] == 'ブラウンキュートキャップ' && Gl['N'] == 'ブラウンキュートミトン' && Bo['N'] == 'ブラウンキュートブーツ') {
    SPOpt[0].push('7=80');SPOpt[0].push('77=2');SPOpt[0].push('74=5');
  }
  if (He['N'] == 'ゴールドヘルム' && To['N'] == 'ゴールドプレート' && Gl['N'] == 'ゴールドガントレット' && Ku['N'] == 'ゴールドクィス' && Bo['N'] == 'ゴールドグリーブス') {
    if (To['E'] >= 7) SPOpt[0].push('151=255');
  }
  if (He['N'] == 'ディバインハット' && To['N'] == 'ディバインキュイラス' && Gl['N'] == 'ディバインブレーサー' && Ku['N'] == 'ディバインアルブ' && Bo['N'] == 'ディバインブーツ') {
    SPOpt[0].push('7=200');SPOpt[0].push('79=-8');SPOpt[0].push('134=12');
    if (To['E'] >= 5) {
      SPOpt[0].push('7=' + ((To['E'] - 4) * 40));
      SPOpt[0].push('49=' + ((To['E'] - 4) * 4));
      SPOpt[0].push('134=' + ((To['E'] - 4) * 4));
    }
  }
  if (He['N'] == 'バリアントヘルム' && To['N'] == 'バリアントプレート' && Gl['N'] == 'バリアントガントレット' && Ku['N'] == 'バリアントクィス' && Bo['N'] == 'バリアントグリーブス') {
    SPOpt[0].push('8=10');SPOpt[0].push('11=15');
    if (To['E'] >= 7) SPOpt[0].push('149=255');
  }
  if (He['N'] == 'アンブッシュキャップ' && To['N'] == 'アンブッシュベスト' && Gl['N'] == 'アンブッシュグローブ' && Ku['N'] == 'アンブッシュトラウザ' && Bo['N'] == 'アンブッシュブーツ') {
    SPOpt[0].push('3=2');SPOpt[0].push('4=2');SPOpt[0].push('7=200');SPOpt[0].push('10=15');SPOpt[0].push('79=-2');
  }
  if (He['N'] == 'トゥノブリッツヘルム' && To['N'] == 'トゥノブリッツメイル' && Gl['N'] == 'トゥノブリッツアーム' && Ku['N'] == 'トゥノブリッツクィス' && Bo['N'] == 'トゥノブリッツサバトン') {
    SPOpt[0].push('1=3');SPOpt[0].push('167=15');
    if (To['E'] >= 7) {
      SPOpt[0].push('40=0'); // 射程 未実装
      SPOpt[0].push('73=10');
      SPOpt[0].push('140=10');
    }
  }
  if (He['N'] == 'ストライクヘッド' && To['N'] == 'ストライクアーマー' && Gl['N'] == 'ストライクグローブ' && Ku['N'] == 'ストライクトラウザ' && Bo['N'] == 'ストライクブーツ') {
    SPOpt[0].push('20=5');SPOpt[0].push('79=10');
    if (To['E'] >= 7) {
      SPOpt[0].push('33=50%');
      SPOpt[0].push('69=5');
      SPOpt[0].push('145=10');
    }
  }
  if (To['N'] == 'フォビドゥンローブ' && Ku['N'] == 'フォビドゥンアルブ') {
    SPOpt[0].push('7=' + (To['E'] * 25));
    if (To['E'] >= 5) SPOpt[0].push('42=' + ((To['E'] - 4) * 2));
  }
  if (He['N'] == 'ミリテイトハット' && To['N'] == 'ミリテイトアーマー' && Gl['N'] == 'ミリテイトグローブ' && Ku['N'] == 'ミリテイトボトム' && Bo['N'] == 'ミリテイトブーツ') {
    SPOpt[0].push('6=200');SPOpt[0].push('65=15');SPOpt[0].push('69=2');
    if (To['E'] >= 7) {
      SPOpt[0].push('18=7%');
      SPOpt[0].push('41=1');
    }
  }
  if (To['N'] == 'サジェスルージュローブ' && Gl['N'] == 'サジェスルージュグローブ' && Ku['N'] == 'サジェスルージュズボン' && Bo['N'] == 'サジェスルージュブーツ') {
    SPOpt[0].push('7=5%');
    SPOpt[0].push('77=' + To['E']);
    SPOpt[0].push('138=' + (To['E'] * 2));
    SPOpt[0].push('139=' + (To['E'] * 2));
    SPOpt[0].push('140=' + (To['E'] * 2));
  }
  if (He['N'] == 'フォルニッドヘルム' && To['N'] == 'フォルニッドプレート' && Gl['N'] == 'フォルニッドガントレット' && Ku['N'] == 'フォルニッドクィス' && Bo['N'] == 'フォルニッドサバトン') {
    SPOpt[0].push('77=10');
    SPOpt[0].push('146=' + To['E']);
    if (To['E'] >= 7) {
      SPOpt[0].push('74=-10');
      SPOpt[0].push('153=255');
    }
  }
  if (He['N'] == '○○のナイトハット' && Gl['N'] == '○○のナイトグローブ') {
    if (He['E'] >= 5) {
      SPOpt[0].push('0=1');SPOpt[0].push('1=1');SPOpt[0].push('2=1');SPOpt[0].push('3=1');SPOpt[0].push('4=1');SPOpt[0].push('5=1');
    }
  }
  if (He['N'] == '○○のナイトハット' && Bo['N'] == '○○のナイトブーツ') {
    if (Bo['E'] >= 5) SPOpt[0].push('60=-5%');
  }
  if (Gl['N'] == '○○のナイトグローブ' && Bo['N'] == '○○のナイトブーツ') {
    if (Gl['E'] >= 5) SPOpt[0].push('6=200');
  }
  if (He['N'] == '○○のノーブルハット' && Gl['N'] == '○○のノーブルグローブ') {
    if (He['E'] >= 5) {
      SPOpt[0].push('0=1');SPOpt[0].push('1=1');SPOpt[0].push('2=1');SPOpt[0].push('3=1');SPOpt[0].push('4=1');SPOpt[0].push('5=1');
    }
  }
  if (He['N'] == '○○のノーブルハット' && Bo['N'] == '○○のノーブルブーツ') {
    if (Bo['E'] >= 5) SPOpt[0].push('52=-5%');
  }
  if (Gl['N'] == '○○のノーブルグローブ' && Bo['N'] == '○○のノーブルブーツ') {
    if (Gl['E'] >= 5) SPOpt[0].push('7=200');
  }
  if (He['N'] == 'グルーミストマスク' && To['N'] == 'グルーミストジャケット' && Gl['N'] == 'グルーミストグローブ' && Ku['N'] == 'グルーミストクィス' && Bo['N'] == 'グルーミストサバトン') {
    SPOpt[0].push('77=10');
    SPOpt[0].push('144=20');
    if (To['E'] >= 7) SPOpt[0].push('137=-50');
  }
  if (He['N'] == 'グルーミストマスク' && To['N'] == 'グルーミストジャケット' && Gl['N'] == 'グルーミストグローブ') {
    SPOpt[0].push('145=10');
    if (He['E'] >= 7) SPOpt[0].push('176=100');
  }
  if (Gl['N'] == 'グルーミストグローブ' && Ku['N'] == 'グルーミストクィス' && Bo['N'] == 'グルーミストサバトン') {
    SPOpt[0].push('52=-3%');
    SPOpt[0].push('6=' + (Math.floor(He['E'] / 4) * 200));
  }
  if (He['N'] == 'ダイラヌスボーン' && To['N'] == 'ダイラヌスアーマー' && Gl['N'] == 'ダイラヌスガントレット' && Ku['N'] == 'ダイラヌスパンツ' && Bo['N'] == 'ダイラヌスブーツ') {
    SPOpt[0].push('138=20');
    SPOpt[0].push('139=-20');
    if (To['E'] >= 7) SPOpt[0].push('148=100');
  }
  if (He['N'] == 'ダイラヌスボーン' && Gl['N'] == 'ダイラヌスガントレット' && Bo['N'] == 'ダイラヌスブーツ') {
    if (Gl['E'] >= 7) SPOpt[0].push('60=-15%');
  }
  if (To['N'] == 'ダイラヌスアーマー' && Ku['N'] == 'ダイラヌスパンツ' && Bo['N'] == 'ダイラヌスブーツ') {
    if (Ku['E'] >= 7) SPOpt[0].push('52=-15%');
  }
  if (He['N'] == 'ミザスタハット' && To['N'] == 'ミザスタメイル' && Gl['N'] == 'ミザスタグローブ' && Ku['N'] == 'ミザスタアルブ' && Bo['N'] == 'ミザスタブーツ') {
    SPOpt[0].push('142=10');
    if (To['E'] >= 7) SPOpt[0].push('151=255');
  }
  if (To['N'] == 'ミザスタメイル' && Gl['N'] == 'ミザスタグローブ' && Bo['N'] == 'ミザスタブーツ') {
    SPOpt[0].push('11=5');
  }
  if (He['N'] == 'ミザスタハット' && Bo['N'] == 'ミザスタブーツ') {
    SPOpt[0].push('11=5');
  }
  if (He['N'] == 'ハインドレクハット' && To['N'] == 'ハインドレクコート' && Gl['N'] == 'ハインドレクグローブ' && Ku['N'] == 'ハインドレクズボン' && Bo['N'] == 'ハインドレクブーツ') {
    SPOpt[0].push('139=20');SPOpt[0].push('140=-20');
    if (To['E'] >= 7) SPOpt[0].push('150=100');
  }
  if (He['N'] == 'ハインドレクハット' && Gl['N'] == 'ハインドレクグローブ' && Bo['N'] == 'ハインドレクブーツ') {
    if (Bo['E'] >= 7) SPOpt[0].push('60=-15%');
  }
  if (To['N'] == 'ハインドレクコート' && Ku['N'] == 'ハインドレクズボン' && Bo['N'] == 'ハインドレクブーツ') {
    if (Ku['E'] >= 7) SPOpt[0].push('52=-10%');
  }
  if (He['N'] == 'アジェイルヘッド' && To['N'] == 'アジェイルメイル' && Gl['N'] == 'アジェイルハンド' && Ku['N'] == 'アジェイルショウス' && Bo['N'] == 'アジェイルブーツ') {
    SPOpt[0].push('1=2');SPOpt[0].push('7=100');SPOpt[0].push('72=-5');
    if (To['E'] >= 7) SPOpt[0].push('30=30');
  }
  if (He['N'] == 'アジェイルヘッド' && Ku['N'] == 'アジェイルショウス' && Bo['N'] == 'アジェイルブーツ') {
    SPOpt[0].push('72=-5');SPOpt[0].push('76=-15');
  }
  if (He['N'] == 'アジェイルヘッド' && Gl['N'] == 'アジェイルハンド' && Bo['N'] == 'アジェイルブーツ') {
    SPOpt[0].push('63=20');
    if (Bo['E'] >= 7) SPOpt[0].push('72=-10');
  }
  if (He['N'] == 'ギルーガヘッド' && Gl['N'] == 'ギルーガグローブ' && Bo['N'] == 'ギルーガブーツ') {
    if (He['E'] >= 7) {
      SPOpt[0].push('1=2');SPOpt[0].push('6=200');SPOpt[0].push('7=200');
    }
  }
  if (To['N'] == '新鋭のハウバーク' && Gl['N'] == '新鋭のガントレット' && Ku['N'] == '新鋭のメイルショウス' && Bo['N'] == '新鋭のグリーブス') {
    SPOpt[0].push('75=20');
  }
  if (To['N'] == '新鋭のキュイルボイル' && Gl['N'] == '新鋭のメタルブレーサー' && Ku['N'] == '新鋭のスケイルタセット' && Bo['N'] == '新鋭のレザーブーツ') {
    SPOpt[0].push('75=20');
  }
  if (To['N'] == '新鋭のスケイルメイル' && Gl['N'] == '新鋭のメタルブレーサー' && Ku['N'] == '新鋭のフリースアルブ' && Bo['N'] == '新鋭のレザーブーツ') {
    SPOpt[0].push('75=20');
  }
  if (To['N'] == '新鋭のフリースローブ' && Gl['N'] == '新鋭のシルクグローブ' && Ku['N'] == '新鋭の祝福アルブ' && Bo['N'] == '新鋭のスエードブーツ') {
    SPOpt[0].push('75=20');
  }
  if (To['N'] == 'リチュアルペイント' && Gl['N'] == 'リチュアルハンド' && Ku['N'] == 'リチュアルレッグス' && Bo['N'] == 'リチュアルフット') {
    SPOpt[0].push('10=10');SPOpt[0].push('74=10');
  }
  if (He['N'] == 'オレガグラスターバン' && To['N'] == 'オレガグラスローブ' && Gl['N'] == 'オレガグラスグローブ' && Ku['N'] == 'オレガグラスアルブ' && Bo['N'] == 'オレガグラスブーツ') {
    SPOpt[0].push('0=3');SPOpt[0].push('6=150');SPOpt[0].push('42=5');
    if (To['E'] >= 7) SPOpt[0].push('79=-10');
  }
  if (He['N'] == 'オレガグラスターバン' && Bo['N'] == 'オレガグラスブーツ') {
    SPOpt[0].push('151=10');
  }
  if (Gl['N'] == 'オレガグラスグローブ' && Ku['N'] == 'オレガグラスアルブ' && Bo['N'] == 'オレガグラスブーツ') {
    SPOpt[0].push('142=5');
  }

  if (To['N'] == 'シャドウプレート' && Ku['N'] == 'シャドウショウス' && Ne['N'] == '影渡りのアミュレット' && Be['N'] == 'ハイスピードベルト') {
   SPOpt[0].push('1=1');SPOpt[0].push('69=4');SPOpt[0].push('73=4');SPOpt[0].push('144=3');
  }
  if (Gl['N'] == 'アースグローブ' && Be['N'] == 'アースバンド') {
    SPOpt[0].push('7=30');SPOpt[0].push('52=-2%');SPOpt[0].push('140=5');
  }
  if (Gl['N'] == '剣聖の篭手' && Be['N'] == '剣聖の腰巻') {
    SPOpt[0].push('3=1');SPOpt[0].push('62=3');SPOpt[0].push('76=-3');
  }

  if (To['N'] == 'アスティアンコート' && Gl['N'] == 'アスティアングローブ' && Ku['N'] == 'アスティアンパンツ' && Bo['N'] == 'アスティアンブーツ') {
    SPOpt[0].push('8=3');
    if (To['E'] >= 6) {
      SPOpt[0].push('0=1');
      SPOpt[0].push('6=' + (To['E'] - 5) + '%');
      SPOpt[0].push('7=' + (To['E'] - 5) + '%');
    }
  }
  if (To['N'] == 'アスティアンドレス' && Gl['N'] == 'アスティアンケイリス' && Bo['N'] == 'アスティアンパンプ') {
    SPOpt[0].push('8=3');
    if (To['E'] >= 6) {
      SPOpt[0].push('0=1');
      SPOpt[0].push('6=' + (To['E'] - 5) + '%');
      SPOpt[0].push('7=' + (To['E'] - 5) + '%');
    }
  }
  if (To['N'] == '翠色アスティアンコート' && Gl['N'] == '翠色アスティアングローブ' && Ku['N'] == '翠色アスティアンパンツ' && Bo['N'] == '翠色アスティアンブーツ') {
    SPOpt[0].push('74=5');SPOpt[0].push('76=-5');SPOpt[0].push('156=20');
    if (To['E'] >= 6) {
      SPOpt[0].push('149=' + (To['E'] - 5));
      SPOpt[0].push('151=' + (To['E'] - 5));
    }
  }
  if (To['N'] == '翠色アスティアンドレス' && Gl['N'] == '翠色アスティアンケイリス' && Bo['N'] == '翠色アスティアンパンプ') {
    SPOpt[0].push('74=5');SPOpt[0].push('76=-5');SPOpt[0].push('149=10');SPOpt[0].push('156=10');
    if (To['E'] >= 6) {
      SPOpt[0].push('149=' + (To['E'] - 5));
      SPOpt[0].push('151=' + (To['E'] - 5));
    }
  }
  if (To['N'] == '碧色アスティアンコート' && Gl['N'] == '碧色アスティアングローブ' && Ku['N'] == '碧色アスティアンパンツ' && Bo['N'] == '碧色アスティアンブーツ') {
    SPOpt[0].push('8=3');
    if (To['E'] >= 6) {
      SPOpt[0].push('5=1');
      SPOpt[0].push('7=' + ((To['E'] - 5) * 10));
    }
  }
  if (To['N'] == '碧色アスティアンドレス' && Gl['N'] == '碧色アスティアンケイリス' && Bo['N'] == '碧色アスティアンパンプ') {
    SPOpt[0].push('8=3');
    if (To['E'] >= 6) {
      SPOpt[0].push('5=1');
      SPOpt[0].push('7=' + ((To['E'] - 5) * 10));
    }
  }
  if (To['N'] == '夜色アスティアンコート' && Gl['N'] == '夜色アスティアングローブ' && Ku['N'] == '夜色アスティアンパンツ' && Bo['N'] == '夜色アスティアンブーツ') {
    SPOpt[0].push('20=5');
    if (To['E'] >= 6) SPOpt[0].push('20=' + ((To['E'] - 5) * 2));
  }
  if (To['N'] == '夜色アスティアンドレス' && Gl['N'] == '夜色アスティアンケイリス' && Bo['N'] == '夜色アスティアンパンプ') {
    SPOpt[0].push('20=5');
    if (To['E'] >= 6) SPOpt[0].push('20=' + ((To['E'] - 5) * 2));
  }
  if (To['N'] == '雪色アスティアンコート' && Gl['N'] == '雪色アスティアングローブ' && Ku['N'] == '雪色アスティアンパンツ' && Bo['N'] == '雪色アスティアンブーツ') {
    SPOpt[0].push('162=-20');
    if (To['E'] >= 6) {
      SPOpt[0].push('5=1');
      SPOpt[0].push('6=' + ((To['E'] - 5) * 5));
      SPOpt[0].push('7=' + ((To['E'] - 5) * 10));
    }
  }
  if (To['N'] == '雪色アスティアンドレス' && Gl['N'] == '雪色アスティアンケイリス' && Bo['N'] == '雪色アスティアンパンプ') {
    SPOpt[0].push('162=-20');
    if (To['E'] >= 6) {
      SPOpt[0].push('5=1');
      SPOpt[0].push('6=' + ((To['E'] - 5) * 5));
      SPOpt[0].push('7=' + (To['E'] - 5));
    }
  }
  if (To['N'] == '緋色アスティアンコート' && Gl['N'] == '緋色アスティアングローブ' && Ku['N'] == '緋色アスティアンパンツ' && Bo['N'] == '緋色アスティアンブーツ') {
    SPOpt[0].push('49=2');SPOpt[0].push('148=3');
    if (To['E'] >= 6) {
      SPOpt[0].push('18=' + (To['E'] - 5));
      SPOpt[0].push('148=' + (To['E'] - 5));
    }
  }
  if (To['N'] == '緋色アスティアンドレス' && Gl['N'] == '緋色アスティアンケイリス' && Bo['N'] == '緋色アスティアンパンプ') {
    SPOpt[0].push('148=3');
    if (To['E'] >= 6) {
      SPOpt[0].push('18=' + (To['E'] - 5));
      SPOpt[0].push('148=' + (To['E'] - 5));
    }
  }

  if (To['N'] == '芳色アスティアンコート' && Gl['N'] == '芳色アスティアングローブ' && Ku['N'] == '芳色アスティアンパンツ' && Bo['N'] == '芳色アスティアンブーツ') {
    SPOpt[0].push('6=5%');SPOpt[0].push('7=5%');SPOpt[0].push('49=3');
    if (To['E'] >= 6) SPOpt[0].push('49=' + ((To['E'] - 5) * 2));
  }
  if (To['N'] == '芳色アスティアンドレス' && Gl['N'] == '芳色アスティアンケイリス' && Bo['N'] == '芳色アスティアンパンプ') {
    SPOpt[0].push('6=5%');SPOpt[0].push('7=5%');
    if (To['E'] >= 6) SPOpt[0].push('49=' + ((To['E'] - 5) * 2));
  }
  if (To['N'] == '月色アスティアンコート' && Gl['N'] == '月色アスティアングローブ' && Ku['N'] == '月色アスティアンパンツ' && Bo['N'] == '月色アスティアンブーツ') {
    SPOpt[0].push('52=-2%');SPOpt[0].push('79=-3');
    if (To['E'] >= 6) SPOpt[0].push('42=' + (To['E'] - 5));
  }
  if (To['N'] == '月色アスティアンドレス' && Gl['N'] == '月色アスティアンケイリス' && Bo['N'] == '月色アスティアンパンプ') {
    SPOpt[0].push('52=-2%');SPOpt[0].push('79=-3');
    if (To['E'] >= 6) SPOpt[0].push('42=' + (To['E'] - 5));
  }


// ----- 武器
// ---------- モール武器
// ----- 炎
  if (We['N'] == '炎剣フレイムブレイド' || We['N'] == '炎剣レーヴァテイン' || We['N'] == '炎斧ラーバアクス' || We['N'] == '炎斧メルトカイザー' || We['N'] == '炎槍フレアスティング' || We['N'] == '炎槍ヴァーミリオンランス' || We['N'] == '炎剣サーマウス' || We['N'] == '炎爪ブレイクリーブ' || We['N'] == '炎弓レイドフェニックス' || We['N'] == '炎弓イフリートクロス' || We['N'] == '炎棍イラプションメイス' || We['N'] == '炎棍マグニートハンマー') {
    if (We['G2'] == '炎' && We['E'] >= 1) {
      if      (We['E'] >= 10) SPOpt[0].push('152=32');
      else if (We['E'] >=  6) SPOpt[0].push('152=' + ((We['E'] - 4) * 5));
      else if (We['E'] ==  5) SPOpt[0].push('152=8');
      switch (We['E']) {
        case  5: SPOpt[0].push('89=1');  break;
        case  6: SPOpt[0].push('89=3');  break;
        case  7: SPOpt[0].push('89=6');  break;
        case  8: SPOpt[0].push('89=10'); break;
        case  9: SPOpt[0].push('89=20'); break;
        case 10: SPOpt[0].push('89=35'); break;
      }
    }
  }
  if (We['N'] == '炎杖バーストワンド' || We['N'] == '炎杖イグニートロッド') {
    if (We['G2'] == '炎' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      switch (We['E']) {
        case  5: SPOpt[0].push('138=4');  break;
        case  6: SPOpt[0].push('138=6');  break;
        case  7: SPOpt[0].push('138=11'); break;
        case  8: SPOpt[0].push('138=15'); break;
        case  9: SPOpt[0].push('138=25'); break;
        case 10: SPOpt[0].push('138=40'); break;
      }
    }
  }

// ----- 氷
  if (We['N'] == '氷剣アイシクルエッジ' || We['N'] == '氷剣アイスベルグ' || We['N'] == '氷斧アバランチボルト' || We['N'] == '氷斧アイスタイラント' || We['N'] == '氷槍ヘイルスティンガー' || We['N'] == '氷槍セイレンボルグ' || We['N'] == '氷剣グラフェンス' || We['N'] == '氷爪ファンググレイシャー' || We['N'] == '氷弓フリギットムーン' || We['N'] == '氷弓マーメイドクロス' || We['N'] == '氷棍フリージングメイス' || We['N'] == '氷棍フローズンハンマー') {
    if (We['G2'] == '氷' && We['E'] >= 1) {
      if (We['E'] >= 5) SPOpt[0].push('62=' + ((We['E'] - 5) * 2));
      switch (We['E']) {
        case  5: SPOpt[0].push('91=4'); SPOpt[0].push('141=5');  break;
        case  6: SPOpt[0].push('91=6'); SPOpt[0].push('141=6');  break;
        case  7: SPOpt[0].push('91=11');SPOpt[0].push('141=12'); break;
        case  8: SPOpt[0].push('91=15');SPOpt[0].push('141=17'); break;
        case  9: SPOpt[0].push('91=25');SPOpt[0].push('141=23'); break;
        case 10: SPOpt[0].push('91=40');SPOpt[0].push('141=32'); break;
      }
    }
  }
  if (We['N'] == '氷杖フロストワンド' || We['N'] == '氷杖ブリザードロッド') {
    if (We['G2'] == '氷' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      if (We['E'] >= 7) {
        SPOpt[0].push('7=5%');
        SPOpt[0].push('7=' + ((We['E'] - 7) * 2) + '%');
      }
      switch (We['E']) {
        case  5: SPOpt[0].push('139=4');  break;
        case  6: SPOpt[0].push('139=6');  break;
        case  7: SPOpt[0].push('139=11'); break;
        case  8: SPOpt[0].push('139=15'); break;
        case  9: SPOpt[0].push('139=25'); break;
        case 10: SPOpt[0].push('139=40'); break;
      }
    }
  }

// ----- 雷
  if (We['N'] == '雷剣ライトニングエッジ' || We['N'] == '雷剣バルクレゾナンス' || We['N'] == '雷斧イクシードアクス' || We['N'] == '雷斧ブルブレイカー' || We['N'] == '雷槍レイスティング' || We['N'] == '雷槍エーンホルン' || We['N'] == '雷剣サンダースラスト' || We['N'] == '雷爪ライオットファング' || We['N'] == '雷弓グロームクレスト' || We['N'] == '雷弓ネピリムクロス' || We['N'] == '雷棍ボルティックメイス' || We['N'] == '雷棍トールハンマー') {
    tmp = Math.floor(Status['Equip'][0][0] / 10000);
    if (We['G2'] == '雷' && We['E'] >= 1) {
      switch (We['E']) {
        case  5:                     SPOpt[0].push('160=8');  break;
        case  6: SPOpt[0].push('74=2'); SPOpt[0].push('160=12'); break;
        case  7: SPOpt[0].push('74=3'); SPOpt[0].push('160=20'); break;
        case  8: SPOpt[0].push('74=5'); SPOpt[0].push('160=23'); break;
        case  9: SPOpt[0].push('74=7'); SPOpt[0].push('160=34'); break;
        case 10: SPOpt[0].push('74=10');SPOpt[0].push('160=50'); break;
      }
      if (tmp == '0' || tmp == '2' || tmp == '4' || tmp == '6' || tmp == '10') {
        if      (We['E'] >= 10) SPOpt[0].push('85=27');
        else if (We['E'] >=  7) SPOpt[0].push('85=' + ((We['E'] - 5) * 5));
        else if (We['E'] ==  6) SPOpt[0].push('85=7');
        else if (We['E'] <=  5) SPOpt[0].push('85=' + We['E']);
      } else {
        switch (We['E']) {
          case  1: SPOpt[0].push('29=1'); break;
          case  2: SPOpt[0].push('29=2'); break;
          case  3: SPOpt[0].push('29=4'); break;
          case  4: SPOpt[0].push('29=6'); break;
          case  5: SPOpt[0].push('29=9'); break;
          case  6: SPOpt[0].push('29=14'); break;
          case  7: SPOpt[0].push('29=20'); break;
          case  8: SPOpt[0].push('29=29'); break;
          case  9: SPOpt[0].push('29=41'); break;
          case 10: SPOpt[0].push('29=55'); break;
        }
      }
    }
  }
  if (We['N'] == '雷杖イジェクトワンド' || We['N'] == '雷杖クウェルロッド') {
    if (We['G2'] == '雷' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      switch (We['E']) {
        case  5: SPOpt[0].push('77=2'); SPOpt[0].push('140=4');  break;
        case  6: SPOpt[0].push('77=4'); SPOpt[0].push('140=6');  break;
        case  7: SPOpt[0].push('77=7'); SPOpt[0].push('140=11'); break;
        case  8: SPOpt[0].push('77=10');SPOpt[0].push('140=15'); break;
        case  9: SPOpt[0].push('77=14');SPOpt[0].push('140=25'); break;
        case 10: SPOpt[0].push('77=18');SPOpt[0].push('140=40'); break;
      }
    }
  }

// ----- 毒
  if (We['N'] == '邪剣ヴェノムエッジ' || We['N'] == '邪剣グランギニョール' || We['N'] == '邪斧ダムネイトアクス' || We['N'] == '邪斧グレイブディガー' || We['N'] == '邪槍ソウルリガート' || We['N'] == '邪槍フォビドゥンテイル' || We['N'] == '邪剣ファントムゲイズ' || We['N'] == '邪爪ブラッディセヴァー' || We['N'] == '邪弓ヘルファレーナ' || We['N'] == '邪弓サーペントクロス' || We['N'] == '邪棍ガロウズメイス' || We['N'] == '邪棍ドレッドノート') {
    tmp = Math.floor(Status['Equip'][0][0] / 10000);
    if (We['G2'] == '毒' && We['E'] >= 1) {
      switch (We['E']) {
        case  5:                      SPOpt[0].push('148=4');  break;
        case  6: SPOpt[0].push('119=3'); SPOpt[0].push('148=6');  break;
        case  7: SPOpt[0].push('119=12');SPOpt[0].push('148=11'); break;
        case  8: SPOpt[0].push('119=16');SPOpt[0].push('148=15'); break;
        case  9: SPOpt[0].push('119=20');SPOpt[0].push('148=25'); break;
        case 10: SPOpt[0].push('119=29');SPOpt[0].push('148=40'); break;
      }
      if (tmp == '0' || tmp == '2' || tmp == '4' || tmp == '6' || tmp == '10') {
        switch (We['E']) {
          case  1: SPOpt[0].push('13=1');  break;
          case  2: SPOpt[0].push('13=1');  break;
          case  3: SPOpt[0].push('13=2');  break;
          case  4: SPOpt[0].push('13=2');  break;
          case  5: SPOpt[0].push('13=3');  break;
          case  6: SPOpt[0].push('13=4');  break;
          case  7: SPOpt[0].push('13=6');  break;
          case  8: SPOpt[0].push('13=7');  break;
          case  9: SPOpt[0].push('13=8');  break;
          case 10: SPOpt[0].push('13=10'); break;
        }
      } else {
        switch (We['E']) {
          case  1: SPOpt[0].push('32=1'); SPOpt[0].push('184=1');  break;
          case  2: SPOpt[0].push('32=2'); SPOpt[0].push('184=2');  break;
          case  3: SPOpt[0].push('32=4'); SPOpt[0].push('184=4');  break;
          case  4: SPOpt[0].push('32=6'); SPOpt[0].push('184=6');  break;
          case  5: SPOpt[0].push('32=9'); SPOpt[0].push('184=9');  break;
          case  6: SPOpt[0].push('32=12');SPOpt[0].push('184=12'); break;
          case  7: SPOpt[0].push('32=23');SPOpt[0].push('184=23'); break;
          case  8: SPOpt[0].push('32=33');SPOpt[0].push('184=33'); break;
          case  9: SPOpt[0].push('32=40');SPOpt[0].push('184=40'); break;
          case 10: SPOpt[0].push('32=52');SPOpt[0].push('184=52'); break;
        }
      }
    }
  }
  if (We['N'] == '邪杖ペリッシュワンド' || We['N'] == '邪杖ヨルムンガルド') {
    if (We['G2'] == '毒' && We['E'] >= 1) {
      switch (We['E']) {
        case  5: SPOpt[0].push('80=3');                      SPOpt[0].push('141=4'); SPOpt[0].push('181=9');  break;
        case  6: SPOpt[0].push('80=9'); SPOpt[0].push('134=10');SPOpt[0].push('141=6'); SPOpt[0].push('181=14'); break;
        case  7: SPOpt[0].push('80=14');SPOpt[0].push('134=15');SPOpt[0].push('141=11');SPOpt[0].push('181=20'); break;
        case  8: SPOpt[0].push('80=20');SPOpt[0].push('134=25');SPOpt[0].push('141=15');SPOpt[0].push('181=29'); break;
        case  9: SPOpt[0].push('80=29');SPOpt[0].push('134=40');SPOpt[0].push('141=25');SPOpt[0].push('181=41'); break;
        case 10: SPOpt[0].push('80=41');SPOpt[0].push('134=55');SPOpt[0].push('141=40');SPOpt[0].push('181=50'); break;
      }
    }
  }

// ----- 光
  if (We['N'] == '聖剣アロンダイト' || We['N'] == '聖剣エクスカリバー' || We['N'] == '聖斧アルデオンアクス' || We['N'] == '聖斧ジークブリンガー' || We['N'] == '聖槍レディエイトランス' || We['N'] == '聖槍ブリューナク' || We['N'] == '聖剣デュランダル' || We['N'] == '聖爪ラストクルセイド' || We['N'] == '聖弓ゼノングリフ' || We['N'] == '聖弓ユニコーンクロス' || We['N'] == '聖棍エヴァンジール' || We['N'] == '聖棍ジャッジメントカリス') {
    tmp = Math.floor(Status['Equip'][0][0] / 10000);
    if (We['G2'] == '光' && We['E'] >= 1) {
      switch (We['E']) {
        case  1: SPOpt[0].push('70=-1');  break;
        case  2: SPOpt[0].push('70=-1');  break;
        case  3: SPOpt[0].push('70=-2');  break;
        case  4: SPOpt[0].push('70=-4');  break;
        case  5: SPOpt[0].push('70=-6');  break;
        case  6: SPOpt[0].push('70=-10'); break;
        case  7: SPOpt[0].push('70=-15'); break;
        case  8: SPOpt[0].push('70=-23'); break;
        case  9: SPOpt[0].push('70=-32'); break;
        case 10: SPOpt[0].push('70=-45'); break;
      }
      if (tmp == '0' || tmp == '2' || tmp == '4' || tmp == '6' || tmp == '10') {
        switch (We['E']) {
          case  6: SPOpt[0].push('162=-6');  break;
          case  7: SPOpt[0].push('162=-9');  break;
          case  8: SPOpt[0].push('162=-12'); break;
          case  9: SPOpt[0].push('162=-20'); break;
          case 10: SPOpt[0].push('162=-28'); break;
        }
      } else {
        switch (We['E']) {
          case  6: SPOpt[0].push('31=20'); break;
          case  7: SPOpt[0].push('31=29'); break;
          case  8: SPOpt[0].push('31=41'); break;
          case  9: SPOpt[0].push('31=55'); break;
          case 10: SPOpt[0].push('31=70'); break;
        }
      }
    }
  }
  if (We['N'] == '聖杖エクセリード' || We['N'] == '聖杖ハイペリオン') {
    if (We['G2'] == '光' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      switch (We['E']) {
        case  5: SPOpt[0].push('79=2'); SPOpt[0].push('143=4');  break;
        case  6: SPOpt[0].push('79=4'); SPOpt[0].push('143=6');  break;
        case  7: SPOpt[0].push('79=7'); SPOpt[0].push('143=11'); break;
        case  8: SPOpt[0].push('79=10');SPOpt[0].push('143=15'); break;
        case  9: SPOpt[0].push('79=14');SPOpt[0].push('143=25'); break;
        case 10: SPOpt[0].push('79=18');SPOpt[0].push('143=40'); break;
      }
    }
  }

// ----- 闇
  if (We['N'] == '魔剣ケイオスソード' || We['N'] == '魔剣ナイトヴァルガイズ' || We['N'] == '魔斧ラースハチェット' || We['N'] == '魔斧ダークディザスター' || We['N'] == '魔槍ヴィクティムホーン' || We['N'] == '魔槍ドレッドスピアー' || We['N'] == '魔剣アブリヴィオン' || We['N'] == '魔爪ギルティヴォイド' || We['N'] == '魔弓ドゥームウロボロス' || We['N'] == '魔弓ベリアルクロス' || We['N'] == '魔棍デモリションメイス' || We['N'] == '魔棍カルネージハンマー') {
    if (We['G2'] == '闇' && We['E'] >= 1) {
      if (We['E'] >=  6) {
        SPOpt[0].push('185=' + ((We['E'] - 5) * 5));
        SPOpt[0].push('186=100');
      }
      switch (We['E']) {
        case  1: SPOpt[0].push('109=1'); SPOpt[0].push('137=1');                       break;
        case  2: SPOpt[0].push('109=2'); SPOpt[0].push('137=3');                       break;
        case  3: SPOpt[0].push('109=3'); SPOpt[0].push('137=6');                       break;
        case  4: SPOpt[0].push('109=4'); SPOpt[0].push('137=10');                      break;
        case  5: SPOpt[0].push('109=5'); SPOpt[0].push('137=15');SPOpt[0].push('150=7');  break;
        case  6: SPOpt[0].push('109=9'); SPOpt[0].push('137=20');SPOpt[0].push('150=9');  break;
        case  7: SPOpt[0].push('109=15');SPOpt[0].push('137=26');SPOpt[0].push('150=16'); break;
        case  8: SPOpt[0].push('109=18');SPOpt[0].push('137=34');SPOpt[0].push('150=20'); break;
        case  9: SPOpt[0].push('109=29');SPOpt[0].push('137=45');SPOpt[0].push('150=30'); break;
        case 10: SPOpt[0].push('109=45');SPOpt[0].push('137=55');SPOpt[0].push('150=45'); break;
      }
    }
  }
  if (We['N'] == '魔杖クルーエルワンド' || We['N'] == '魔杖マリスロッド') {
    if (We['G2'] == '闇' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      switch (We['E']) {
        case  5: SPOpt[0].push('144=4');  break;
        case  6: SPOpt[0].push('144=6');  break;
        case  7: SPOpt[0].push('144=11'); break;
        case  8: SPOpt[0].push('144=15'); break;
        case  9: SPOpt[0].push('144=25'); break;
        case 10: SPOpt[0].push('144=40'); break;
      }
    }
  }

// ----- 虹
  if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
    if (We['G2'] == '虹' && We['E'] >= 1) {
      switch (We['E']) {
        case  6: SPOpt[0].push('69=9'); SPOpt[0].push('71=9');  break;
        case  7: SPOpt[0].push('69=12');SPOpt[0].push('71=12'); break;
        case  8: SPOpt[0].push('69=20');SPOpt[0].push('71=20'); break;
        case  9: SPOpt[0].push('69=28');SPOpt[0].push('71=28'); break;
        case 10: SPOpt[0].push('69=40');SPOpt[0].push('71=40'); break;
      }
    }
  }
  if (We['N'] == '宝杖オベロンワンド' || We['N'] == '宝杖セレスティアルロッド') {
    if (We['G2'] == '虹' && We['E'] >= 1) {
      if (We['E'] <= 3) SPOpt[0].push('42=' + We['E']);
      switch (We['E']) {
        case  4: SPOpt[0].push('42=5');                       break;
        case  5: SPOpt[0].push('42=8');                       break;
        case  6: SPOpt[0].push('42=11');SPOpt[0].push('182=2');  break;
        case  7: SPOpt[0].push('42=15');SPOpt[0].push('182=5');  break;
        case  8: SPOpt[0].push('42=21');SPOpt[0].push('182=8');  break;
        case  9: SPOpt[0].push('42=27');SPOpt[0].push('182=13'); break;
        case 10: SPOpt[0].push('42=33');SPOpt[0].push('182=19'); break;
      }
    }
  }

// ----- 蝶
  if (We['N'] == '妖剣ブラッドシェッド' || We['N'] == '妖剣フロレブランド' || We['N'] == '妖斧フィルガング' || We['N'] == '妖斧フロッティザックス' || We['N'] == '妖槍タイラントスタッブ' || We['N'] == '妖槍トランスフィクス' || We['N'] == '妖剣アステイン' || We['N'] == '妖爪ウルスラグナ' || We['N'] == '妖弓ブルートレイヴン' || We['N'] == '妖弓カルフレイン' || We['N'] == '妖棍ベリアルハンマー' || We['N'] == '妖棍シャルボルイン') {
    tmp = Math.floor(Status['Equip'][0][0] / 10000);
    if (We['G2'] == '毒' && We['E'] >= 1) {
      if (tmp == '0' || tmp == '2' || tmp == '4' || tmp == '6' || tmp == '9' || tmp == '10') {
        if (We['E'] >= 3) SPOpt[0].push('187=5');
        switch (We['E']) {
          case  3:                     SPOpt[0].push('99=1');  break;
          case  4:                     SPOpt[0].push('99=3');  break;
          case  5: SPOpt[0].push('73=3'); SPOpt[0].push('99=6');  break;
          case  6: SPOpt[0].push('73=6'); SPOpt[0].push('99=10'); break;
          case  7: SPOpt[0].push('73=10');SPOpt[0].push('99=15'); break;
          case  8: SPOpt[0].push('73=15');SPOpt[0].push('99=21'); break;
          case  9: SPOpt[0].push('73=21');SPOpt[0].push('99=28'); break;
          case 10: SPOpt[0].push('73=28');SPOpt[0].push('99=36'); break;
        }
      } else {
        if (We['E'] >= 3) SPOpt[0].push('73=5');
        if      (We['E'] >= 7) SPOpt[0].push('99=10');
        else if (We['E'] >= 5) SPOpt[0].push('99=' + ((We['E'] - 4) * 3));
        switch (We['E']) {
          case  5: SPOpt[0].push('187=3');  break;
          case  6: SPOpt[0].push('187=6');  break;
          case  7: SPOpt[0].push('187=10'); break;
          case  8: SPOpt[0].push('187=15'); break;
          case  9: SPOpt[0].push('187=21'); break;
          case 10: SPOpt[0].push('187=28'); break;
        }
      }
    }
  }
  if (We['N'] == '妖杖ファッシネイトワンド') {
    if (We['G2'] == '毒' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      if (We['E'] >= 7) SPOpt[0].push('6=5%');
      switch (We['E']) {
        case  5: SPOpt[0].push('52=-1%');  break;
        case  6: SPOpt[0].push('52=-4%');  break;
        case  7: SPOpt[0].push('52=-8%');  break;
        case  8: SPOpt[0].push('52=-13%'); break;
        case  9: SPOpt[0].push('52=-19%'); break;
        case 10: SPOpt[0].push('52=-26%'); break;
      }
    }
  }
  if (We['N'] == '妖杖ネイゲルリング') {
    if (We['G2'] == '毒' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      if (We['E'] >= 7) SPOpt[0].push('52=-5%');
      switch (We['E']) {
        case  5: SPOpt[0].push('6=4%');  break;
        case  6: SPOpt[0].push('6=8%');  break;
        case  7: SPOpt[0].push('6=13%'); break;
        case  8: SPOpt[0].push('6=19%'); break;
        case  9: SPOpt[0].push('6=26%'); break;
        case 10: SPOpt[0].push('6=34%'); break;
      }
    }
  }

// ----- 角
  if (We['N'] == '衝剣グランドジェリオ' || We['N'] == '衝剣ヴィンケルハルト' || We['N'] == '衝斧イノセンスマーダー' || We['N'] == '衝斧グローリーディケイド' || We['N'] == '衝槍アインホルン' || We['N'] == '衝槍クランヴルム' || We['N'] == '衝剣インビジブルベクター' || We['N'] == '衝爪シュティーア' || We['N'] == '衝弓ライナロック' || We['N'] == '衝弓ディスペアクライ' || We['N'] == '衝棍シュメルツ' || We['N'] == '衝棍スクイーズフィアー') {
    if (We['G2'] == '炎' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('65=' + ((We['E'] - 5) * 2));
    }
  }
  if (We['N'] == '衝杖ハーロッドコーン') {
    if (We['G2'] == '炎' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      if (We['E'] >= 7) SPOpt[0].push('17=5');
      switch (We['E']) {
        case  5: SPOpt[0].push('11=4');  break;
        case  6: SPOpt[0].push('11=8');  break;
        case  7: SPOpt[0].push('11=12'); break;
        case  8: SPOpt[0].push('11=18'); break;
        case  9: SPOpt[0].push('11=24'); break;
        case 10: SPOpt[0].push('11=30'); break;
      }
    }
  }
  if (We['N'] == '衝杖エンシェントハイル') {
    if (We['G2'] == '炎' && We['E'] >= 1) {
      if (We['E'] >= 6) SPOpt[0].push('5=2');
      if (We['E'] >= 7) SPOpt[0].push('11=7');
      switch (We['E']) {
        case  5: SPOpt[0].push('17=2');  break;
        case  6: SPOpt[0].push('17=3');  break;
        case  7: SPOpt[0].push('17=8');  break;
        case  8: SPOpt[0].push('17=14'); break;
        case  9: SPOpt[0].push('17=22'); break;
        case 10: SPOpt[0].push('17=32'); break;
      }
    }
  }

// ----- 音
  if (We['N'] == '響剣デンナーソード' || We['N'] == '響斧ヨーベルハチェット' || We['N'] == '響槍トノメータランス' || We['N'] == '響剣トレブル' || We['N'] == '響棍シュトラウス') {
    if (We['G2'] == '虹' && We['E'] >= 1) {
      SPOpt[0].push('6=' + We['E'] + '%');
      SPOpt[0].push('145=' + We['E']);
      if      (We['E'] >= 8) SPOpt[0].push('0=3');
      else if (We['E'] >= 5) SPOpt[0].push('0=2');
      else if (We['E'] >= 3) SPOpt[0].push('0=1');
      if      (We['E'] >= 8) SPOpt[0].push('107=15');
      else if (We['E'] >= 7) SPOpt[0].push('107=10');
      else if (We['E'] >= 5) SPOpt[0].push('107=5');
      else if (We['E'] <= 4) SPOpt[0].push('107=' + We['E']);
    }
  }
  if (We['N'] == '響剣サックバット' || We['N'] == '響斧エミール' || We['N'] == '響槍フォノトグラフ' || We['N'] == '響棍ヴィブラ') {
    if (We['G2'] == '虹' && We['E'] >= 1) {
      SPOpt[0].push('6=' + We['E'] + '%');
      if      (We['E'] >=  9) SPOpt[0].push('0=3');
      else if (We['E'] >=  5) SPOpt[0].push('0=2');
      else if (We['E'] >=  3) SPOpt[0].push('0=1');
      if      (We['E'] >= 10) SPOpt[0].push('108=45');
      else if (We['E'] >=  9) SPOpt[0].push('108=30');
      else if (We['E'] >=  5) SPOpt[0].push('108=' + ((We['E'] - 4) * 5));
      else if (We['E'] <=  4) SPOpt[0].push('108=' + We['E']);
      switch (We['E']) {
        case  1: SPOpt[0].push('145=1');  break;
        case  2: SPOpt[0].push('145=3');  break;
        case  3: SPOpt[0].push('145=4');  break;
        case  4: SPOpt[0].push('145=6');  break;
        case  5: SPOpt[0].push('145=7');  break;
        case  6: SPOpt[0].push('145=9');  break;
        case  7: SPOpt[0].push('145=10'); break;
        case  8: SPOpt[0].push('145=12'); break;
        case  9:
          if (We['N'] == '響槍フォノトグラフ') SPOpt[0].push('145=13');
          else                                 SPOpt[0].push('145=15');
        break;
        case 10: SPOpt[0].push('145=15'); break;
      }
    }
  }
  if (We['N'] == '響爪フォルテ' || We['N'] == '響弓アルパドッピア' || We['N'] == '響弓チンバッソアーチェ') {
    tmp = Math.floor(Status['Equip'][0][0] / 10000);
    if (We['G2'] == '虹' && We['E'] >= 1) {
      SPOpt[0].push('6=' + We['E'] + '%');
      if      (We['E'] >= 9) SPOpt[0].push('0=3');
      else if (We['E'] >= 5) SPOpt[0].push('0=2');
      else if (We['E'] >= 3) SPOpt[0].push('0=1');
      if      (We['E'] >= 8) SPOpt[0].push('107=15');
      else if (We['E'] >= 7) SPOpt[0].push('107=10');
      else if (We['E'] >= 6) {
        if (We['N'] == '響爪フォルテ') SPOpt[0].push('107=10');
        else                           SPOpt[0].push('107=5');
      } else if (We['E'] <= 5) SPOpt[0].push('107=' + We['E']);
      switch (We['E']) {
        case  1: SPOpt[0].push('145=1');  break;
        case  2: SPOpt[0].push('145=2');  break;
        case  3: SPOpt[0].push('145=3');  break;
        case  4: SPOpt[0].push('145=6');  break;
        case  5: SPOpt[0].push('145=7');  break;
        case  6: SPOpt[0].push('145=9');  break;
        case  7: SPOpt[0].push('145=10'); break;
        case  8: SPOpt[0].push('145=12'); break;
        case  9: SPOpt[0].push('145=13'); break;
        case 10: SPOpt[0].push('145=15'); break;
      }
    }
  }
  if (We['N'] == '響杖フラウトトラヴェルフ') {
    if (We['G2'] == '虹' && We['E'] >= 1) {
      if (We['E'] >= 1) SPOpt[0].push('4=' + (Math.floor((We['E'] - 1) / 2)));
      if (We['E'] >= 1) SPOpt[0].push('5=' + (Math.floor((We['E'] - 1) / 2)));
      if (We['E'] >= 6) SPOpt[0].push('158=' + ((We['E'] - 5) * 10));
      else              SPOpt[0].push('158=' + We['E']);
      SPOpt[0].push('145=' + We['E']);
    }
  }
  if (We['N'] == '響杖オルガノン') {
    if (We['G2'] == '虹' && We['E'] >= 1) {
      if (We['E'] >= 3) SPOpt[0].push('4=' + (We['E'] - 2));
      if (We['E'] >= 3) SPOpt[0].push('5=' + (We['E'] - 2));
      if (We['E'] >= 6) SPOpt[0].push('158=' + ((We['E'] - 5) * 10));
      else              SPOpt[0].push('158=' + We['E']);
      SPOpt[0].push('145=' + We['E']);
      if (We['E'] >= 10) SPOpt[0].push('145=5');
    }
  }

// ----- 碑
  if (We['N'] == '撃剣レプティス' || We['N'] == '撃斧ヴォルビリス' || We['N'] == '撃槍ティエラデントロ' || We['N'] == '撃棍サマイパタ' || We['N'] == '撃弓アタプエルカ') {
    if (We['G2'] == '雷' && We['E'] >= 1) {
      if (We['E'] <= 4) SPOpt[0].push('33=10');
      if (We['E'] >= 6) SPOpt[0].push('61=' + ((We['E'] - 5) * 5));
      switch (We['E']) {
        case  5: SPOpt[0].push('33=20');  break;
        case  6: SPOpt[0].push('33=30');  break;
        case  7: SPOpt[0].push('33=50');  break;
        case  8: SPOpt[0].push('33=80');  break;
        case  9: SPOpt[0].push('33=120'); break;
        case 10: SPOpt[0].push('33=150'); break;
      }
    }
  }
  if (We['N'] == '撃剣ミストラス' || We['N'] == '撃槍バーンチエン') {
    if (We['G2'] == '雷' && We['E'] >= 1) {
      if (We['E'] <= 4) SPOpt[0].push('33=15');
      if (We['E'] >= 6) SPOpt[0].push('61=' + ((We['E'] - 5) * 5));
      switch (We['E']) {
        case  5: SPOpt[0].push('33=30');  break;
        case  6: SPOpt[0].push('33=50');  break;
        case  7: SPOpt[0].push('33=90');  break;
        case  8: SPOpt[0].push('33=130'); break;
        case  9: SPOpt[0].push('33=180'); break;
        case 10: SPOpt[0].push('33=240'); break;
      }
    }
  }
  if (We['N'] == '撃斧ジュガンティーヤ' || We['N'] == '撃棍セネガンビア') {
    if (We['G2'] == '雷' && We['E'] >= 1) {
      if (We['E'] <= 3) SPOpt[0].push('33=15');
      if (We['E'] >= 6) SPOpt[0].push('61=' + ((We['E'] - 5) * 5));
      switch (We['E']) {
        case  4: SPOpt[0].push('33=30');  break;
        case  5: SPOpt[0].push('33=40');  break;
        case  6: SPOpt[0].push('33=60');  break;
        case  7: SPOpt[0].push('33=100'); break;
        case  8: SPOpt[0].push('33=160'); break;
        case  9: SPOpt[0].push('33=210'); break;
        case 10: SPOpt[0].push('33=300'); break;
      }
    }
  }
  if (We['N'] == '撃剣スオメリンナ' || We['N'] == '撃爪バンディアガラ' || We['N'] == '撃弓クロミルーシュ') {
    if (We['G2'] == '雷' && We['E'] >= 1) {
      if (We['E'] <= 4) SPOpt[0].push('33=5');
      if (We['E'] >= 6) SPOpt[0].push('61=' + ((We['E'] - 5) * 5));
      switch (We['E']) {
        case  5: SPOpt[0].push('33=10');  break;
        case  6: SPOpt[0].push('33=20');  break;
        case  7: SPOpt[0].push('33=40');  break;
        case  8: SPOpt[0].push('33=60');  break;
        case  9: SPOpt[0].push('33=80');  break;
        case 10: SPOpt[0].push('33=100'); break;
      }
    }
  }
  if (We['N'] == '撃杖キュレネ') {
    if (We['G2'] == '雷' && We['E'] >= 1) {
      if (We['E'] <= 5) SPOpt[0].push('74=2');
      if (We['E'] >= 5) SPOpt[0].push('61=' + ((We['E'] - 5) * 5));
      switch (We['E']) {
        case  6: SPOpt[0].push('74=3'); break;
        case  7: SPOpt[0].push('74=5'); break;
        case  8: SPOpt[0].push('74=7'); break;
        case  9: SPOpt[0].push('74=10'); break;
        case 10: SPOpt[0].push('74=15'); break;
      }
    }
  }
  if (We['N'] == '撃杖エローラ') {
    if (We['G2'] == '雷' && We['E'] >= 1) {
      if (We['E'] <= 4) SPOpt[0].push('183=5');
      if (We['E'] >= 5) SPOpt[0].push('61=' + ((We['E'] - 5) * 5));
      switch (We['E']) {
        case  5: SPOpt[0].push('183=10'); break;
        case  6: SPOpt[0].push('183=15'); break;
        case  7: SPOpt[0].push('183=25'); break;
        case  8: SPOpt[0].push('183=35'); break;
        case  9: SPOpt[0].push('183=45'); break;
        case 10: SPOpt[0].push('183=60'); break;
      }
    }
  }

// ----- 華
  if (We['N'] == '華剣ラフェンガル' || We['N'] == '華斧ジギータス' || We['N'] == '華槍ブレラウッド' || We['N'] == '華弓バームゼリカ' || We['N'] == '華棍ガランモル') {
    if (We['G2'] == '光' && We['E'] >= 1) {
      if (We['E'] <= 4) SPOpt[0].push('103=' + We['E']);
      switch (We['E']) {
        case  5: SPOpt[0].push('103=8');  break;
        case  6: SPOpt[0].push('103=10'); break;
        case  7: SPOpt[0].push('103=16'); break;
        case  8: SPOpt[0].push('103=25'); break;
        case  9: SPOpt[0].push('103=35'); break;
        case 10: SPOpt[0].push('103=45'); break;
      }
    }
  }
  if (We['N'] == '華剣イベリーフ' || We['N'] == '華槍レーモグラス') {
    if (We['G2'] == '光' && We['E'] >= 1) {
      if (We['E'] <= 6) SPOpt[0].push('103=' + We['E']);
      switch (We['E']) {
        case  7: SPOpt[0].push('104=12'); break;
        case  8: SPOpt[0].push('104=18'); break;
        case  9: SPOpt[0].push('104=25'); break;
        case 10: SPOpt[0].push('104=30'); break;
      }
    }
  }
  if (We['N'] == '華斧ボアハウド' || We['N'] == '華棍キプトニップ') {
    if (We['G2'] == '光' && We['E'] >= 1) {
      if (We['E'] <= 4) SPOpt[0].push('103=' + We['E']);
      switch (We['E']) {
        case  5: SPOpt[0].push('104=8');  break;
        case  6: SPOpt[0].push('104=10'); break;
        case  7: SPOpt[0].push('104=16'); break;
        case  8: SPOpt[0].push('104=25'); break;
        case  9: SPOpt[0].push('104=35'); break;
        case 10: SPOpt[0].push('104=45'); break;
      }
    }
  }
  if (We['N'] == '華剣セイバリス' || We['N'] == '華爪ベンヘルーダ' || We['N'] == '華弓ダマスティハ') {
    if (We['G2'] == '光' && We['E'] >= 1) {
      if (We['E'] <= 6) SPOpt[0].push('103=' + We['E']);
      switch (We['E']) {
        case  7: SPOpt[0].push('103=12'); break;
        case  8: SPOpt[0].push('103=18'); break;
        case  9: SPOpt[0].push('103=25'); break;
        case 10: SPOpt[0].push('103=30'); break;
      }
    }
  }
  if (We['N'] == '華杖エキマセナ') {
    if (We['G2'] == '光' && We['E'] >= 1) {
      SPOpt[0].push('4=' + (Math.ceil(We['E'] / 2)));
      if (We['E'] >= 6) SPOpt[0].push('156=' + ((We['E'] - 5) * 5));
      else              SPOpt[0].push('156=' + We['E']);
      if (We['E'] <= 5) SPOpt[0].push('70=-' + We['E']);
      switch (We['E']) {
        case  6: SPOpt[0].push('70=-9');  break;
        case  7: SPOpt[0].push('70=-12'); break;
        case  8: SPOpt[0].push('70=-20'); break;
        case  9: SPOpt[0].push('70=-28'); break;
        case 10: SPOpt[0].push('70=-40'); break;
      }
    }
  }
  if (We['N'] == '華杖ラジョラム') {
    if (We['G2'] == '光' && We['E'] >= 1) {
      SPOpt[0].push('3=' + (Math.ceil(We['E'] / 2)));
      if (We['E'] >= 6) SPOpt[0].push('156=' + ((We['E'] - 5) * 10));
      else              SPOpt[0].push('156=' + We['E']);
      if      (We['E'] >= 7) SPOpt[0].push('70=-' + ((We['E'] - 6) * 10));
      else if (We['E'] >= 4) SPOpt[0].push('70=-' + ((We['E'] - 3) * 5));
      else                   SPOpt[0].push('70=-' + We['E']);
    }
  }
// ---------- モール武器 ここまで

  if (We['N'] == '斬馬刀真打' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('85=10');
    if (We['E'] >= 8) SPOpt[0].push('180=20');
  }
  if (We['N'] == 'トートズビーク' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('18=5%');
    if (We['E'] >= 8) SPOpt[0].push('18=10%');
  }
  if (We['N'] == 'ブラッディサイス' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('71=100');
    if (We['E'] >= 8) SPOpt[0].push('71=100');
  }
  if (We['N'] == 'ナイトランス' && We['E'] >= 1) {
    if (We['E'] >= 7 && We['G2'] == '光') {
      SPOpt[0].push('18=10%');
      SPOpt[0].push('49=5%');
    }
  }
  if (We['N'] == 'ロイヤルホーン' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('11=20');
    if (We['E'] >= 8) SPOpt[0].push('79=-5');
  }
  if (We['N'] == 'ゼピュロスＲ' && We['E'] >= 1) {
    if (We['E'] >= 5) SPOpt[0].push('33=20%');
  }
  if (We['N'] == 'ゼピュロスＳＲ' && We['E'] >= 1) {
    if (We['E'] >= 5) SPOpt[0].push('33=20%');
    if (We['E'] >= 7) SPOpt[0].push('33=30%');
  }
  if (We['N'] == 'トリアイナ' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('95=7');
    if (We['E'] >= 8) SPOpt[0].push('76=-25');
  }
  if (We['N'] == 'フレイムタン' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('138=10');
    if (We['E'] >= 8) SPOpt[0].push('138=20');
  }
  if (We['N'] == 'らいおんはんど' && We['E'] >= 1) {
    SPOpt[0].push('73=' + We['E']);
    SPOpt[0].push('33=' + (We['E'] * 2) + '%');
  }
  if (We['N'] == 'きゃっとはんど' && We['E'] >= 1) {
    if (We['E'] >= 3) SPOpt[0].push('74=5');
    if (We['E'] >= 7) SPOpt[0].push('75=15');
  }
  if (We['N'] == 'ハヌマット' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('30=20');
    if (We['E'] >= 8) SPOpt[0].push('30=20');
  }
  if (We['N'] == 'ハラダヌ' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('73=10');
    if (We['E'] >= 8) SPOpt[0].push('73=10');
  }
  if (We['N'] == 'トレビュシェット' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('86=15');
    if (We['E'] >= 8) SPOpt[0].push('95=10');
  }
  if (We['N'] == 'ヘッドクラッシャー' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('69=2');
    if (We['E'] >= 8) SPOpt[0].push('123=5');
  }
  if (We['N'] == 'ヴェテランモール' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('40=0'); // 射程 未実装
    if (We['E'] >= 8) SPOpt[0].push('91=0'); // 気絶 未実装
  }
  if (We['N'] == 'ヴァンピッシュワンド' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('33=30%');
    if (We['E'] >= 8) SPOpt[0].push('4=7');
  }
  if (We['N'] == 'ノスフェラトゥワンド' && We['E'] >= 1) {
    SPOpt[0].push('77=' + (Math.floor(We['E'] / 2)));
    SPOpt[0].push('42=' + (Math.floor(We['E'] / 3) * 3));
  }
  if (We['N'] == 'ゴールデンバット' && We['E'] >= 1) {
    if (We['E'] >= 6) SPOpt[0].push('16=0');
    if (We['E'] >= 8) SPOpt[0].push('16=0');
  }

// ----- 盾
  if (Sh['N'] == 'セントリーガード' && Sh['E'] >= 1) {
    SPOpt[0].push('138=' + (Math.floor(Sh['E'] / 3) * 3));
    SPOpt[0].push('139=' + (Math.floor(Sh['E'] / 3) * 2));
  }
  if (Sh['N'] == 'セラピーシールド' && Sh['E'] >= 1) {
    SPOpt[0].push('11=' + (Math.floor(Sh['E'] / 3) * 3));
  }
  if (Sh['N'] == 'プリトウェン' && Sh['E'] >= 1) {
    if (Sh['E'] >= 7 && Sh['G2'] == '光') SPOpt[0].push('11=10');
  }
  if (Sh['N'] == 'スパイクシールド' && Sh['E'] >= 1) {
    SPOpt[0].push('18=' + (Math.floor(Sh['E'] / 3)) + '%');
    SPOpt[0].push('145=' + (Math.floor(Sh['E'] / 2)));
  }
  if (Sh['N'] == 'ガノイドシールド' && Sh['E'] >= 1) {
    if (Sh['E'] >= 6) SPOpt[0].push('70=-3');
  }
  if (Sh['N'] == 'バリアントシールド' && Sh['E'] >= 1) {
    if (Sh['E'] >= 3) SPOpt[0].push('68=0'); // 魔法回避率 未実装
    if (Sh['E'] >= 7) SPOpt[0].push('68=0'); // 魔法回避率 未実装
  }
  if (Sh['N'] == 'オルクディスガード' && Sh['E'] >= 1) {
    SPOpt[0].push('137=' + (Math.floor(Sh['E'] / 3) * -1));
  }
  if (Sh['N'] == 'トゥインクルリフレクター' && Sh['E'] >= 1) {
    if (Sh['E'] >= 7) SPOpt[0].push('67=7');
  }
  if (Sh['N'] == 'グレートシールド' && Sh['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(Sh['E'] / 3) * 100));
    if (Sh['E'] >= 7) SPOpt[0].push('50=-5');
  }
  if (Sh['N'] == 'ジェリドシールド' && Sh['E'] >= 1) {
    SPOpt[0].push('139=' + (Math.floor(Sh['E'] / 2)));
    if (Sh['E'] >= 7) {
      SPOpt[0].push('138=5');
      SPOpt[0].push('139=10');
      SPOpt[0].push('150=10');
    }
  }
  if (Sh['N'] == 'フォルス' && Sh['E'] >= 1) {
    SPOpt[0].push('70=-' + Sh['E']);
  }
  if (Sh['N'] == 'クロワール' && Sh['E'] >= 1) {
    SPOpt[0].push('66=' + Sh['E']);
  }
  if (Sh['N'] == 'ジュスティス' && Sh['E'] >= 1) {
    SPOpt[0].push('65=' + Sh['E'] + '%');
  }
  if (Sh['N'] == 'サンセール' && Sh['E'] >= 1) {
    SPOpt[0].push('68=' + Sh['E']);
  }
  if (Sh['N'] == 'アドラシオン' && Sh['E'] >= 1) {
    SPOpt[0].push('65=' + (Math.floor(Sh['E'] / 2)));
    SPOpt[0].push('66=' + (Math.floor(Sh['E'] / 2)));
    SPOpt[0].push('68=' + (Math.floor(Sh['E'] / 2)));
    SPOpt[0].push('70=-' + (Math.floor(Sh['E'] / 2)));
  }
  if (Sh['N'] == 'エンディングシールド' && Sh['E'] >= 1) {
    if (Sh['E'] >= 7) SPOpt[0].push('158=20');
  }

// ----- ヘルメット
  if (He['N'] == 'パットハット' && He['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(He['E'] / 3) * 100));
  }
  if (He['N'] == 'ファイアリィヘッド' && He['E'] >= 1) {
    SPOpt[0].push('148=' + (Math.floor(He['E'] / 3) * 3));
  }
  if (He['N'] == 'アルカナサークレット' && He['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(He['E'] / 3) * 100));
    SPOpt[0].push('7=' + (Math.floor(He['E'] / 3) * 100));
  }
  if (He['N'] == 'ウェイストハット' && He['E'] >= 1) {
    SPOpt[0].push('160=' + (Math.floor(He['E'] / 3) * 6));
  }
  if (He['N'] == 'ダズリングヘッド' && He['E'] >= 1) {
    SPOpt[0].push('142=' + (Math.floor(He['E'] / 3) * 5));
  }
  if (He['N'] == 'セリーンティアラ' && He['E'] >= 1) {
    if (He['E'] >= 6) SPOpt[0].push('5=1');
    if (He['E'] >= 8) SPOpt[0].push('42=8');
  }
  if (He['N'] == 'スイートキャップ' && He['E'] >= 1) {
    if (He['E'] >= 7) SPOpt[0].push('142=5');
  }
  if (He['N'] == 'チコチコ帽子' && He['E'] >= 1) {
    if (He['E'] >= 7) SPOpt[0].push('68=10');
  }
  if (He['N'] == '英知のメガネ' && He['E'] >= 1) {
    if (He['E'] >= 7) SPOpt[0].push('149=5');
  }
  if (He['N'] == 'エイミンググラス' && He['E'] >= 1) {
    if (He['E'] >= 7) SPOpt[0].push('142=5');
  }
  if (He['N'] == '探偵帽子' && He['E'] >= 1) {
    SPOpt[0].push('5=' + (Math.floor(He['E'] / 4)));
  }
  if (He['N'] == '名探偵帽子' && He['E'] >= 1) {
    SPOpt[0].push('5=' + (Math.floor(He['E'] / 4)));
  }
  if (He['N'] == '情熱のメガネ' && He['E'] >= 1) {
    if (He['E'] >= 7) SPOpt[0].push('148=5');
  }
  if (He['N'] == 'クルデュークハット' && He['E'] >= 1) {
    SPOpt[0].push('69=' + (Math.floor(He['E'] / 3)));
    SPOpt[0].push('138=' + (Math.floor(He['E'] / 3) * 4));
  }
  if (He['N'] == 'サクラメント' && He['E'] >= 1) {
    SPOpt[0].push('77=' + (Math.floor(He['E'] / 3) * 2));
  }
  if (He['N'] == 'レジスタンスヘッド' && He['E'] >= 1) {
    if (He['E'] >= 7) SPOpt[0].push('68=5');
  }
  if (He['N'] == 'プリウスハット' && He['E'] >= 1) {
    SPOpt[0].push('42=' + (Math.floor(He['E'] / 3) * 2));
    if (He['E'] >= 7) SPOpt[0].push('76=-5');
  }
  if (He['N'] == 'ガノイドハット' && He['E'] >= 1) {
    if (He['E'] >= 6) SPOpt[0].push('70=-3');
  }
  if (He['N'] == 'ファルコンマスク' && He['E'] >= 1) {
    SPOpt[0].push('62=' + (Math.floor(He['E'] / 2) * 2));
  }
  if (He['N'] == 'ヴィヤグラマスク' && He['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(He['E'] / 2) * 50));
  }
  if (He['N'] == 'ホワイトチャームキャップ' && He['E'] >= 1) {
    SPOpt[0].push('158=' + (Math.floor(He['E'] / 3) * 5));
  }
  if (He['N'] == 'ブラウンキュートキャップ' && He['E'] >= 1) {
    SPOpt[0].push('149=' + (Math.floor(He['E'] / 3) * 3));
  }
  if (He['N'] == 'ゴールドヘルム' && He['E'] >= 1) {
    if (He['E'] >= 5) SPOpt[0].push('76=' + ((He['E'] - 4) * -5));
  }
  if (He['N'] == 'ディバインハット' && He['E'] >= 1) {
    SPOpt[0].push('62=' + (Math.floor(He['E'] / 3) * 5));
    SPOpt[0].push('77=' + (Math.floor(He['E'] / 3) * 3));
  }
  if (He['N'] == 'バリアントヘルム' && He['E'] >= 1) {
    SPOpt[0].push('62=' + (Math.floor(He['E'] / 2) * 4) + '%');
    if (He['E'] >= 5) SPOpt[0].push('6=' + ((He['E'] - 4) * 50));
  }
  if (He['N'] == 'ストライクヘッド' && He['E'] >= 1) {
    if (He['E'] >= 5) {
      SPOpt[0].push('149=10');
      SPOpt[0].push('149=' + ((He['E'] - 5) * 4));
    }
  }
  if (He['N'] == 'ミリテイトハット' && He['E'] >= 1) {
    if (He['E'] >= 5) SPOpt[0].push('77=' + ((He['E'] - 4) * 2));
  }
  if (He['N'] == 'フォルニッドヘルム' && He['E'] >= 1) {
    SPOpt[0].push('7=' + (He['E'] * 10));
    if (He['E'] >= 3) {
      SPOpt[0].push('6=' + (Math.floor((He['E'] - 3) / 2)) + '%');
      SPOpt[0].push('49=' + (Math.floor((He['E'] - 3) / 2)));
    }
  }
  if (
    He['N'] == 'カリブーフード'
 || He['N'] == 'ラビットフード'
 || He['N'] == 'チビ用ラビットフード'
 && He['E'] >= 1
  ) {
    SPOpt[0].push('139=' + (Math.floor(He['E'] / 2) * 5));
  }
  if (He['N'] == '○○のナイトハット' && He['E'] >= 1) {
    SPOpt[0].push('65=' + (Math.floor(He['E'] / 3) * 2));
    if (He['E'] >= 7) SPOpt[0].push('79=-5');
  }
  if (He['N'] == '○○のノーブルハット' && He['E'] >= 1) {
    SPOpt[0].push('145=' + (Math.floor(He['E'] / 3) * 2));
    if (He['E'] >= 7) SPOpt[0].push('79=-5');
  }
  if (He['N'] == 'ならず者の鉄仮面' && He['E'] >= 1) {
    SPOpt[0].push('1=' + (Math.floor(He['E'] / 3)));
  }
  if (He['N'] == 'グルーミストマスク' && He['E'] >= 1) {
    SPOpt[0].push('77=' + (Math.floor(He['E'] / 2)));
    if (He['E'] >= 5) SPOpt[0].push('5=1');
  }
  if (He['N'] == 'ダイラヌスボーン' && He['E'] >= 1) {
    SPOpt[0].push('162=-' + He['E']);
    if (He['E'] >= 7) SPOpt[0].push('79=-3');
  }
  if (He['N'] == '砂漠のターバン' && He['E'] >= 1) {
    SPOpt[0].push('138=' + (Math.floor(He['E'] / 2) * 3));
    SPOpt[0].push('139=' + (Math.floor(He['E'] / 2) * 2));
    if (He['E'] >= 7) SPOpt[0].push('162=-10');
  }
  if (He['N'] == 'ミザスタハット' && He['E'] >= 1) {
    SPOpt[0].push('156=' + (Math.floor(He['E'] / 3) * 3));
    if (He['E'] >= 5) SPOpt[0].push('5=1');
  }
  if (He['N'] == 'ハインドレクハット' && He['E'] >= 1) {
    SPOpt[0].push('62=' + He['E'] + '%');
    if (He['E'] >= 7) SPOpt[0].push('69=2');
  }
  if (He['N'] == 'アジェイルヘッド' && He['E'] >= 1) {
    SPOpt[0].push('73=' + He['E']);
    if (He['E'] >= 5) {
      SPOpt[0].push('76=-2');
      SPOpt[0].push('76=' + ((He['E'] - 4) * -2));
    }
  }
  if (He['N'] == 'ワーミッロガレア' && He['E'] >= 1) {
    SPOpt[0].push('52=-' + (Math.floor(He['E'] / 3) * 3));
  }
  if (He['N'] == 'エデューロスフード' && He['E'] >= 1) {
    if (He['E'] >= 7) SPOpt[0].push('76=-7');
  }
  if (He['N'] == 'グレートヘルム' && He['E'] >= 1) {
    SPOpt[0].push('149=' + He['E']);
    if (He['E'] >= 5) SPOpt[0].push('72=-2');
  }
  if (He['N'] == 'ギルーガヘッド' && He['E'] >= 1) {
    SPOpt[0].push('7=' + (He['E'] * 10));
    SPOpt[0].push('71=' + Math.floor(He['E'] / 2));
  }
  if (He['N'] == '木霊のリース' && He['E'] >= 1) {
    if (He['E'] >= 5) SPOpt[0].push('45=5');
  }
  if (He['N'] == 'オレガグラスターバン' && He['E'] >= 1) {
    if (He['E'] >= 3) SPOpt[0].push('6=100');
    if (He['E'] >= 7) SPOpt[0].push('162=-15');
  }
  if (He['N'] == 'レイドサレット' && He['E'] >= 1) {
    if (He['E'] >= 3) SPOpt[0].push('156=-' + (Math.floor(He['E'] / 3) * 5));
    if (He['E'] >= 7) SPOpt[0].push('70=-4');
  }

// ----- トーソ
  if (To['N'] == 'パトリシアンベスト' && To['E'] >= 1) {
    if (To['E'] >= 6) {
      SPOpt[0].push('138=8');
      SPOpt[0].push('139=8');
      SPOpt[0].push('140=8');
      SPOpt[0].push('141=8');
      SPOpt[0].push('142=8');
      SPOpt[0].push('143=8');
      SPOpt[0].push('144=8');
    }
    if (To['E'] >= 8) {
      SPOpt[0].push('138=12');
      SPOpt[0].push('139=12');
      SPOpt[0].push('140=12');
      SPOpt[0].push('141=12');
      SPOpt[0].push('142=12');
      SPOpt[0].push('143=12');
      SPOpt[0].push('144=12');
    }
  }
  if (To['N'] == 'スイートコート' && To['E'] >= 1) {
    SPOpt[0].push('156=' + (Math.floor(To['E'] / 3) * 5));
  }
  if (To['N'] == 'ホワイトチャームコート' && To['E'] >= 1) {
    SPOpt[0].push('146=' + (Math.floor(To['E'] / 3) * 3));
  }
  if (To['N'] == 'ブラウンキュートコート' && To['E'] >= 1) {
    SPOpt[0].push('62=' + (Math.floor(To['E'] / 3) * 2));
  }
  if (To['N'] == 'ゴールドプレート' && To['E'] >= 1) {
    if (To['E'] >= 5) {
      SPOpt[0].push('52=-2%');
      SPOpt[0].push('52=-' + ((To['E'] - 4) * 2) + '%');
    }
  }
  if (To['N'] == 'バリアントプレート' && To['E'] >= 1) {
    SPOpt[0].push('6=' + To['E'] + '%');
    if (To['E'] >= 5) SPOpt[0].push('49=' + ((To['E'] - 4) * 3));
  }
  if (To['N'] == 'アスティアンコート' && To['E'] >= 1) {
    SPOpt[0].push('6=' + To['E']);
  }
  if (To['N'] == 'アスティアンドレス' && To['E'] >= 1) {
    SPOpt[0].push('6=' + To['E']);
    SPOpt[0].push('7=' + To['E']);
  }
  if (To['N'] == '雪色アスティアンコート' && To['E'] >= 1) {
    SPOpt[0].push('6=' + To['E']);
  }
  if (To['N'] == '雪色アスティアンドレス' && To['E'] >= 1) {
    SPOpt[0].push('6=' + To['E']);
    SPOpt[0].push('7=' + (To['E'] * 2));
  }
  if (To['N'] == 'トゥノブリッツメイル' && To['E'] >= 1) {
    if (To['E'] >= 5) SPOpt[0].push('6=' + ((To['E'] - 4) * 50));
  }
  if (To['N'] == 'ストライクアーマー' && To['E'] >= 1) {
    SPOpt[0].push('11=' + (Math.floor(To['E'] / 3) * 2));
    if (To['E'] >= 5) {
      SPOpt[0].push('6=100');
      SPOpt[0].push('6=' + ((To['E'] - 4) * 50));
    }
  }
  if (To['N'] == 'フォビドゥンローブ' && To['E'] >= 1) {
    SPOpt[0].push('7=' + (Math.floor(To['E'] / 2) * 50));
    SPOpt[0].push('42=' + (Math.floor(To['E'] / 2) * 2));
  }
  if (To['N'] == 'ファルコンジャケット' && To['E'] >= 1) {
    if (To['E'] >= 5) SPOpt[0].push('151=' + ((To['E'] - 4) * 2));
  }
  if (To['N'] == 'ミリテイトアーマー' && To['E'] >= 1) {
    SPOpt[0].push('69=' + (Math.floor(To['E'] / 3)));
  }
  if (To['N'] == 'サジェスルージュローブ' && To['E'] >= 1) {
    SPOpt[0].push('5=' + (Math.floor(To['E'] / 3)));
    SPOpt[0].push('77=' + To['E']);
    if (To['E'] >= 5) SPOpt[0].push('144=' + (Math.floor((To['E'] - 4) / 3)));
    if (To['E'] >= 8) SPOpt[0].push('142=5');
  }
  if (To['N'] == 'フォルニッドプレート' && To['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(To['E'] / 3) * 4) + '%');
    SPOpt[0].push('70=' + (Math.floor(To['E'] / 3) * -3));
  }
  if (To['N'] == 'オーナメントローブ' && To['E'] >= 1) {
    if (To['E'] >= 5) SPOpt[0].push('8=' + ((To['E'] - 4) * 5));
  }
  if (To['N'] == 'グルーミストジャケット' && To['E'] >= 1) {
    SPOpt[0].push('4=' + (Math.floor(To['E'] / 4)));
    if (To['E'] >= 7) SPOpt[0].push('42=4');
  }
  if (To['N'] == 'ダイラヌスアーマー' && To['E'] >= 1) {
    SPOpt[0].push('6=' + To['E'] + '%');
    if (To['E'] >= 7) SPOpt[0].push('2=1');
  }
  if (To['N'] == 'ミザスタメイル' && To['E'] >= 1) {
    if (To['E'] >= 5) SPOpt[0].push('6=200');
    SPOpt[0].push('157=' + (Math.floor(To['E'] / 2) * 3));
  }
  if (To['N'] == 'ハインドレクコート' && To['E'] >= 1) {
    SPOpt[0].push('7=' + (To['E'] * 10));
    if (To['E'] >= 7) {
      SPOpt[0].push('62=15%');
      SPOpt[0].push('65=-10%');
    }
  }
  if (To['N'] == 'アジェイルメイル' && To['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(To['E'] / 2) * 50));
    SPOpt[0].push('73=' + To['E']);
    SPOpt[0].push('156=' + (Math.floor(To['E'] / 2) * 3));
    if (To['E'] >= 7) SPOpt[0].push('142=5');
    if (To['E'] >= 3) SPOpt[0].push('41=' + ((To['E'] - 2) * 1));
  }
  if (To['N'] == 'ギルーガアーマー' && To['E'] >= 1) {
    SPOpt[0].push('71=' + Math.floor(To['E'] / 2));
  }
  if (To['N'] == 'リチュアルペイント' && To['E'] >= 1) {
    SPOpt[0].push('141=' + Math.floor(To['E'] / 2));
    if (To['E'] >= 5) SPOpt[0].push('76=-10');
  }
  if (To['N'] == 'オレガグラスローブ' && To['E'] >= 1) {
    if (To['E'] >= 3) SPOpt[0].push('42=5');
    if (To['E'] >= 7) SPOpt[0].push('79=-5');
  }

// ----- グローブ
  if (Gl['N'] == 'ファイングローブ' && Gl['E'] >= 1) {
    if (Gl['E'] >= 7) {
      SPOpt[0].push('5=1');SPOpt[0].push('145=4');
    }
  }
  if (Gl['N'] == 'ルーナグローブ' && Gl['E'] >= 1) {
    if (Gl['E'] >= 7) {
      SPOpt[0].push('5=1');SPOpt[0].push('42=4');
    }
  }
  if (Gl['N'] == 'ストロングブレーサー' && Gl['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(Gl['E'] / 3) * 100));
    SPOpt[0].push('138=' + (Math.floor(Gl['E'] / 3) * 3));
    SPOpt[0].push('139=' + (Math.floor(Gl['E'] / 3) * 2));
  }
  if (Gl['N'] == 'マナブレスレット' && Gl['E'] >= 1) {
    SPOpt[0].push('7=' + (Math.floor(Gl['E'] / 3) * 30));
  }
  if (Gl['N'] == 'スペルバウンドグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('4=' + (Math.floor(Gl['E'] / 3)));
  }
  if (Gl['N'] == 'シレスチャルブレス' && Gl['E'] >= 1) {
    SPOpt[0].push('11=' + (Math.floor(Gl['E'] / 3) * 3));
  }
  if (Gl['N'] == 'ソーサリーグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('42=' + (Math.floor(Gl['E'] / 4)));
  }
  if (Gl['N'] == 'プッカパーム' && Gl['E'] >= 1) {
    if (Gl['E'] >= 6) SPOpt[0].push('65=7');
    if (Gl['E'] >= 8) SPOpt[0].push('68=7');
  }
  if (Gl['N'] == 'グロリアスブレーサー' && Gl['E'] >= 1) {
    if (Gl['E'] >= 7) SPOpt[0].push('6=200');
  }
  if (Gl['N'] == 'ブレイズグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('138=' + (Math.floor(Gl['E'] / 3) * 3));
  }
  if (Gl['N'] == 'シャドウグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('20=' + (Math.floor(Gl['E'] / 3) * 2));
    SPOpt[0].push('140=' + (Math.floor(Gl['E'] / 3) * 2));
  }
  if (Gl['N'] == 'ワイズグローブ' && Gl['E'] >= 1) {
    if (Gl['E'] >= 7) SPOpt[0].push('6=100');
    SPOpt[0].push('156=' + (Math.floor(Gl['E'] / 3) * 5));
  }
  if (Gl['N'] == 'ソリッドブレーサー' && Gl['E'] >= 1) {
    SPOpt[0].push('133=' + (Math.floor(Gl['E'] / 3) * 3));
    SPOpt[0].push('0=' + (Math.floor(Gl['E'] / 4)));
  }
  if (Gl['N'] == 'ナーガグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('141=' + (Math.floor(Gl['E'] / 3) * 3));
  }
  if (Gl['N'] == 'スパイクグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('145=' + (Math.floor(Gl['E'] / 2)));
    SPOpt[0].push('18=' + (Math.floor(Gl['E'] / 3) * 2));
  }
  if (Gl['N'] == 'ガノイドグローブ' && Gl['E'] >= 1) {
    if (Gl['E'] >= 6) SPOpt[0].push('70=-3');
  }
  if (Gl['N'] == 'ヴィヤグラグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('18=' + (Math.floor(Gl['E'] / 3) * 2) + '%');
  }
  if (Gl['N'] == 'ファルコングローブ' && Gl['E'] >= 1) {
    if (Gl['E'] >= 7) SPOpt[0].push('41=0');
  }
  if (Gl['N'] == 'エレクトロニックグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(Gl['E'] / 3) * 50));
  }
  if (Gl['N'] == '梵天の篭手' && Gl['E'] >= 1) {
    SPOpt[0].push('158=' + (Math.floor(Gl['E'] / 3) * 3));
  }
  if (Gl['N'] == 'ゴールドガントレット' && Gl['E'] >= 1) {
    if (Gl['E'] >= 5) {
      SPOpt[0].push('18=2%');
      SPOpt[0].push('18=' + (Math.floor(Gl['E'] / 3) * 2) + '%');
    }
  }
  if (Gl['N'] == 'ディバインブレーサー' && Gl['E'] >= 1) {
    SPOpt[0].push('11=' + (Math.floor(Gl['E'] / 3) * 2));
    SPOpt[0].push('52=-' + (Math.floor(Gl['E'] / 3) * 3) + '%');
  }
  if (Gl['N'] == 'バリアントガントレット' && Gl['E'] >= 1) {
    if (Gl['E'] >= 5) SPOpt[0].push('62=' + ((Gl['E'] - 4) * 4) + '%');
  }
  if (Gl['N'] == 'アンブッシュグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('18=' + (Math.floor(Gl['E'] / 3) * 2));
    SPOpt[0].push('42=' + (Math.floor(Gl['E'] / 3) * 2));
  }
  if (Gl['N'] == 'トゥノブリッツアーム' && Gl['E'] >= 1) {
    if (Gl['E'] >= 5) SPOpt[0].push('18=' + ((Gl['E'] - 4) * 5));
  }
  if (Gl['N'] == 'ストライクグローブ' && Gl['E'] >= 1) {
    if (Gl['E'] >= 5) SPOpt[0].push('20=' + ((Gl['E'] - 4)));
  }
  if (Gl['N'] == 'デクステリテーグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('76=' + (Math.floor(Gl['E'] / 3) * -2));
  }
  if (Gl['N'] == 'ミリテイトグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('73=' + (Math.floor(Gl['E'] / 3) * 2));
  }
  if (Gl['N'] == 'サジェスルージュグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('142=' + Gl['E']);
    SPOpt[0].push('3=' + (Math.floor(Gl['E'] / 3)));
    if (Gl['E'] >= 5) SPOpt[0].push('144=' + (Math.floor((Gl['E'] - 4) / 3)));
  }
  if (Gl['N'] == 'フォルニッドガントレット' && Gl['E'] >= 1) {
    if (Gl['E'] >= 3) SPOpt[0].push('6=' + (Math.floor((Gl['E'] - 3) / 2)) + '%');
    if (Gl['E'] >= 3) SPOpt[0].push('7=' + (Math.floor((Gl['E'] - 3) / 2) * 30));
    if (Gl['E'] >= 3) SPOpt[0].push('49=' + (Math.floor((Gl['E'] - 3) / 2)));
  }
  if (Gl['N'] == '○○のナイトグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('13=' + (Math.floor(Gl['E'] / 3) * 2) + '%');
    if (Gl['E'] >= 7) {
      SPOpt[0].push('13=2%');
      SPOpt[0].push('18=5');
    }
  }
  if (Gl['N'] == '○○のノーブルグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('13=' + (Math.floor(Gl['E'] / 3) * 2) + '%');
    if (Gl['E'] >= 7) {
      SPOpt[0].push('13=2%');
      SPOpt[0].push('42=4');
    }
  }
  if (Gl['N'] == 'グルーミストグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('5=' + (Math.floor(Gl['E'] / 3)));
    if (Gl['E'] >= 7) SPOpt[0].push('33=20%');
  }
  if (Gl['N'] == 'ダイラヌスガントレット' && Gl['E'] >= 1) {
    SPOpt[0].push('18=' + Gl['E'] + '%');
    if (Gl['E'] >= 7) SPOpt[0].push('89=3');
  }
  if (Gl['N'] == 'ミザスタグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('145=' + (Math.floor(Gl['E'] / 3) * 3));
    if (Gl['E'] >= 5) SPOpt[0].push('77=3');
  }
  if (Gl['N'] == 'ハインドレクグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('93=' + Gl['E'] + '%');
    if (Gl['E'] >= 7) SPOpt[0].push('93=3');
  }
  if (Gl['N'] == 'アジェイルハンド' && Gl['E'] >= 1) {
    SPOpt[0].push('73=' + Gl['E']);
    SPOpt[0].push('149=' + (Math.floor(Gl['E'] / 3) * 3));
  }
  if (Gl['N'] == 'ギルーガグローブ' && Gl['E'] >= 1) {
    SPOpt[0].push('71=' + Math.floor(Gl['E'] / 2));
  }
  if (Gl['N'] == 'リチュアルハンド' && Gl['E'] >= 1) {
    SPOpt[0].push('139=' + Math.floor(Gl['E'] / 2));
    if (Gl['E'] >= 5) SPOpt[0].push('69=2');
  }
  if (Gl['N'] == 'オレガグラスグローブ' && Gl['E'] >= 1) {
    if (Gl['E'] >= 3) SPOpt[0].push('42=3');
  }
  if (Gl['N'] == 'ゴシックガントレット' && Gl['E'] >= 1) {
    SPOpt[0].push('149=' + (Math.floor(Gl['E'] / 3) * 3));
    if (Gl['E'] >= 5) SPOpt[0].push('72=-3');
    if (Gl['E'] >= 7) SPOpt[0].push('7=50');
  }

// ----- クィス
  if (Ku['N'] == 'パイエティアルブ' && Ku['E'] >= 1) {
    if (Ku['E'] >= 6) SPOpt[0].push('11=2');
    if (Ku['E'] >= 8) SPOpt[0].push('11=6');
    if (Ku['E'] >= 3) SPOpt[0].push('41=' + ((Ku['E'] - 2) * 1));
    SPOpt[0].push('160=' + (Math.floor(Ku['E'] / 3) * 6));
  }
  if (Ku['N'] == 'スイートボトム' && Ku['E'] >= 1) {
    SPOpt[0].push('150=' + (Math.floor(Ku['E'] / 3) * 3));
    SPOpt[0].push('151=' + (Math.floor(Ku['E'] / 3) * 3));
  }
  if (Ku['N'] == 'ホワイトチャームボトム' && Ku['E'] >= 1) {
    SPOpt[0].push('147=' + (Math.floor(Ku['E'] / 3) * 3));
  }
  if (Ku['N'] == 'ブラウンキュートボトム' && Ku['E'] >= 1) {
    SPOpt[0].push('148=' + (Math.floor(Ku['E'] / 3) * 3));
  }
  if (Ku['N'] == 'ゴールドクィス' && Ku['E'] >= 1) {
    if (Ku['E'] >= 5) {
      SPOpt[0].push('60=-2%');
      SPOpt[0].push('60=' + ((Ku['E'] - 4) * -2) + '%');
    }
  }
  if (Ku['N'] == 'ディバインアルブ' && Ku['E'] >= 1) {
    SPOpt[0].push('76=' + (Math.floor(Ku['E'] / 3) * -2));
    SPOpt[0].push('145=' + (Math.floor(Ku['E'] / 3) * 5));
  }
  if (Ku['N'] == 'バリアントクィス' && Ku['E'] >= 1) {
    SPOpt[0].push('49=' + Ku['E']);
    if (Ku['E'] >= 5) SPOpt[0].push('7=' + ((Ku['E'] - 4) * 50));
  }
  if (Ku['N'] == 'アスティアンパンツ' && Ku['E'] >= 1) {
    SPOpt[0].push('7=' + Ku['E']);
  }
  if (Ku['N'] == '雪色アスティアンパンツ' && Ku['E'] >= 1) {
    SPOpt[0].push('7=' + (Ku['E'] * 2));
  }
  if (Ku['N'] == 'トゥノブリッツクィス' && Ku['E'] >= 1) {
    if (Ku['E'] >= 5) SPOpt[0].push('7=' + ((Ku['E'] - 4) * 30));
  }
  if (Ku['N'] == 'ティーガークィス' && Ku['E'] >= 1) {
    if (Ku['E'] >= 5) SPOpt[0].push('76=-5');
  }
  if (Ku['N'] == 'ストライクトラウザ' && Ku['E'] >= 1) {
    if (Ku['E'] >= 5) SPOpt[0].push('52=-' + ((Ku['E'] - 4) * 2) + '%');
  }
  if (Ku['N'] == 'ファルコンボトム' && Ku['E'] >= 1) {
    SPOpt[0].push('62=' + (Math.floor(Ku['E'] / 2) * 2));
    if (Ku['E'] >= 6) SPOpt[0].push('40=4');
  }
  if (Ku['N'] == 'ミリテイトボトム' && Ku['E'] >= 1) {
    SPOpt[0].push('65=' + (Math.floor(Ku['E'] / 3) * 2));
  }
  if (Ku['N'] == 'サジェスルージュズボン' && Ku['E'] >= 1) {
    SPOpt[0].push('77=' + Ku['E']);
    SPOpt[0].push('4=' + (Math.floor(Ku['E'] / 3)));
    if (Ku['E'] >= 5) SPOpt[0].push('144=' + (Math.floor((Ku['E'] - 4) / 3)));
  }
  if (Ku['N'] == 'フォルニッドクィス' && Ku['E'] >= 1) {
    if (Ku['E'] >= 3) SPOpt[0].push('6=' + (Math.floor((Ku['E'] - 3) / 2)) + '%');
    if (Ku['E'] >= 3) SPOpt[0].push('70=' + (Math.floor((Ku['E'] - 3) / 2) * -2));
  }
  if (Ku['N'] == 'グルーミストクィス' && Ku['E'] >= 1) {
    SPOpt[0].push('5=' + (Math.floor(Ku['E'] / 4)));
    if (Ku['E'] >= 7) SPOpt[0].push('142=5');
    if (Ku['E'] >= 6) SPOpt[0].push('60=' + ((Ku['E'] - 5) * -2) + '%');
  }
  if (Ku['N'] == 'ダイラヌスパンツ' && Ku['E'] >= 1) {
    SPOpt[0].push('76=' + Ku['E']);
    if (Ku['E'] >= 7) SPOpt[0].push('69=3');
  }
  if (Ku['N'] == 'ミザスタアルブ' && Ku['E'] >= 1) {
    SPOpt[0].push('158=' + (Math.floor(Ku['E'] / 2) * 3));
    if (Ku['E'] >= 5) SPOpt[0].push('0=1');
    if (Ku['E'] >= 7) SPOpt[0].push('52=-5%');
  }
  if (Ku['N'] == 'ハインドレクズボン' && Ku['E'] >= 1) {
    SPOpt[0].push('20=' + (Ku['E'] * 2));
    if (Ku['E'] >= 7) {
      SPOpt[0].push('62=10%');
      SPOpt[0].push('65=-5%');
    }
  }
  if (Ku['N'] == 'アジェイルショウス' && Ku['E'] >= 1) {
    SPOpt[0].push('73=' + Ku['E']);
    SPOpt[0].push('7=' + (Math.floor(Ku['E'] / 2) * 20));
  }
  if (Ku['N'] == 'フォビドゥンアルブ' && Ku['E'] >= 1) {
    SPOpt[0].push('42=' + Ku['E']);
  }
  if (Ku['N'] == 'ゴシッククィス' && Ku['E'] >= 1) {
    if (Ku['E'] >= 7) SPOpt[0].push('149=4');
  }
  if (Ku['N'] == 'ギルーガショウス' && Ku['E'] >= 1) {
    SPOpt[0].push('18=' + (Math.floor(Ku['E'] / 2) * 3));
    SPOpt[0].push('71=' + Math.floor(Ku['E'] / 2));
  }
  if (Ku['N'] == 'リチュアルレッグス' && Ku['E'] >= 1) {
    SPOpt[0].push('140=' + Math.floor(Ku['E'] / 2));
    if (Ku['E'] >= 5) SPOpt[0].push('65=4');
  }
  if (Ku['N'] == 'オレガグラスアルブ' && Ku['E'] >= 1) {
    if (Ku['E'] >= 3) SPOpt[0].push('6=100');
    if (Ku['E'] >= 7) SPOpt[0].push('42=7');
  }

// ----- ブーツ
  if (Bo['N'] == 'カルドブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 7) {
      SPOpt[0].push('0=2');
      SPOpt[0].push('148=6');
    }
  }
  if (Bo['N'] == 'ファインブーツ' || Bo['N'] == 'ルーナブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 7) SPOpt[0].push('74=5');
  }
  if (Bo['N'] == 'ネグロブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 7) SPOpt[0].push('153=5');
  }
  if (Bo['N'] == 'フェリクスブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('4=' + (Math.floor(Bo['E'] / 3)));
    SPOpt[0].push('6=' + Bo['E'] + '%');
    SPOpt[0].push('7=' + Bo['E'] + '%');
    SPOpt[0].push('13=' + (Bo['E'] * 2) + '%');
  }
  if (Bo['N'] == 'レジストリブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('49=' + (Math.floor(Bo['E'] / 2) * 3));
    SPOpt[0].push('145=' + (Math.floor(Bo['E'] / 2) * 2));
  }
  if (Bo['N'] == 'コンバットブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('133=' + (Math.floor(Bo['E'] / 3) * 2));
  }
  if (Bo['N'] == 'シュナイダーブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 7) SPOpt[0].push('5=1');
  }
  if (Bo['N'] == 'セリカブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 6) SPOpt[0].push('40=0'); // 射程 未実装
    if (Bo['E'] >= 8) SPOpt[0].push('40=0'); // 射程 未実装
  }
  if (Bo['N'] == 'ハングマンブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(Bo['E'] / 3) * 100));
  }
  if (Bo['N'] == 'タイラントブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 7) SPOpt[0].push('18=2%');
  }
  if (Bo['N'] == 'コールサーブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('65=' + (Math.floor(Bo['E'] / 3) * 2));
  }
  if (Bo['N'] == 'ブローニィブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 7) SPOpt[0].push('153=10');
  }
  if (Bo['N'] == 'ブレイズブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('18=' + (Math.floor(Bo['E'] / 3) * 2) + '%');
  }
  if (Bo['N'] == 'ジェオルムブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('42=' + (Math.floor(Bo['E'] / 3) * 2));
    SPOpt[0].push('150=' + (Math.floor(Bo['E'] / 3) * 2));
  }
  if (Bo['N'] == 'シルバーブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(Bo['E'] / 3) * 100));
    SPOpt[0].push('11=' + (Math.floor(Bo['E'] / 3) * 3));
  }
  if (Bo['N'] == 'メディウスブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('7=' + (Math.floor(Bo['E'] / 3) * 20));
    SPOpt[0].push('140=' + (Math.floor(Bo['E'] / 3) * 3));
  }
  if (Bo['N'] == 'グロリアスブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('62=' + (Math.floor(Bo['E'] / 3) * 3));
  }
  if (Bo['N'] == 'スパイクブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('18=' + (Math.floor(Bo['E'] / 2) * 2));
    SPOpt[0].push('145=' + (Math.floor(Bo['E'] / 2)));
    if (Bo['E'] >= 7) SPOpt[0].push('6=100');
  }
  if (Bo['N'] == 'ガノイドブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 6) SPOpt[0].push('70=-3');
  }
  if (Bo['N'] == 'ファルコンブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('151=' + (Math.floor(Bo['E'] / 3) * 3));
  }
  if (Bo['N'] == 'ゴールドグリーブス' && Bo['E'] >= 1) {
    if (Bo['E'] >= 5) {
      SPOpt[0].push('69=2');
      SPOpt[0].push('69=' + ((Bo['E'] - 5) * 2));
    }
  }
  if (Bo['N'] == 'ディバインブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('4=' + (Math.floor(Bo['E'] / 3)));
    SPOpt[0].push('10=' + (Math.floor(Bo['E'] / 3) * 3));
    SPOpt[0].push('11=' + (Math.floor(Bo['E'] / 3) * 2));
  }
  if (Bo['N'] == 'バリアントグリーブス' && Bo['E'] >= 1) {
    SPOpt[0].push('18=' + (Math.floor(Bo['E'] / 2) * 3));
    if (Bo['E'] >= 5) SPOpt[0].push('76=' + ((Bo['E'] - 4) * -3));
  }
  if (Bo['N'] == 'アンブッシュブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('3=' + (Math.floor(Bo['E'] / 3)));
  }
  if (Bo['N'] == 'トゥノブリッツサバトン' && Bo['E'] >= 1) {
    if (Bo['E'] >= 5) SPOpt[0].push('74=5');
    if (Bo['E'] >= 7) SPOpt[0].push('74=5');
  }
  if (Bo['N'] == 'ストライクブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 5) SPOpt[0].push('7=' + ((Bo['E'] - 4) * 3) + '%');
  }
  if (Bo['N'] == 'ミリテイトブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('18=' + (Math.floor(Bo['E'] / 3) * 2) + '%');
  }
  if (Bo['N'] == 'サジェスルージュブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('77=' + Bo['E']);
    if (Bo['E'] >= 5) SPOpt[0].push('144=' + (Math.floor((Bo['E'] - 4) / 3)));
  }
  if (Bo['N'] == 'フォルニッドサバトン' && Bo['E'] >= 1) {
    if (Bo['E'] >= 3) SPOpt[0].push('6=' + (Math.floor((Bo['E'] - 3) / 2)) + '%');
    if (Bo['E'] >= 3) SPOpt[0].push('49=' + (Math.floor((Bo['E'] - 3) / 2)));
    if (Bo['E'] >= 3) SPOpt[0].push('133=' + (Math.floor((Bo['E'] - 3) / 2) * 5));
  }
  if (Bo['N'] == 'ホワイトチャームブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 5) SPOpt[0].push('162=-5');
    if (Bo['E'] >= 7) SPOpt[0].push('162=-10');
  }
  if (Bo['N'] == 'ブラウンキュートブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('7=' + (Math.floor(Bo['E'] / 3) * 40));
    if (Bo['E'] >= 7) SPOpt[0].push('42=3');
  }
  if (Bo['N'] == 'スイートブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('6=' + (Math.floor(Bo['E'] / 3) * 100));
    if (Bo['E'] >= 7) SPOpt[0].push('145=7');
  }
  if (Bo['N'] == '○○のナイトブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('65=' + (Math.floor(Bo['E'] / 3) * 2));
    if (Bo['E'] >= 7) {
      SPOpt[0].push('18=5');
      SPOpt[0].push('65=2');
    }
  }
  if (Bo['N'] == '○○のノーブルブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('145=' + (Math.floor(Bo['E'] / 3) * 2));
    if (Bo['E'] >= 7) {
      SPOpt[0].push('42=4');
      SPOpt[0].push('145=2');
    }
  }
  if (Bo['N'] == 'グルーミストサバトン' && Bo['E'] >= 1) {
    SPOpt[0].push('0=' + (Math.floor(Bo['E'] / 2)));
    if (Bo['E'] >= 6) SPOpt[0].push('60=' + ((Bo['E'] - 5) * -2) + '%');
  }
  if (Bo['N'] == 'ダイラヌスブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('74=' + Bo['E']);
    if (Bo['E'] >= 7) SPOpt[0].push('3=2');
  }
  if (Bo['N'] == 'ミザスタブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('7=' + (Math.floor(Bo['E'] / 2) * 2) + '%');
    if (Bo['E'] >= 5) SPOpt[0].push('77=5');
    if (Bo['E'] >= 7) SPOpt[0].push('67=6');
  }
  if (Bo['N'] == 'ハインドレクブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('67=' + Bo['E']);
    if (Bo['E'] >= 7) {
      SPOpt[0].push('62=10%');
      SPOpt[0].push('65=-5%');
    }
  }
  if (Bo['N'] == 'アジェイルブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('73=' + Bo['E']);
    SPOpt[0].push('76=' + (Math.floor(Bo['E'] / 3) * -2));
  }
  if (Bo['N'] == 'バットブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 2) SPOpt[0].push('74=' + ((Bo['E'] - 1)));
  }
  if (Bo['N'] == 'ギルーガブーツ' && Bo['E'] >= 1) {
    SPOpt[0].push('71=' + Math.floor(Bo['E'] / 2));
    if (Bo['E'] >= 7) SPOpt[0].push('1=1');
  }
  if (Bo['N'] == 'リチュアルフット' && Bo['E'] >= 1) {
    SPOpt[0].push('138=' + Math.floor(Bo['E'] / 2));
    if (Bo['E'] >= 5) SPOpt[0].push('65=6');
  }
  if (Bo['N'] == 'オレガグラスブーツ' && Bo['E'] >= 1) {
    if (Bo['E'] >= 3) SPOpt[0].push('6=100');
    if (Bo['E'] >= 6) SPOpt[0].push('74=5');
    if (Bo['E'] >= 7) SPOpt[0].push('74=5');
  }

// ----- マント
  if (Cl['N'] == '星虹のマント') {
    if (Cl['E'] >= 1 && We['G2'] == '虹') {
      SPOpt[0].push('69=1');
      SPOpt[0].push('71=3');
    }
  }

// -------------------- 魂
  for (i=0;i<=13;i++) {
    for (j=0;j<=2;j++) {
// 通常の補正を特殊補正にぶち込む
      tmp = new Array();
      tmp[0] = SoulData[0][Status['Equip'][i][j + 4]][7] + '';
      if (tmp[0].search(/_/i) != -1) {
        tmp[1] = tmp[0].split('_');
        for (k=0;k<tmp[1].length;k++)
          SPOpt[1][i][j].push(tmp[1][k]);
      } else if (tmp[0].search(/=/i) != -1)
        SPOpt[1][i][j].push(tmp[0]);

// 鍛錬補正ここから
      if (SN[i][j] == '荒ぶる者の魂' && SE[i] >= 1)
        SPOpt[1][i][j].push('18=' + SE[i]);
      if (SN[i][j] == '祝福の魂' && SE[i] >= 1)
        SPOpt[1][i][j].push('76=-' + SE[i]);
      if (SN[i][j] == '解体の魂' && SE[i] >= 1)
        SPOpt[1][i][j].push('31=' + SE[i]);
      if (SN[i][j] == '鉄壁の魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('49=' + SE[i]);
        SPOpt[1][i][j].push('52=-' + SE[i] + '%');
      }
      if (SN[i][j] == '障壁の魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('49=' + SE[i]);
        SPOpt[1][i][j].push('60=-' + SE[i] + '%');
      }
      if (SN[i][j] == '鏡の魂' && SE[i] >= 1)
        if (SE[i] >= 8) SPOpt[1][i][j].push('135=2');
      if (SN[i][j] == '命の魂' && SE[i] >= 1)
        SPOpt[1][i][j].push('6=' + (SE[i] * 10));
      if (SN[i][j] == '理力の魂' && SE[i] >= 1)
        SPOpt[1][i][j].push('7=' + (SE[i] * 10));
      if (SN[i][j] == 'ハロウィンの魂' && SE[i] >= 1)
        SPOpt[1][i][j].push('144=' + SE[i]);
      if (SN[i][j] == '止まらない魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('148=' + (SE[i] * 3));
        SPOpt[1][i][j].push('149=' + SE[i]);
        SPOpt[1][i][j].push('150=' + (SE[i] * 3));
      }
      if (SN[i][j] == '騒音の魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('142=' + SE[i]);
        SPOpt[1][i][j].push('156=' + (SE[i] * 5));
      }
      if (SN[i][j] == 'パレードの魂' && SE[i] >= 1)
        if (SE[i] >= 8) SPOpt[1][i][j].push('160=25');
      if (SN[i][j] == '不滅の魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('146=' + SE[i]);
        SPOpt[1][i][j].push('147=' + SE[i]);
      }
      if (SN[i][j] == '大戦士の魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('18=' + SE[i] + '%');
        SPOpt[1][i][j].push('73=' + SE[i]);
      }
      if (SN[i][j] == '大魔法使いの魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('7=' + SE[i] + '%');
        SPOpt[1][i][j].push('42=' + SE[i]);
      }
      if (SN[i][j] == '影足の魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('65=' + SE[i]);
        SPOpt[1][i][j].push('151=' + (SE[i] * 3));
      }
      if (SN[i][j] == '三日月の魂' && SE[i] >= 1) {
        SPOpt[1][i][j].push('10=' + SE[i]);
        SPOpt[1][i][j].push('150=' + (SE[i] * 10));
      }
      if (SN[i][j] == '歴戦の魂' && SE[i] >= 1)
        SPOpt[1][i][j].push('6=' + SE[i] + '%');
      if (SN[i][j] == '俊足の魂' && SE[i] >= 1)
        if (SE[i] >= 7) SPOpt[1][i][j].push('65=8');
      if (SN[i][j] == '見極める魂' && SE[i] >= 1)
        if (SE[i] >= 7) SPOpt[1][i][j].push('62=10');
    }
  }

// ----- たまたまちぇっく
  for (i=0;i<=13;i++) {
    for (j=0;j<=2;j++) {
      if (SN[i][j] == '魂の魂') {
        if (j == 0 || j == 2) {
          if (SPOpt[1][i][1]) {
            for (k=0;k<SPOpt[1][i][1].length;k++) {
              if (SPOpt[1][i][1][k].search(/=/i) != -1) {
                tmp = SPOpt[1][i][1][k].split('=');
                if (tmp[1].search(/%/i) != -1) {
                  tmp[1] = tmp[1].replace('%','');
                  SPOpt[1][i][1][k] = tmp[0] + '=' + (Number(tmp[1]) * 2) + '%';
                } else
                  SPOpt[1][i][1][k] = tmp[0] + '=' + (Number(tmp[1]) * 2);
              }
            }
          }
        } else if (j == 1) {
          if (SPOpt[1][i][0]) {
            for (k=0;k<SPOpt[1][i][0].length;k++) {
              if (SPOpt[1][i][0][k].search(/=/i) != -1) {
                tmp = SPOpt[1][i][0][k].split('=');
                if (tmp[1].search(/%/i) != -1) {
                  tmp[1] = tmp[1].replace('%','');
                  SPOpt[1][i][0][k] = tmp[0] + '=' + (Number(tmp[1]) * 2) + '%';
                } else
                  SPOpt[1][i][0][k] = tmp[0] + '=' + (Number(tmp[1]) * 2);
              }
            }
          }
          if (SPOpt[1][i][2]) {
            for (k=0;k<SPOpt[1][i][2].length;k++) {
              if (SPOpt[1][i][2][k].search(/=/i) != -1) {
                tmp = SPOpt[1][i][2][k].split('=');
                if (tmp[1].search(/%/i) != -1) {
                  tmp[1] = tmp[1].replace('%','');
                  SPOpt[1][i][2][k] = tmp[0] + '=' + (Number(tmp[1]) * 2) + '%';
                } else
                  SPOpt[1][i][2][k] = tmp[0] + '=' + (Number(tmp[1]) * 2);
              }
            }
          }
        }
      }
    }
  }

// -------------------- 武器の鍛錬値によるオーラダメージ
  switch (We['E']) {
    case 1:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=3');
        else if (We['G2'] == '氷') SPOpt[0].push('35=1');
        else if (We['G2'] == '雷') SPOpt[0].push('36=5');
        else if (We['G2'] == '毒') SPOpt[0].push('37=1');
        else if (We['G2'] == '光') SPOpt[0].push('38=4');
        else if (We['G2'] == '闇') SPOpt[0].push('39=4');
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=1');
    break;
    case 2:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=4');
        else if (We['G2'] == '氷') SPOpt[0].push('35=2');
        else if (We['G2'] == '雷') SPOpt[0].push('36=6');
        else if (We['G2'] == '毒') SPOpt[0].push('37=2');
        else if (We['G2'] == '光') SPOpt[0].push('38=5');
        else if (We['G2'] == '闇') SPOpt[0].push('39=5');
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=2');
    break;
    case 3:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=5');
        else if (We['G2'] == '氷') SPOpt[0].push('35=3');
        else if (We['G2'] == '雷') SPOpt[0].push('36=8');
        else if (We['G2'] == '毒') SPOpt[0].push('37=3');
        else if (We['G2'] == '光') SPOpt[0].push('38=7');
        else if (We['G2'] == '闇') SPOpt[0].push('39=7');
        else if (We['G2'] == '虹') {
          if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
            SPOpt[0].push('34=4');SPOpt[0].push('35=2');SPOpt[0].push('36=6');SPOpt[0].push('37=2');SPOpt[0].push('38=5');SPOpt[0].push('39=6');
          }
        }
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=4');
    break;
    case 4:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=7');
        else if (We['G2'] == '氷') SPOpt[0].push('35=5');
        else if (We['G2'] == '雷') SPOpt[0].push('36=11');
        else if (We['G2'] == '毒') SPOpt[0].push('37=5');
        else if (We['G2'] == '光') SPOpt[0].push('38=9');
        else if (We['G2'] == '闇') SPOpt[0].push('39=9');
        else if (We['G2'] == '虹')
          if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
            SPOpt[0].push('34=5');SPOpt[0].push('35=3');SPOpt[0].push('36=8');SPOpt[0].push('37=3');SPOpt[0].push('38=7');SPOpt[0].push('39=7');
          }
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=7');
    break;
    case 5:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=9'); // ?
        else if (We['G2'] == '氷') SPOpt[0].push('35=6'); // 未
        else if (We['G2'] == '雷') SPOpt[0].push('36=14');
        else if (We['G2'] == '毒') SPOpt[0].push('37=6');
        else if (We['G2'] == '光') SPOpt[0].push('38=12');
        else if (We['G2'] == '闇') SPOpt[0].push('39=12');
        else if (We['G2'] == '虹') {
          if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
            SPOpt[0].push('34=7');SPOpt[0].push('35=5');SPOpt[0].push('36=11');SPOpt[0].push('37=5');SPOpt[0].push('38=9');SPOpt[0].push('39=9');
          }
        }
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=10');
    break;
    case 6:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=9');  // 未
        else if (We['G2'] == '氷') SPOpt[0].push('35=6');  // 未
        else if (We['G2'] == '雷') SPOpt[0].push('36=14'); // 未
        else if (We['G2'] == '毒') SPOpt[0].push('37=6');  // 未
        else if (We['G2'] == '光') SPOpt[0].push('38=12'); // 未
        else if (We['G2'] == '闇') SPOpt[0].push('39=12'); // 未
        else if (We['G2'] == '虹') {
          if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
            SPOpt[0].push('34=5');SPOpt[0].push('35=3');SPOpt[0].push('36=8');SPOpt[0].push('37=3');SPOpt[0].push('38=7');SPOpt[0].push('39=7');
          }
        }
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=14');
    break;
    case 7:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=9');  // 未
        else if (We['G2'] == '氷') SPOpt[0].push('35=11');
        else if (We['G2'] == '雷') SPOpt[0].push('36=23');
        else if (We['G2'] == '毒') SPOpt[0].push('37=6');  // 未
        else if (We['G2'] == '光') SPOpt[0].push('38=20'); // ?
        else if (We['G2'] == '闇') SPOpt[0].push('39=20'); // 未
        else if (We['G2'] == '虹') {
          if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
            SPOpt[0].push('34=7');SPOpt[0].push('35=5');SPOpt[0].push('36=11');SPOpt[0].push('37=5');SPOpt[0].push('38=9');SPOpt[0].push('39=9');
          }
        }
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=19');
    break;
    case 8:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=9');  // 未
        else if (We['G2'] == '氷') SPOpt[0].push('35=6');  // 未
        else if (We['G2'] == '雷') SPOpt[0].push('36=14'); // 未
        else if (We['G2'] == '毒') SPOpt[0].push('37=7');  // 未
        else if (We['G2'] == '光') SPOpt[0].push('38=20'); // 未
        else if (We['G2'] == '闇') SPOpt[0].push('39=20'); // 未
        else if (We['G2'] == '虹') {
          if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
            SPOpt[0].push('34=7');SPOpt[0].push('35=5');SPOpt[0].push('36=11');SPOpt[0].push('37=5');SPOpt[0].push('38=9');SPOpt[0].push('39=9');
          }
        }
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=25');
    break;
    case 9:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=9');  // 未
        else if (We['G2'] == '氷') SPOpt[0].push('35=6');  // 未
        else if (We['G2'] == '雷') SPOpt[0].push('36=14'); // 未
        else if (We['G2'] == '毒') SPOpt[0].push('37=7');  // 未
        else if (We['G2'] == '光') SPOpt[0].push('38=20'); // 未
        else if (We['G2'] == '闇') SPOpt[0].push('39=20'); // 未
        else if (We['G2'] == '虹') {
          if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
            SPOpt[0].push('34=9'); // ?
            SPOpt[0].push('35=6'); // 未 +5
            SPOpt[0].push('36=14');
            SPOpt[0].push('37=7');
            SPOpt[0].push('38=12');
            SPOpt[0].push('39=12');
          }
        }
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=32');
    break;
    case 10:
      if (We['G1'] == '物') {
        if      (We['G2'] == '炎') SPOpt[0].push('34=9');  // 未
        else if (We['G2'] == '氷') SPOpt[0].push('35=6');  // 未
        else if (We['G2'] == '雷') SPOpt[0].push('36=14'); // 未
        else if (We['G2'] == '毒') SPOpt[0].push('37=7');  // 未
        else if (We['G2'] == '光') SPOpt[0].push('38=20'); // 未
        else if (We['G2'] == '闇') SPOpt[0].push('39=20'); // 未
        else if (We['G2'] == '虹') {
          if (We['N'] == '宝剣ガラティン' || We['N'] == '宝剣ガイアノヴァ' || We['N'] == '宝斧ミラージュアクス' || We['N'] == '宝斧エンプレスフェザー' || We['N'] == '宝槍ゾディアックランス' || We['N'] == '宝槍ミストルテイン' || We['N'] == '宝剣クルタナ' || We['N'] == '宝爪ロストフェアリー' || We['N'] == '宝弓ゲイルアイヴィー' || We['N'] == '宝弓スプリガンクロス' || We['N'] == '宝棍クレセントロータス' || We['N'] == '宝棍サウザンドイーリス') {
            SPOpt[0].push('34=9');  // 未 +6
            SPOpt[0].push('35=6');  // 未
            SPOpt[0].push('36=14'); // 未
            SPOpt[0].push('37=7');  // 未
            SPOpt[0].push('38=9');  // 未
            SPOpt[0].push('39=12'); // 未
          }
        }
      } else
        if (We['G2'] != '虹') SPOpt[0].push((Status['Equip'][0][2] + 43) + '=40');
    break;
  }
// 武器の鍛錬値による状態異常率
  if (We['N'].search(/-/i) == -1 && We['G1'] == '物' && We['E'] >= 1) {
    if      (We['G2'] == '炎') SPOpt[0].push('90=' + We['E']);
    else if (We['G2'] == '氷') SPOpt[0].push('94=' + We['E']);
    else if (We['G2'] == '毒') SPOpt[0].push('98=' + We['E']);
  }
// 防具の鍛錬値による補正
  if (Sh['N'].search(/-/i) == -1 && Sh['E'] >= 1) {
    SPOpt[0].push('49=' + Math.floor(Sh['E'] * 1.5));
    if      (Sh['G2'] == '炎') SPOpt[0].push('138=' + Sh['E']);
    else if (Sh['G2'] == '氷') SPOpt[0].push('139=' + Sh['E']);
    else if (Sh['G2'] == '雷') SPOpt[0].push('140=' + Sh['E']);
    else if (Sh['G2'] == '毒') SPOpt[0].push('141=' + Sh['E']);
    else if (Sh['G2'] == '光') {
      SPOpt[0].push('138=' + Math.floor(Sh['E'] / 2));
      SPOpt[0].push('139=' + Math.floor(Sh['E'] / 2));
      SPOpt[0].push('140=' + Math.floor(Sh['E'] / 2));
    }
    else if (Sh['G2'] == '闇') SPOpt[0].push('142=' + Sh['E']);
  }
  if (He['N'].search(/-/i) == -1 && He['E'] >= 1) {
    SPOpt[0].push('49=' + Math.floor(He['E'] * 1.5));
    if      (He['G2'] == '炎') SPOpt[0].push('138=' + He['E']);
    else if (He['G2'] == '氷') SPOpt[0].push('139=' + He['E']);
    else if (He['G2'] == '雷') SPOpt[0].push('140=' + He['E']);
    else if (He['G2'] == '毒') SPOpt[0].push('141=' + He['E']);
    else if (He['G2'] == '光') {
      SPOpt[0].push('138=' + Math.floor(He['E'] / 2));
      SPOpt[0].push('139=' + Math.floor(He['E'] / 2));
      SPOpt[0].push('140=' + Math.floor(He['E'] / 2));
    }
    else if (He['G2'] == '闇') SPOpt[0].push('142=' + He['E']);
  }
  if (To['N'].search(/-/i) == -1 && To['E'] >= 1) {
    SPOpt[0].push('49=' + Math.floor(To['E'] * 1.5));
    if      (To['G2'] == '炎') SPOpt[0].push('138=' + To['E']);
    else if (To['G2'] == '氷') SPOpt[0].push('139=' + To['E']);
    else if (To['G2'] == '雷') SPOpt[0].push('140=' + To['E']);
    else if (To['G2'] == '毒') SPOpt[0].push('141=' + To['E']);
    else if (To['G2'] == '光') {
      SPOpt[0].push('138=' + Math.floor(To['E'] / 2));
      SPOpt[0].push('139=' + Math.floor(To['E'] / 2));
      SPOpt[0].push('140=' + Math.floor(To['E'] / 2));
    }
    else if (To['G2'] == '闇') SPOpt[0].push('142=' + To['E']);
  }
  if (Gl['N'].search(/-/i) == -1 && Gl['E'] >= 1) {
    SPOpt[0].push('49=' + Math.floor(Gl['E'] * 1.5));
    if      (Gl['G2'] == '炎') SPOpt[0].push('138=' + Gl['E']);
    else if (Gl['G2'] == '氷') SPOpt[0].push('139=' + Gl['E']);
    else if (Gl['G2'] == '雷') SPOpt[0].push('140=' + Gl['E']);
    else if (Gl['G2'] == '毒') SPOpt[0].push('141=' + Gl['E']);
    else if (Gl['G2'] == '光') {
      SPOpt[0].push('138=' + Math.floor(Gl['E'] / 2));
      SPOpt[0].push('139=' + Math.floor(Gl['E'] / 2));
      SPOpt[0].push('140=' + Math.floor(Gl['E'] / 2));
    }
    else if (Gl['G2'] == '闇') SPOpt[0].push('142=' + Gl['E']);
  }
  if (Ku['N'].search(/-/i) == -1 && Ku['E'] >= 1) {
    SPOpt[0].push('49=' + Math.floor(Ku['E'] * 1.5));
    if      (Ku['G2'] == '炎') SPOpt[0].push('138=' + Ku['E']);
    else if (Ku['G2'] == '氷') SPOpt[0].push('139=' + Ku['E']);
    else if (Ku['G2'] == '雷') SPOpt[0].push('140=' + Ku['E']);
    else if (Ku['G2'] == '毒') SPOpt[0].push('141=' + Ku['E']);
    else if (Ku['G2'] == '光') {
      SPOpt[0].push('138=' + Math.floor(Ku['E'] / 2));
      SPOpt[0].push('139=' + Math.floor(Ku['E'] / 2));
      SPOpt[0].push('140=' + Math.floor(Ku['E'] / 2));
    }
    else if (Ku['G2'] == '闇') SPOpt[0].push('142=' + Ku['E']);
  }
  if (Bo['N'].search(/-/i) == -1 && Bo['E'] >= 1) {
    SPOpt[0].push('49=' + Math.floor(Bo['E'] * 1.5));
    if      (Bo['G2'] == '炎') SPOpt[0].push('138=' + Bo['E']);
    else if (Bo['G2'] == '氷') SPOpt[0].push('139=' + Bo['E']);
    else if (Bo['G2'] == '雷') SPOpt[0].push('140=' + Bo['E']);
    else if (Bo['G2'] == '毒') SPOpt[0].push('141=' + Bo['E']);
    else if (Bo['G2'] == '光') {
      SPOpt[0].push('138=' + Math.floor(Bo['E'] / 2));
      SPOpt[0].push('139=' + Math.floor(Bo['E'] / 2));
      SPOpt[0].push('140=' + Math.floor(Bo['E'] / 2));
    }
    else if (Bo['G2'] == '闇') SPOpt[0].push('142=' + Bo['E']);
  }
  EquipOpt = new Array();
  tmp = new Array();
  for (i=0;i<Name['Option'].length;i++)
    EquipOpt[i] = new Array();
  if (SPOpt[0]) {
    for (j=0;j<SPOpt[0].length;j++) {
      tmp = SPOpt[0][j].split('=');
      EquipOpt[tmp[0]].push(tmp[1]);
    }
  }
  for (i=0;i<SPOpt[1].length;i++) {
    for (j=0;j<SPOpt[1][i].length;j++) {
      if (SPOpt[1][i][j]) {
        for (k=0;k<SPOpt[1][i][j].length;k++) {
          tmp = SPOpt[1][i][j][k].split('=');
          EquipOpt[tmp[0]].push(tmp[1]);
        }
      }
    }
  }
  if (EquipOpt[6])
    Calc('POT_B');
  if (EquipOpt[8]) {
    Calc('POT_A');Calc('POT_B');
  }
  if (EquipOpt[11]) {
    Calc('FirstAid');Calc('Heal');Calc('HealingAura');Calc('Sanctuary');Calc('RecoveryBelt');Calc('CharityAmulet');
  }

//bbb=''
//for (i=0;i<Name['Option'].length;i++)
//  bbb += i+':'+EquipOpt[i]+'<br>';
//ts2.innerHTML=bbb
//ts2.style.top='0px'

  for (i=0;i<Name['Option'].length;i++)
    Calc(Name['Option'][i][2]);

// bbb ='SPOpt0:'+SPOpt[0]+'<br>';
// bbb+='SPOpt1:'+SPOpt[1]+'<br>';
// bbb+='SPOpt2:'+SPOpt[2]+'<br>';
// bbb+='SPOpt3:'+SPOpt[3]+'<br>';
// bbb+='tmp...:'+tmp[1]+'<br>';
// bbb+=We['N']+' '+We['G1']+' '+We['G2']+' '+We['E']+' '+SN[ 0][0]+' '+SN[ 0][1]+' '+SN[ 0][2]+'<br>';
// bbb+=Sh['N']+' '+Sh['G1']+' '+Sh['G2']+' '+Sh['E']+' '+SN[ 1][0]+' '+SN[ 1][1]+' '+SN[ 1][2]+'<br>';
// bbb+=He['N']+' '+He['G1']+' '+He['G2']+' '+He['E']+' '+SN[ 2][0]+' '+SN[ 2][1]+' '+SN[ 2][2]+'<br>';
// bbb+=To['N']+' '+To['G1']+' '+To['G2']+' '+To['E']+' '+SN[ 3][0]+' '+SN[ 3][1]+' '+SN[ 3][2]+'<br>';
// bbb+=Gl['N']+' '+Gl['G1']+' '+Gl['G2']+' '+Gl['E']+' '+SN[ 4][0]+' '+SN[ 4][1]+' '+SN[ 4][2]+'<br>';
// bbb+=Ku['N']+' '+Ku['G1']+' '+Ku['G2']+' '+Ku['E']+' '+SN[ 5][0]+' '+SN[ 5][1]+' '+SN[ 5][2]+'<br>';
// bbb+=Bo['N']+' '+Bo['G1']+' '+Bo['G2']+' '+Bo['E']+' '+SN[ 6][0]+' '+SN[ 6][1]+' '+SN[ 6][2]+'<br>';
// bbb+=Cl['N']+' '+Cl['G1']+' '+Cl['G2']+' '+Cl['E']+' '+SN[ 7][0]+' '+SN[ 7][1]+' '+SN[ 7][2]+'<br>';
// bbb+=E1['N']+' '+E1['G1']+' '+E1['G2']+' '+E1['E']+' '+SN[ 8][0]+' '+SN[ 8][1]+' '+SN[ 8][2]+'<br>';
// bbb+=E2['N']+' '+E2['G1']+' '+E2['G2']+' '+E2['E']+' '+SN[ 9][0]+' '+SN[ 9][1]+' '+SN[ 9][2]+'<br>';
// bbb+=Ne['N']+' '+Ne['G1']+' '+Ne['G2']+' '+Ne['E']+' '+SN[10][0]+' '+SN[10][1]+' '+SN[10][2]+'<br>';
// bbb+=Be['N']+' '+Be['G1']+' '+Be['G2']+' '+Be['E']+' '+SN[11][0]+' '+SN[11][1]+' '+SN[11][2]+'<br>';
// bbb+=R1['N']+' '+R1['G1']+' '+R1['G2']+' '+R1['E']+' '+SN[12][0]+' '+SN[12][1]+' '+SN[12][2]+'<br>';
// bbb+=R2['N']+' '+R2['G1']+' '+R2['G2']+' '+R2['E']+' '+SN[13][0]+' '+SN[13][1]+' '+SN[13][2]+'<br>';
// ts3.innerHTML = bbb//We+'<br>'+Sh+'<br>'+He+'<br>'+To+'<br>'+Gl+'<br>'+Ku+'<br>'+Bo+'<br>'+Cl+'<br>'+E1+'<br>'+E2+'<br>'+Ne+'<br>'+Be+'<br>'+R1+'<br>'+R2;
// ts3.style.background='#fff';
}

