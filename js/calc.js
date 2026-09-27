function Calc(a,b) {
  var a,b,tmp,xx,yy,zz,N;
  tmp = new Array(0,0,0,0);
  b = (b) ? 1: 0;
  if (!b) {
    switch (a) {
      case 'STA':           // [  0] 体力
        tmp[0] = 0;
      break;
      case 'STR':           // [  1] 筋力
        tmp[0] = 1;
        if (Flag['14_9'] == 1) tmp[1] += Math.floor($('InBuff_1').value / 10); // プロエリウム
      break;
      case 'AGI':           // [  2] 敏捷
        tmp[0] = 2;
        if (Flag['14_9'] == 1) tmp[1] += Math.floor($('InBuff_1').value / 10); // プロエリウム
      break;
      case 'DEX':           // [  3] 器用
        tmp[0] = 3;
      break;
      case 'SPR':           // [  4] 霊感
        tmp[0] = 4;
        tmp[1] += (Status['Job'][2] >= 15 && Status['Job'][2] <= 17) ? 1 + Math.floor((Status['Skill'][12][0] + Status['Skill'][12][1]) / 10): 0;
      break;
      case 'INT':           // [  5] 知性
        tmp[0] = 5;
        if (Flag['14_9'] == 1) tmp[1] += Math.floor($('InBuff_1').value / 10); // プロエリウム
      break;
    }
    switch (a) {
      case 'STA':           // [  0] 体力
        case 'STR':           // [  1] 筋力
        case 'AGI':           // [  2] 敏捷
        case 'DEX':           // [  3] 器用
        case 'SPR':           // [  4] 霊感
        case 'INT':           // [  5] 知性
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        tmp[1] += $('SelBuffClan_9').selectedIndex;
        tmp[1] += (Flag['Honor'] == 1) ? 1: 0;
        Status[a][2] = tmp[1];
        StatusColor('Status' + a,Status[a][0],Status[a][1],Status[a][2]);
      break;
    }

// 表
    switch (a) {
      case 'LP':            // [  6] LP
        tmp[0] = 6;
        tmp[1] = Status['Mod'][Status['Job'][2]][0] + Math.ceil(Status['Lev'][0] * (100 / Status['Mod'][Status['Job'][2]][2])) + Math.ceil((Status['STA'][0] + Status['STA'][1] + Status['STA'][2]) * Math.ceil(100 / Status['Mod'][Status['Job'][2]][4]));
        tmp[2] += (Flag['14_1']) ? Math.ceil(250 + tmp[1] * 0.15): 0; // ディバインエイド
        if      ($('SelBuffClan_1').selectedIndex == 1) tmp[2] += Math.ceil(tmp[1] * 0.02); // フィジカル
        else if ($('SelBuffClan_1').selectedIndex == 2) tmp[2] += Math.ceil(tmp[1] * 0.04);
        else if ($('SelBuffClan_1').selectedIndex == 3) tmp[2] += Math.ceil(tmp[1] * 0.06);
        else if ($('SelBuffClan_1').selectedIndex == 4) tmp[2] += Math.ceil(tmp[1] * 0.09);
        else if ($('SelBuffClan_1').selectedIndex == 5) tmp[2] += Math.ceil(tmp[1] * 0.12);
        if (EquipOpt[tmp[0]]) {
          for (i=0;i<EquipOpt[tmp[0]].length;i++) {
            if (EquipOpt[tmp[0]][i].search(/%/i) != -1)
              tmp[2] += Math.ceil(tmp[1] * Number(EquipOpt[tmp[0]][i].slice(0,-1)) / 100);
            else
              tmp[2] += Number(EquipOpt[tmp[0]][i]);
          }
        }
        tmp[1] += tmp[2];
        Status['LP'] = tmp[1];
        $('Status_' + tmp[0]).innerHTML = addFigure(tmp[1]);
      break;
      case 'MP':            // [  7] MP
        tmp[0] = 7;
        tmp[1] = Status['Mod'][Status['Job'][2]][1] + Math.ceil(Status['Lev'][0] * (100 / Status['Mod'][Status['Job'][2]][3])) + Math.ceil((Status['SPR'][0] + Status['SPR'][1] + Status['SPR'][2]) * Math.ceil(100 / Status['Mod'][Status['Job'][2]][5]));
        if      ($('SelBuffClan_2').selectedIndex == 1) tmp[2] += Math.ceil(tmp[1] * 0.02); // スピリット
        else if ($('SelBuffClan_2').selectedIndex == 2) tmp[2] += Math.ceil(tmp[1] * 0.04);
        else if ($('SelBuffClan_2').selectedIndex == 3) tmp[2] += Math.ceil(tmp[1] * 0.06);
        else if ($('SelBuffClan_2').selectedIndex == 4) tmp[2] += Math.ceil(tmp[1] * 0.09);
        else if ($('SelBuffClan_2').selectedIndex == 5) tmp[2] += Math.ceil(tmp[1] * 0.12);
        if (EquipOpt[tmp[0]]) {
          for (i=0;i<EquipOpt[tmp[0]].length;i++) {
            if (EquipOpt[tmp[0]][i].search(/%/i) != -1)
              tmp[2] += Math.ceil(tmp[1] * Number(EquipOpt[tmp[0]][i].slice(0,-1)) / 100);
            else
              tmp[2] += Number(EquipOpt[tmp[0]][i]);
          }
        }
        tmp[1] += tmp[2];
        Status['MP'] = tmp[1];
        $('Status_' + tmp[0]).innerHTML = addFigure(tmp[1]);
      break;
      case 'POT':           // [  8] ポーション回復量
        tmp[0] = 8;
        tmp[1] = 100 + Math.floor(Math.pow(Status['STA'][0] + Status['STA'][1] + Status['STA'][2],2) * 2 / 1000); // 体力でのボーナス
        tmp[1] += (Status['Job'][0] == 0 && Status['Job'][1] == 2) ? 15: 0; // 薬学
        tmp[1] += (Status['Lev'][0] >= 12 && Status['Job'][2] >= 0 && Status['Job'][2] <= 6) ? Math.floor((Status['Skill'][0][0] + Status['Skill'][0][1]) / 10) * 10: 0; // 回復量増加
        tmp[1] += (Flag['30_0']) ? 5: 0; // ウンジョー
        tmp[1] += (Flag['Honor'] == 11) ? 5: 0; // 頑強なる肉体
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        Status['POT'] = tmp[1];
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'LPSkill':       // [ 11] LP回復スキル効果量
        tmp[0] = 11;
        tmp[1] = 100;
        tmp[1] += (Flag['Honor'] == 2) ? 10: 0; // 清浄なる慈愛の心
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        Status['LSk'] = tmp[1];
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'ATK':           // [ 18] 攻/最大
        tmp[0] = 18;
        tmp[1] = Math.floor((Status['STR'][0] + Status['STR'][1] + Status['STR'][2]) / 2);
        tmp[2] = new Array(Math.floor(Status['Equip'][0][0] / 10000),Status['Equip'][0][0] % 10000);
        tmp[2] = EquipData[0][tmp[2][0]][tmp[2][1]][7];
        tmp[5] = 0;
        if (tmp[2]) {
          if (tmp[2].search('_') != -1) {
            tmp[3] = tmp[2].split('_');
            tmp[2] = tmp[3][0];
          }
          tmp[3] = tmp[2].split('=');
          xx = Number(tmp[3][1].slice(1));
        } else xx = 0; // 武器攻撃力
        yy = Status['Equip'][0][3]; // 鍛錬値
        N = new Array()
        N[0] = new Array(0,0.02,0.04,0.06,0.08,0.1,0.12,0.15,0.19,0.24,0.3);
        N[1] = new Array(0,2,4,6,8,11,15,20,26,33,40);
//        zz = new Array(0,2,4,6,8,11,15,20,26,32,40); // 固定上昇値
        tmp[2] = Math.floor(xx * N[0][yy]) + N[1][yy];
//        tmp[2]  = (yy != 0) ? Math.floor(xx * yy / 50) + zz[yy]: 0;
//        tmp[2] += (yy >= 7) ? Math.floor(xx / Math.ceil(yy * 100 / zz[yy - 1])): 0;
// 筋力ボーナス
        if      (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >= 130) tmp[3] = 0.90;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >= 120) tmp[3] = 0.75;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >= 110) tmp[3] = 0.60;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >= 100) tmp[3] = 0.50;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >=  90) tmp[3] = 0.40;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >=  80) tmp[3] = 0.32;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >=  70) tmp[3] = 0.24;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >=  60) tmp[3] = 0.18;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >=  50) tmp[3] = 0.12;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >=  40) tmp[3] = 0.08;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >=  30) tmp[3] = 0.04;
        else if (Status['STR'][0] + Status['STR'][1] + Status['STR'][2] >=  20) tmp[3] = 0.02;
        else                                                                    tmp[3] = 0;
        tmp[6] = Math.floor(Status['Equip'][0][0] / 10000);
        tmp[4] = // 闘争心
          (Status['Job'][0] == 0 && Status['Job'][1] == 0 && tmp[6] == 0 && tmp[6] == 2 && tmp[6] == 4 && tmp[6] == 6 && tmp[6] == 10 && tmp[6] == 12)
            ? 10: 0;
        var ATK = (Status['Equip'][0][0] % 10000 != 0) ? tmp[1] + xx + tmp[2] + ((xx + tmp[2]) * tmp[3]) + tmp[4]: 1 + tmp[1];
        tmp[7] = (Flag['Honor'] == 7) ? 10: 0;
        if (Flag[7]) {
          if      (Status['Job'][2] == 3 || Status['Job'][2] == 6) tmp[7] += (50 + tmp[7] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 50 + tmp[7] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 10)                         tmp[7] += (30 + tmp[7] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 30 + tmp[7] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 27)                         tmp[7] += (40 + tmp[7] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 40 + tmp[7] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else                                                     tmp[7] += (10 + tmp[7] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 10 + tmp[7] + Status['Skill'][24][0] + Status['Skill'][24][1];
        } else tmp[7] = 100;
        ATK = (Flag[7]) ? Math.ceil(ATK * tmp[7] / 100): ATK;
        tmp[5] += // 豪腕
          (Status['Job'][0] == 4 && Status['Job'][1] == 1 && tmp[6] == 1 && tmp[6] == 3 && tmp[6] == 5 && tmp[6] == 7 && tmp[6] == 8 && tmp[6] == 9 && tmp[6] == 11 && tmp[6] == 13)
            ? Math.ceil(ATK * 0.12): 0;
        tmp[5] += // ドワーフ魂 未実装
          (Status['Job'][0] == 2 && Status['Job'][1] == 1 && tmp[6] == 3 && tmp[6] == 5)
            ? 0: 0;
        tmp[5] += (Flag['0_7']) ? 10 + Math.ceil(ATK * 0.2): 0; // ウォークライ
        tmp[5] += (Flag['0_9']) ? Math.ceil(ATK * 0.3): 0; // レイジングソウル
        tmp[5] += (Flag['0_10']) ? Math.floor(ATK * -0.3): 0; // ディフェンダー
        tmp[5] += (Flag['0_11']) ? Math.ceil(ATK * (55 + (Status['Skill'][0][0] + Status['Skill'][0][1] / Math.ceil(100 / 33))) / 100): 0; // デスペラード
        if      ($('SelBuffClan_10').selectedIndex == 1) tmp[5] += Math.ceil(ATK * 0.02); // アラウズ
        else if ($('SelBuffClan_10').selectedIndex == 2) tmp[5] += Math.ceil(ATK * 0.04);
        else if ($('SelBuffClan_10').selectedIndex == 3) tmp[5] += Math.ceil(ATK * 0.06);
        tmp[5] += (Flag['Honor'] == 3) ? Math.floor(ATK * 0.02): 0; // 脈動する猛火への道標
        if (EquipOpt[tmp[0]]) {
          for (i=0;i<EquipOpt[tmp[0]].length;i++) {
            if (EquipOpt[tmp[0]][i].search(/%/i) != -1)
              tmp[5] += Math.ceil(ATK * Number(EquipOpt[tmp[0]][i].slice(0,-1) / 100));
            else
              tmp[5] += (EquipOpt[tmp[0]][i].search(/W/i) == -1) ? Number(EquipOpt[tmp[0]][i]): 0;
          }
        }
        $('Status_' + tmp[0]).innerHTML = addFigure(Math.ceil(ATK + tmp[5]));
      break;
      case 'ATKFront':      // [ 19] 正面からの攻撃力＋
        tmp[0] = 19;
        tmp[1] += (Flag['Honor'] == 13) ? 10: 0; // 剣聖の秘伝
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'ATKBack':       // [ 20] 背後からの攻撃力＋
        tmp[0] = 20;
        tmp[1] = 15;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RangeMelee':    // [ 40] 近接武器の射程
        tmp[0] = 40;
        tmp[2] = Math.floor(Status['Equip'][0][0] / 10000);
        if      (Flag[7] && Status['Skill'][24][0] + Status['Skill'][24][1] >= 40) {
          if      (tmp[2] == 0)                tmp[2] = 8;
          else if (tmp[2] >= 1 && tmp[2] <= 5) tmp[2] = 1;
          else                                 tmp[2] = 0;
        }
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        tmp[1] += tmp[2];
        $('Status_' + tmp[0]).innerHTML = '---';
      break;
      case 'RangeRange':    // [ 41] 遠距離武器の射程
        tmp[0] = 41;
        tmp[1] += (Status['Job'][0] == 1 && Status['Job'][1] == 1) ? 0: 0; // エルフ：遠望 未実装
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = '---';
      break;
      case 'MATK':          // [ 42] 魔法攻撃力
        tmp[0] = 42;
        tmp[1] = 100;
// 知性による魔攻ボーナス
        if      (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >= 115) tmp[1] += 50.00;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >= 110) tmp[1] += 49.00;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >= 105) tmp[1] += 41.00;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >= 100) tmp[1] += 40.00;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  95) tmp[1] += 35.25;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  90) tmp[1] += 34.25;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  85) tmp[1] += 29.75;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  80) tmp[1] += 28.75;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  75) tmp[1] += 24.75;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  70) tmp[1] += 23.75;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  65) tmp[1] += 20.25;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  60) tmp[1] += 19.25;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  55) tmp[1] += 16.00;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  50) tmp[1] += 15.00;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  45) tmp[1] += 12.25;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  40) tmp[1] += 11.25;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  35) tmp[1] += 8.75;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  30) tmp[1] += 7.75;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  25) tmp[1] += 5.75;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  20) tmp[1] += 4.75;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  15) tmp[1] += 3.00;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=  10) tmp[1] += 2.00;
        else if (Status['INT'][0] + Status['INT'][1] + Status['INT'][2] >=   5) tmp[1] += 1.00;
// 魔力上昇
        tmp[1] += (Status['Job'][2] >= 22 && Status['Job'][2] <= 24) ? 10 + Math.floor((Status['Skill'][17][0] + Status['Skill'][17][1]) / 10): 0;
        tmp[2] = new Array(Math.floor(Status['Equip'][0][0] / 10000),Status['Equip'][0][0] % 10000);
        tmp[1] += (tmp[2][0] == 12) ? 10: 0; // 武器のボーナス 片手杖
// 武器のボーナス 両手杖
        if      (EquipData[0][tmp[ 2][0]][tmp[ 2][1]][0] == 'カースドロッド')   tmp[1] += 20;
        else if (EquipData[0][tmp[ 2][0]][tmp[ 2][1]][0] == 'アイアンスタッフ') tmp[1] += 0;
        else if (EquipData[0][tmp[ 2][0]][tmp[ 2][1]][0] == 'マイトスタッフ')   tmp[1] += 0;
        else
          tmp[1] += (tmp[2][0] == 13) ? 15: 0;
        if      ($('SelBuffClan_10').selectedIndex == 1) tmp[1] += 2; // アラウズ
        else if ($('SelBuffClan_10').selectedIndex == 2) tmp[1] += 4;
        else if ($('SelBuffClan_10').selectedIndex == 3) tmp[1] += 6;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
//        tmp[1] += tmp[2];
        $('Status_' + tmp[0]).innerHTML = (tmp[1] >= 100) ? Math.floor(tmp[1] * 10) / 10: tmp[1];
      break;
      case 'DEF':           // [ 49] 防御力
        tmp[0] = 49;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++) {
            if (EquipOpt[tmp[0]][i].search(/%/i) == -1)
              tmp[1] += Number(EquipOpt[tmp[0]][i]);
        }
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++) {
            if (EquipOpt[tmp[0]][i].search(/%/i) != -1)
              tmp[2] += Math.ceil(tmp[1] * Number(EquipOpt[tmp[0]][i].slice(0,-1)) / 100);
        }
        tmp[2] += (Flag['Honor'] == 11) ? 5: 0; // 頑強なる肉体
        tmp[2] += (Flag['0_9'])  ? Math.ceil(tmp[1] * -0.6): 0; // レイジングソウル
        tmp[2] += (Flag['0_10']) ? Math.floor(tmp[1] * 0.6): 0; // ディフェンダー
        tmp[2] += (Flag['14_4']) ? 5 + Math.floor(Number($('InBuff_0').value) / (100 / 3)) + Math.floor(Number($('InBuff_1').value) / (100 / 4)): 0; // ラピスメディオ
        tmp[1] += tmp[2];
        $('Status_' + tmp[0]).innerHTML = (!Flag[7]) ? addFigure(tmp[1]): '---';
      break;
      case 'RESFront':      // [ 50] 正面からの物理ダメージ
        tmp[0] = 50;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESBack':       // [ 51] 背後からの物理ダメージ
        tmp[0] = 51;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESPhyDAM':     // [ 52] 被物理ダメージ
        tmp[0] = 52;
//        tmp[1] = Status['STA'][0] + Status['STA'][1] + Status['STA'][2];
        tmp[3] = 0;
        tmp[3] += (Flag['14_6']) ? (10 + Math.floor(Number($('InBuff_1').value) / 5)) * -1: 0; // ウィンクルム
        tmp[3] += (Status['Job'][0] == 4 && Status['Job'][1] == 0) ? -10: 0; // エンキドゥ：頑丈な皮膚
        tmp[3] += (Flag['Honor'] == 11) ? -5: 0; // 頑強なる肉体
        if (EquipOpt[tmp[0]]) {
          for (i=0;i<EquipOpt[tmp[0]].length;i++) {
            if (EquipOpt[tmp[0]][i].search(/%/i) != -1)
              tmp[3] += Number(EquipOpt[tmp[0]][i].slice(0,-1));
            else
              tmp[2] += Number(EquipOpt[tmp[0]][i]);
          }
        }
        $('Status_' + tmp[0] + '_0').innerHTML = tmp[2];
        $('Status_' + tmp[0] + '_2').innerHTML = tmp[3];
      break;
      case 'RESMagDAM':     // [ 60] 被魔法ダメージ
        tmp[0] = 60;
//        tmp[1] = Status['SPR'][0] + Status['SPR'][1] + Status['SPR'][2];
        tmp[2] += (Status['Job'][0] == 5 && Status['Job'][1] == 0) ? -10: 0; // ラピン：魔抵抗体
        if (EquipOpt[tmp[0]]) {
          for (i=0;i<EquipOpt[tmp[0]].length;i++) {
            if (EquipOpt[tmp[0]][i].search(/%/i) != -1)
              tmp[2] += Number(EquipOpt[tmp[0]][i].slice(0,-1));
            else
              tmp[2] += Number(EquipOpt[tmp[0]][i]);
          }
        }
//        tmp[1] += tmp[2];
        $('Status_' + tmp[0]).innerHTML = tmp[2];
      break;
      case 'ACC':           // [ 62] 命中                           [ 63] 正面から攻撃した時の命中 [ 64] 背後から攻撃した時の命中
        tmp[0] = new Array(62,63,64);
        tmp[1] = Status['Lev'][0] + Status['DEX'][0] + Status['DEX'][1] + Status['DEX'][2];
        tmp[3] = 0;tmp[4] = 0;
        tmp[2] += (Status['Job'][2] >= 8 && Status['Job'][2] <= 10) ? 10 + Math.floor(Status['Skill'][6][0] + Status['Skill'][6][1] / 10): 0; // 鷹の目
        tmp[2] += (Flag['1_4'])  ? 100: 0; // コンセントレーション
        tmp[2] += (Flag['6_3'])  ? Math.floor(20 + tmp[1] * 0.15): 0; // マインドサイト
        tmp[2] += (Flag['16_0']) ? 5 + Math.floor(Number($('InBuff_0').value) / Math.ceil(100 / 13)) + Math.floor(Number($('InBuff_2').value) / Math.ceil(100 / 13)): 0; // 詩人の歌
        tmp[2] += (Flag['Honor'] ==  5) ? 5: 0; // 突破せし稲妻の道標
        tmp[2] += (Flag['Honor'] == 12) ? -10: 0; // 軽業師の奥義
        tmp[2] += (Flag['Honor'] == 13) ? 10: 0; // 剣聖の秘伝
        for (i=0;i<tmp[0].length;i++) {
          if (EquipOpt[tmp[0][i]]) {
            for (j=0;j<EquipOpt[tmp[0][i]].length;j++) {
              if (EquipOpt[tmp[0][i]][j].search(/%/i) != -1)
                tmp[i + 2] += Math.ceil(tmp[1] * Number(EquipOpt[tmp[0][i]][j].slice(0,-1)) / 100);
              else
                tmp[i + 2] += Number(EquipOpt[tmp[0][i]][j]);
            }
          }
        }
        tmp[5] = (Flag['Honor'] == 7) ? 10: 0;
        if (Flag[7]) {
          if      (Status['Job'][2] == 3 || Status['Job'][2] == 6) tmp[5] += (50 + tmp[5] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 50 + tmp[5] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 10)                         tmp[5] += (30 + tmp[5] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 30 + tmp[5] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 27)                         tmp[5] += (40 + tmp[5] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 40 + tmp[5] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else                                                     tmp[5] += (10 + tmp[5] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 10 + tmp[5] + Status['Skill'][24][0] + Status['Skill'][24][1];
        } else tmp[5] = 100;
        tmp[1] = (Flag[7]) ? Math.ceil(tmp[1] * tmp[5] / 100): tmp[1];
        $('Status_' + tmp[0][0]).innerHTML = tmp[1] + tmp[2];
        $('Status_' + tmp[0][1]).innerHTML = tmp[1] + tmp[2] + tmp[3];
//        $('Status_' + tmp[0][2]).innerHTML = tmp[1] + tmp[2] + tmp[4]; // 背後からの命中
      break;
      case 'Dodge':         // [ 65] 回避
        tmp[0] = 65;
        tmp[1] = Status['Lev'][0] + Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2];
        if      (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >= 140) tmp[1] += 98;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >= 130) tmp[1] += 85;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >= 120) tmp[1] += 72;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >= 110) tmp[1] += 61;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >= 100) tmp[1] += 50;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  90) tmp[1] += 41;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  80) tmp[1] += 32;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  70) tmp[1] += 25;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  60) tmp[1] += 18;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  50) tmp[1] += 13;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  40) tmp[1] += 8;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  30) tmp[1] += 5;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  20) tmp[1] += 2;
        else if (Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2] >=  10) tmp[1] += 1;
        else                                                                    tmp[1] += 0;
        tmp[2] += (Status['Job'][2] >= 11 && Status['Job'][2] <= 13) ? 10 + Math.floor(Status['Skill'][6][0] + Status['Skill'][6][1] / 10): 0; // クイックステップ
        tmp[2] += (Flag['5_5'])  ? Math.floor(tmp[1] * -0.2): 0; // パラペット
        tmp[2] += (Flag['11_3']) ? 0: 0; // ファストアボイド 未実装
        tmp[2] += (Flag['11_6']) ? 100: 0; // アボイダンス
        tmp[2] += (Flag['15_1'])  ? Math.floor(15 + tmp[1] * 0.15): 0; // ウィンドアシスト
        tmp[2] += (Flag['16_0']) ? 5 + Math.floor(Number($('InBuff_0').value) / Math.ceil(100 / 13)) + Math.floor(Number($('InBuff_2').value) / Math.ceil(100 / 13)): 0; // 詩人の歌
        tmp[2] += (Flag['Honor'] == 12) ? 10: 0; // 軽業師の奥義
        tmp[2] += (Flag['Honor'] == 13) ? -10: 0; // 剣聖の秘伝
        if (EquipOpt[tmp[0]]) {
          for (i=0;i<EquipOpt[tmp[0]].length;i++) {
            if (EquipOpt[tmp[0]][i].search(/%/i) != -1)
              tmp[2] += Math.ceil(tmp[1] * Number(EquipOpt[tmp[0]][i].slice(0,-1) / 100));
            else
              tmp[2] += Number(EquipOpt[tmp[0]][i]);
          }
        }
        tmp[3] = (Flag['Honor'] == 7) ? 10: 0;
        if (Flag[7]) {
          if      (Status['Job'][2] == 3 || Status['Job'][2] == 6) tmp[3] += (50 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 50 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 10)                         tmp[3] += (30 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 30 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 27)                         tmp[3] += (40 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 40 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else                                                     tmp[3] += (10 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 10 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
        } else tmp[3] = 100;
        tmp[1] = (Flag[7]) ? Math.ceil(tmp[1] * tmp[3] / 100): tmp[1];
        $('Status_' + tmp[0]).innerHTML = tmp[1] + tmp[2];
      break;
      case 'EVAMelee':      // [ 66] 近接物理攻撃回避率
        tmp[0] = 66;
        tmp[1] += (Status['Job'][0] == 3 && Status['Job'][1] == 2) ? 2: 0; // マイリーン：直感回避
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'EVARange':      // [ 67] 遠距離攻撃回避率
        tmp[0] = 67;
//        tmp[1] += (Status['Job'][0] == 3 && Status['Job'][1] == 2) ? 2: 0; // マイリーン：直感回避
        tmp[1] += (Flag['Honor'] == 12) ? 3: 0; // 軽業師の奥義
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'EVAMagic':      // [ 68] 魔法攻撃回避率
        tmp[0] = 68;
//        tmp[1] += (Status['Job'][0] == 3 && Status['Job'][1] == 2) ? 2: 0; // マイリーン：直感回避
        tmp[1] += (Flag['11_7']) ? 0: 0; // インスレイトセンス 未実装
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'Cri':           // [ 69] クリティカル発生率
        tmp[0] = 69;
        tmp[1] = 1 + Math.floor((Status['DEX'][0] + Status['DEX'][1] + Status['DEX'][2]) / 10);
        tmp[2] += (Status['Job'][0] >= 3 && Status['Job'][1] <= 0) ? 2: 0; // マイリーン：鋭敏な感覚
        tmp[3] = Math.floor(Status['Equip'][0][0] / 10000);
        if (Flag['3_2'])
          tmp[2] += (tmp[3] == 2 || tmp[3] == 3)  ? 0: 0; // イエール 未実装
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[2] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1] + tmp[2];
      break;
      case 'CriRES':        // [ 70] 被クリティカル発生率
        tmp[0] = 70;
        tmp[1] += (Flag['Honor'] == 8) ? -10: 0; // 守護者の極意
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[2] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = (Flag['5_5']) ? '-255': tmp[1] + tmp[2];
      break;
      case 'CriDAM':        // [ 71] クリティカルダメージ
        tmp[0] = 71;
        tmp[1] = 100;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'CriDAMRES':     // [ 72] 被クリティカルダメージ軽減率
        tmp[0] = 72;
        tmp[1] = 100;
        tmp[1] += (Flag['Honor'] == 8) ? -10: 0; // 守護者の極意
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[2] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1] + tmp[2];
      break;
      case 'ATKSPD':        // [ 73] 攻撃速度
        tmp[0]  = 73;
        tmp[1]  = Status['AGI'][0] + Status['AGI'][1] + Status['AGI'][2];
        tmp[2]  = 100;
        tmp[2] += Math.floor(tmp[1] / 10) * 2;
        tmp[2] += Math.floor(tmp[1] / 20) * 3;
        tmp[2] += Math.floor(tmp[1] / 10);
        tmp[3]  = (Flag['14_3']) ? 5 + Math.floor(Number($('InBuff_0').value) / (100 / 6) * 1.9): 0; // グラーティア
        tmp[3] += (Flag['30_1']) ? 5: 0; // オシラ
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[3] += Number(EquipOpt[tmp[0]][i]);
        tmp[4] = (Flag['Honor'] == 7) ? 10: 0;
        if (Flag[7]) {
          if      (Status['Job'][2] == 3 || Status['Job'][2] == 6) tmp[4] += (50 + tmp[4] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 50 + tmp[4] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 10)                         tmp[4] += (30 + tmp[4] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 30 + tmp[4] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 27)                         tmp[4] += (40 + tmp[4] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 40 + tmp[4] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else                                                     tmp[4] += (10 + tmp[4] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 10 + tmp[4] + Status['Skill'][24][0] + Status['Skill'][24][1];
        } else tmp[4] = 100;
//        tmp[2] = (Flag[7]) ? Math.ceil(tmp[2] * tmp[4] / 100): tmp[2];
        tmp[2] = (Flag[7]) ? '---': tmp[2];
        $('Status_' + tmp[0]).innerHTML = tmp[2] + tmp[3];
      break;
      case 'MoveSPD':       // [ 74] 移動速度                       [ 75] 街での移動速度
        tmp[0]  = new Array(74,75);
        tmp[1]  = new Array(100,0);
        tmp[2]  = (Flag['6_2'])  ? 40: 0; // ムーブアシスト
        tmp[2] += (Flag['11_0']) ? 30: 0; // アナバシス
        for (i=0;i<tmp[0].length;i++) {
          if (EquipOpt[tmp[0][i]]) {
            for (j=0;j<EquipOpt[tmp[0][i]].length;j++)
              tmp[1][i] += Number(EquipOpt[tmp[0][i]][j]);
          }
        }
        $('Status_' + tmp[0][0]).innerHTML = tmp[1][0] + tmp[2];
        $('Status_' + tmp[0][1]).innerHTML = tmp[1][0] + tmp[1][1] + tmp[2];
      break;
      case 'ReduceMP':      // [ 76] 消費MP
        tmp[0] = 76;
        tmp[1] = 100 - Math.floor(Math.pow(Status['INT'][0] + Status['INT'][1] + Status['INT'][2],2) * 2 / 2000); // 知性でのボーナス
        tmp[1] += (Status['Job'][0] == 1 && Status['Job'][1] == 0) ? -15: 0; // エルフ：自然との調和
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'CastSPD':       // [ 77] 詠唱速度                       [ 78] 詠唱時間
        tmp[0] = new Array(77,78);
        tmp[1] = Math.floor((Status['DEX'][0] + Status['DEX'][1] + Status['DEX'][2]) / 10) * 5;
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[2] += Number(EquipOpt[tmp[0][0]][i]);
        tmp[3] = (Flag['Honor'] == 7) ? 10: 0;
        if (Flag[7]) {
          if      (Status['Job'][2] == 3 || Status['Job'][2] == 6) tmp[3] += (50 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 50 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 10)                         tmp[3] += (30 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 30 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 27)                         tmp[3] += (40 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 40 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else                                                     tmp[3] += (10 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 10 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
        } else tmp[3] = 100;
        tmp[1] = (Flag[7]) ? Math.ceil(tmp[1] * tmp[3] / 100): tmp[1];
        $('Status_' + tmp[0][0]).innerHTML = 100 + tmp[1] + tmp[2];
        $('Status_' + tmp[0][1]).innerHTML = (Flag['14_8']) ? 50: 100;
      break;
      case 'Cooldown':      // [ 79] 再使用時間
        tmp[0] = 79;
        tmp[1] = Math.floor((Status['INT'][0] + Status['INT'][1] + Status['INT'][2]) / 10) * -2;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[2] += Number(EquipOpt[tmp[0]][i]);
        tmp[3] = (Flag['Honor'] == 7) ? 10: 0;
        if (Flag[7]) {
          if      (Status['Job'][2] == 3 || Status['Job'][2] == 6) tmp[3] += (50 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 50 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 10)                         tmp[3] += (30 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 30 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else if (Status['Job'][2] == 27)                         tmp[3] += (40 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 40 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
          else                                                     tmp[3] += (10 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1] >= 100) ? 100: 10 + tmp[3] + Status['Skill'][24][0] + Status['Skill'][24][1];
        } else tmp[3] = 100;
        tmp[1] = (Flag[7]) ? Math.ceil(tmp[1] * tmp[3] / 100): tmp[1];
        $('Status_' + tmp[0]).innerHTML = 100 + tmp[1] + tmp[2];
      break;
      case 'RelHorse':      // [ 81] 騎乗時のステータス開放率
        tmp[0] = 81;
        if      (Status['Job'][2] == 3 || Status['Job'][2] == 6) tmp[1] += 50;
        else if (Status['Job'][2] == 10)                         tmp[1] += 30;
        else if (Status['Job'][2] == 27)                         tmp[1] += 40;
        else                                                     tmp[1] += 10;
        tmp[1] += Status['Skill'][24][0] + Status['Skill'][24][1];
        tmp[1] += (Flag['Honor'] == 7) ? 10: 0;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESFire':       // [138] 火炎耐性
        tmp[0] = 138;
        tmp[1] += (Flag['18_8'])  ? 50: 0; // レジストファイア
        tmp[1] += (Flag['18_9'])  ? -25: 0; // レジストアイス
        tmp[1] += (Flag['18_10']) ? -25: 0; // レジストサンダー
        tmp[1] += (Flag['Honor'] == 3) ? 10: 0; // 脈動する猛火への道標
        tmp[1] += (Flag['Honor'] == 5) ? -15: 0; // 突破せし稲妻への道標
      break;
      case 'RESIce':        // [139] 冷気耐性
        tmp[0] = 139;
        tmp[1] += (Flag['18_8'])  ? -25: 0; // レジストファイア
        tmp[1] += (Flag['18_9'])  ? 50: 0; // レジストアイス
        tmp[1] += (Flag['18_10']) ? -25: 0; // レジストサンダー
        tmp[1] += (Flag['Honor'] == 3) ? -15: 0; // 脈動する猛火への道標
        tmp[1] += (Flag['Honor'] == 4) ? 10: 0; // 渦巻く氷塊への道標
      break;
      case 'RESLightning':  // [140] 電撃耐性
        tmp[0] = 140;
        tmp[1] += (Flag['18_8'])  ? -25: 0; // レジストファイア
        tmp[1] += (Flag['18_9'])  ? -25: 0; // レジストアイス
        tmp[1] += (Flag['18_10']) ? 50: 0; // レジストサンダー
        tmp[1] += (Flag['Honor'] == 4) ? -15: 0; // 渦巻く氷塊への道標
        tmp[1] += (Flag['Honor'] == 5) ? 10: 0; // 突破せし稲妻への道標
      break;
      case 'RESPoison':     // [141] 毒耐性                         [169] 毒の耐性段階
        tmp[0] = 141;
        tmp[1] += (Flag['20_7']) ? 25: 0; // レジストマリス
        tmp[1] += (Flag['21_7']) ? -25: 0; // レジストチャーム
      break;
      case 'RESCharm':      // [142] 魅了耐性
        tmp[0] = 142;
        tmp[1] += (Status['Job'][0] == 1 && Status['Job'][1] == 2) ? 20: 0; // エルフ：乱れぬ精神
        tmp[1] += (Flag['20_7']) ? -50: 0; // レジストマリス
        tmp[1] += (Flag['21_7']) ? 50: 0; // レジストチャーム
        tmp[1] += (Flag['Honor'] == 9) ? 5: 0; // 忌避すべき闇への道標
      break;
      case 'RESLight':      // [143] 光耐性
        tmp[0] = 143;
        tmp[1] += (Flag['Honor'] ==  9) ? -5: 0; // 忌避すべき闇への道標
        tmp[1] += (Flag['Honor'] == 10) ? 10: 0; // 崇高たる光明への道標
      break;
      case 'RESDark':       // [144] 闇耐性
        tmp[0] = 144;
        tmp[1] += (Flag['20_7']) ? 25: 0; // レジストマリス
        tmp[1] += (Flag['21_7']) ? -25: 0; // レジストチャーム
        tmp[1] += (Flag['Honor'] ==  9) ? 10: 0; // 忌避すべき闇への道標
        tmp[1] += (Flag['Honor'] == 10) ? -5: 0; // 崇高たる光明への道標
      break;
      case 'RESMagic':      // [145] 魔術耐性
        tmp[0] = 145;
        tmp[1] += (Status['Job'][2] == 6 && Status['Equip'][1][0] % 10000 >= 1)
          ? Math.floor((Status['Skill'][5][0] + Status['Skill'][5][1]) / 2): 0; // パラディン：フィラクテリー
        tmp[1] += (Flag['Honor'] == 10) ? 3: 0; // 崇高たる光明への道標
      break;
      case 'RESPDebuff':    // [146] 身体的異常耐性
        tmp[0]  = 146;
        tmp[1]  = Math.floor((Status['STA'][0] + Status['STA'][1] + Status['STA'][2]) / 28) * 7;
        tmp[1] += (Status['Job'][0] == 0 && Status['Job'][1] == 1) ? 15: 0; // 人間：適応能力
        tmp[1] += (Flag['Honor'] == 10) ? 6: 0; // 崇高たる光明への道標
      break;
      case 'RESMDebuff':    // [147] 精神的異常耐性
        tmp[0]  = 147;
        tmp[1]  = Math.floor((Status['SPR'][0] + Status['SPR'][1] + Status['SPR'][2]) / 28) * 7;
        tmp[1] += (Flag['Honor'] ==  9) ? 6: 0; // 忌避すべき闇への道標
      break;
    }
    switch (a) {
      case 'RESFire':         // [138] 火炎耐性
        case 'RESIce':        // [139] 冷気耐性
        case 'RESLightning':  // [140] 電撃耐性
        case 'RESPoison':     // [141] 毒耐性                         [169] 毒の耐性段階
        case 'RESCharm':      // [142] 魅了耐性
        case 'RESLight':      // [143] 光耐性
        case 'RESDark':       // [144] 闇耐性
        case 'RESMagic':      // [145] 魔術耐性
        case 'RESPDebuff':    // [146] 身体的異常耐性
        case 'RESMDebuff':    // [147] 精神的異常耐性
        if (a == 'RESFire' || a == 'RESIce' || a == 'RESLightning') // ダークバインド
          if (Status['Job'][2] >= 25 && Status['Job'][2] <= 27)
            for (i=0;i<=6;i++)
              tmp[1] +=
                (Status['Equip'][i][0] % 10000 != 0 && Name['Gem'][1][Status['Equip'][i][2]][0] == '闇' && Status['Equip'][i][3] >= 1)
                  ? 2 + Math.floor((Status['Skill'][17][0] + Status['Skill'][17][1]) / 50): 0;
        if (a == 'RESPoison' || a == 'RESCharm' || a == 'RESMagic') // ホーリーディバイン
          if (Status['Job'][2] >= 18 && Status['Job'][2] <= 20)
            for (i=0;i<=6;i++)
              tmp[1] +=
                (Status['Equip'][i][0] % 10000 != 0 && Name['Gem'][1][Status['Equip'][i][2]][0] == '光' && Status['Equip'][i][3] >= 1)
                  ? 2 + Math.floor((Status['Skill'][12][0] + Status['Skill'][12][1]) / 50): 0;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
    }
  }

// 攻撃系 開かれている時だけ計算する
  if (Flag[2] == 3) {
    switch (a) {
      case 'WeaDAM':        // [ 21] 武器による物理ダメージ
        tmp[0] = 21;
        tmp[1] += (Flag['Honor'] == 6) ? 15: 0; // 猛り狂う豪腕
        tmp[1] += // ハイパワー
          (Status['Job'][2] >= 1 && Status['Job'][2] <= 3)
            ? 1 + Math.floor((Status['Skill'][0][0] + Status['Skill'][0][1]) / 10): 0;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMAnimal':     // [ 22] 動物類へのダメージ
        tmp[0] = 22;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMInsect':     // [ 23] 昆虫類へのダメージ
        tmp[0] = 23;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMReptilian':  // [ 24] 爬虫類へのダメージ
        tmp[0] = 24;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMDevil':      // [ 25] 悪魔系へのダメージ
        tmp[0] = 25;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMImmortal':   // [ 26] 不死系へのダメージ
        tmp[0] = 26;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMGhost':      // [ 27] 幽霊系へのダメージ
        tmp[0] = 27;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMInanimate':  // [ 28] 無生物へのダメージ
        tmp[0] = 28;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMRiding':     // [ 29] 騎乗キャラクターへのダメージ
        tmp[0] = 29;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMKD':         // [ 30] 転倒中の相手に対するダメージ
        tmp[0] = 30;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMOBJ':        // [ 31] オブジェクトへのダメージ
        tmp[0] = 31;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMMP':         // [ 32] MPダメージ量
        tmp[0] = 32;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMAura':       // [ 33] オーラダメージ
        case 'DAMFire':     // [ 34] 火炎オーラダメージ
        case 'DAMIce':      // [ 35] 冷気オーラダメージ
        case 'DAMLightning':// [ 36] 電撃オーラダメージ
        case 'DAMPoison':   // [ 37] 毒オーラダメージ
        case 'DAMLight':    // [ 38] 光オーラダメージ
        case 'DAMDark':     // [ 39] 闇オーラダメージ
          tmp[0] = new Array(33,34,35,36,37,38,39);
          tmp[1] = new Array( 0, 0, 0, 0, 0, 0, 0);
          tmp[2] = 0;
          tmp[3] = new Array( 0, 0, 0, 0, 0, 0, 0);
          if (EquipOpt[tmp[0][0]]) {
            for (i=0;i<EquipOpt[tmp[0][0]].length;i++) {
              if (EquipOpt[tmp[0][0]][i].search(/%/i) != -1)
                tmp[2] += Number(EquipOpt[tmp[0][0]][i].slice(0,-1));
              else
                tmp[1][0] += Number(EquipOpt[tmp[0][0]][i]);
            }
          }
          for (i=1;i<tmp[0].length;i++) {
            if (EquipOpt[tmp[0][i]]) {
              for (j=0;j<EquipOpt[tmp[0][i]].length;j++)
                tmp[1][i] += Number(EquipOpt[tmp[0][i]][j]);
            }
          }
          if (Flag['8_1']) { // フォックスグローブ
            tmp[4] = Math.floor((Status['Skill'][8][0] + Status['Skill'][8][1]) / 20);
            tmp[1][4] = 1 + Math.ceil(Status['Lev'][0] * (100 / 300)) + Math.ceil(tmp[4] * (100 / 30));
//            tmp[1][4] += // ビルトキシン未対応
//              (Status['Skill'][8][0] + Status['Skill'][8][1] >= 61)
//                ? Math.ceil(Math.floor((Status['Skill'][8][0] + Status['Skill'][8][1]) / (100 / 15)) * (100 / 30)): 0;
          }
          if (Flag['15_8']) { // ホーリーウェポン
            tmp[4] = Math.floor(Number($('InBuff_0').value) / (100 / 6));
            if      (tmp[4] == 0) tmp[1][5] += 5;
            else if (tmp[4] == 1) tmp[1][5] += 7;
            else if (tmp[4] == 2) tmp[1][5] += 9;
            else if (tmp[4] == 3) tmp[1][5] += 12;
            else if (tmp[4] == 4) tmp[1][5] += 16;
            else if (tmp[4] == 5) tmp[1][5] += 20;
            else if (tmp[4] == 6) tmp[1][5] += 24;
            else if (tmp[4] == 7) tmp[1][5] += 30;
            else if (tmp[4] == 8) tmp[1][5] += 36; // 以降未調査
            else if (tmp[4] == 9) tmp[1][5] += 42;
          }
          if (Flag['20_3']) { // グルーミーエフェクト
            tmp[4] = Math.floor(Number($('InBuff_0').value) / (100 / 8));
            if      (tmp[4] ==  0) tmp[1][6] += 73;
            else if (tmp[4] ==  1) tmp[1][6] += 82;
            else if (tmp[4] ==  2) tmp[1][6] += 92;
            else if (tmp[4] ==  3) tmp[1][6] += 103;
            else if (tmp[4] ==  4) tmp[1][6] += 114;
            else if (tmp[4] ==  5) tmp[1][6] += 125;
            else if (tmp[4] ==  6) tmp[1][6] += 137;
            else if (tmp[4] ==  7) tmp[1][6] += 150;
            else if (tmp[4] ==  8) tmp[1][6] += 162;
            else if (tmp[4] ==  9) tmp[1][6] += 177;
            else if (tmp[4] == 10) tmp[1][6] += 191; // 以降未調査
            else if (tmp[4] == 11) tmp[1][6] += 206;
          }
//          if (Flag['14_2']) { // エンハンスエンチャント
//            tmp[4] = Math.floor(Number($('InBuff_0').value) / (100 / 5));
//            if      (tmp[4] == 0) tmp[1][0] += 0;
//            else if (tmp[4] == 1) tmp[1][0] += 0;
//            else if (tmp[4] == 2) tmp[1][0] += 0;
//            else if (tmp[4] == 3) tmp[1][0] += 0;
//            else if (tmp[4] == 4) tmp[1][0] += 0;
//            else if (tmp[4] == 5) tmp[1][0] += 0;
//          }
          $('Status_' + tmp[0][0]).innerHTML = tmp[2];
          for (i=1;i<tmp[0].length;i++) {
            tmp[3][i] += (tmp[1][i]) ? tmp[1][0]: 0;
            tmp[3][i] += Math.ceil(tmp[1][i] * tmp[2] / 100);
            $('Status_' + tmp[0][i]).innerHTML = tmp[1][i] + tmp[3][i];
          }
      break;
      case 'MATKFire':      // [ 43] 火炎属性魔法攻撃力＋
        tmp[0] = 43;
        tmp[1] += (Flag['Honor'] == 3) ? 5: 0; // 脈動する猛火へ道標
      break;
      case 'MATKIce':       // [ 44] 冷気属性魔法攻撃力＋
        tmp[0] = 44;
        tmp[1] += (Flag['Honor'] == 4) ? 5: 0; // 渦巻く氷塊への道標
      break;
      case 'MATKLightning': // [ 45] 電撃属性魔法攻撃力＋
        tmp[0] = 45;
        tmp[1] += (Flag['Honor'] == 5) ? 5: 0; // 突破せし稲妻への道標
      break;
      case 'MATKPoison':    // [ 46] 毒属性魔法攻撃力＋
        tmp[0] = 46;
      break;
      case 'MATKLight':     // [ 47] 光属性魔法攻撃力＋
        tmp[0] = 47;
      break;
      case 'MATKDark':      // [ 48] 闇属性魔法攻撃力＋
        tmp[0] = 48;
      break;
      case 'Gdebuff':       // [ 80] 与debuff持続時間
        tmp[0] = 80;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RatePurler':    // [ 85] 落馬発生確率
        tmp[0] = 85;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RateKB':        // [ 86] ノックバック発生確率
        tmp[0] = 86;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RateBurn':      // [ 89] 火傷発生確率 (弱)              [ 90] 火傷発生確率 (強)
        tmp[0] = new Array(89,90);
      break;
      case 'RateStun':      // [ 91] 気絶発生確率 (弱)              [ 92] 気絶発生確率 (強)
        tmp[0] = new Array(91,92);
      break;
      case 'RateFrozen':    // [ 93] 凍傷発生確率 (弱)              [ 94] 凍傷発生確率 (強)
        tmp[0] = new Array(93,94);
      break;
      case 'RateKD':        // [ 95] 転倒発生確率 (弱)              [ 96] 転倒発生確率 (強)
        tmp[0] = new Array(95,96);
      break;
      case 'RatePoison':    // [ 97] 毒発生確率 (弱)                [ 98] 毒発生確率 (強)
        tmp[0] = new Array(97,98);
      break;
      case 'RateBleeding':  // [ 99] 出血発生確率 (弱)              [100] 出血発生確率 (強)
        tmp[0] = new Array(99,100);
      break;
      case 'RateSleep':     // [103] 睡眠発生確率 (弱)              [104] 睡眠発生確率 (強)
        tmp[0] = new Array(103,104);
      break;
      case 'RateMad':       // [105] 乱心発生確率 (弱)              [106] 乱心発生確率 (強)
        tmp[0] = new Array(105,106);
      break;
      case 'RateSilence':   // [107] 沈黙発生確率 (弱)              [108] 沈黙発生確率 (強)
        tmp[0] = new Array(107,108);
      break;
      case 'RateWeak':      // [109] 衰弱発生確率 (弱)              [110] 衰弱発生確率 (強)
        tmp[0] = new Array(109,110);
      break;
      case 'RateLP':        // [119] 最大LP減少発生確率 (弱)        [120] 最大LP減少発生確率 (強)
        tmp[0] = new Array(119,120);
      break;
      case 'RateDEF':       // [123] 防御力低下発生確率 (弱)        [124] 防御力低下発生確率 (強)
        tmp[0] = new Array(123,124);
      break;
      case 'RateSlowMove':  // [129] 移動速度減少発生確率 (弱)      [130] 移動速度減少発生確率 (強)
        tmp[0] = new Array(129,130);
      break;
    }
    switch (a) {
      case 'MATKFire':        // [ 43] 火炎属性魔法攻撃力＋
        case 'MATKIce':       // [ 44] 冷気属性魔法攻撃力＋
        case 'MATKLightning': // [ 45] 電撃属性魔法攻撃力＋
        case 'MATKPoison':    // [ 46] 毒属性魔法攻撃力＋
        case 'MATKLight':     // [ 47] 光属性魔法攻撃力＋
        case 'MATKDark':      // [ 48] 闇属性魔法攻撃力＋
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RateBurn':        // [ 89] 火傷発生確率 (弱)              [ 90] 火傷発生確率 (強)
        case 'RateStun':      // [ 91] 気絶発生確率 (弱)              [ 92] 気絶発生確率 (強)
        case 'RateFrozen':    // [ 93] 凍傷発生確率 (弱)              [ 94] 凍傷発生確率 (強)
        case 'RateKD':        // [ 95] 転倒発生確率 (弱)              [ 96] 転倒発生確率 (強)
        case 'RatePoison':    // [ 97] 毒発生確率 (弱)                [ 98] 毒発生確率 (強)
        case 'RateBleeding':  // [ 99] 出血発生確率 (弱)              [100] 出血発生確率 (強)
        case 'RateSleep':     // [103] 睡眠発生確率 (弱)              [104] 睡眠発生確率 (強)
        case 'RateMad':       // [105] 乱心発生確率 (弱)              [106] 乱心発生確率 (強)
        case 'RateSilence':   // [107] 沈黙発生確率 (弱)              [108] 沈黙発生確率 (強)
        case 'RateWeak':      // [109] 衰弱発生確率 (弱)              [110] 衰弱発生確率 (強)
        case 'RateLP':        // [119] 最大LP減少発生確率 (弱)        [120] 最大LP減少発生確率 (強)
        case 'RateDEF':       // [123] 防御力低下発生確率 (弱)        [124] 防御力低下発生確率 (強)
        case 'RateSlowMove':  // [129] 移動速度減少発生確率 (弱)      [130] 移動速度減少発生確率 (強)
        tmp[1] = new Array(100,100);
        tmp[2] = new Array(0,0);
        for (i=0;i<tmp[0].length;i++) {
          if (EquipOpt[tmp[0][i]]) {
            for (j=0;j<EquipOpt[tmp[0][i]].length;j++) {
              tmp[2][i] += tmp[1][i] * Number(EquipOpt[tmp[0][i]][j]) / 100;
              tmp[1][i] -= Number(EquipOpt[tmp[0][i]][j]);
            }
          }
        }
        $('Status_' + tmp[0][0]).innerHTML = tmp[2][0];
        $('Status_' + tmp[0][1]).innerHTML = tmp[2][1];
      break;
    }
  }

// 防御系 開かれている時だけ計算する
  else if (Flag[2] == 4) {
    switch (a) {
      case 'LPRecSPD':      // [  9] LP自然回復速度
        tmp[0] = 9;
        tmp[1] = Math.floor((Status['STA'][0] + Status['STA'][1] + Status['STA'][2]) / 10); // 体力でのボーナス
        if      ($('SelBuffClan_3').selectedIndex == 1) tmp[2] += 5; // フィジカルリカバリー
        else if ($('SelBuffClan_3').selectedIndex == 2) tmp[2] += 8;
        if      ($('SelBuffClan_8').selectedIndex == 1) tmp[2] += 10; // ヒーリング
        else if ($('SelBuffClan_8').selectedIndex == 2) tmp[2] += 20;
        else if ($('SelBuffClan_8').selectedIndex == 3) tmp[2] += 30;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[2] += Number(EquipOpt[tmp[0]][i]);
        tmp[1] += tmp[2];
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'MPRecSPD':      // [ 10] MP自然回復速度
        tmp[0] = 10;
        tmp[1] = Math.floor((Status['SPR'][0] + Status['SPR'][1] + Status['SPR'][2]) / 10); // 霊感でのボーナス
        tmp[2] += (Flag['14_0']) ? 0: 0; // ギブンリポーズ 未実装
        if      ($('SelBuffClan_4').selectedIndex == 1) tmp[2] += 5; // フィジカルスピリット
        else if ($('SelBuffClan_4').selectedIndex == 2) tmp[2] += 8;
        if      ($('SelBuffClan_8').selectedIndex == 1) tmp[2] += 10; // ヒーリング
        else if ($('SelBuffClan_8').selectedIndex == 2) tmp[2] += 20;
        else if ($('SelBuffClan_8').selectedIndex == 3) tmp[2] += 30;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[2] += Number(EquipOpt[tmp[0]][i]);
        tmp[1] += tmp[2];
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'LPRec':         // [ 12] LP自然回復量                   [ 14] 座っている時のLP回復量
        tmp[0] = new Array(12,14); // 未実装
        tmp[1] = Math.floor(Status['LP'] / 35) + Math.floor((Status['STA'][0] + Status['STA'][1] + Status['STA'][2]) / 3);
        for (i=0;i<tmp[0].length;i++) {
          if (EquipOpt[tmp[0][i]])
            for (j=0;j<EquipOpt[tmp[0][i]].length;j++)
              tmp[1] += Number(EquipOpt[tmp[0]][j]);
        }
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
        $('Status_' + tmp[0][1]).innerHTML = '---';
      break;
      case 'MPRec':         // [ 13] MP自然回復量                   [ 15] 座っている時のMP回復量
        tmp[0] = new Array(13,15); // 未実装
        tmp[1] = Math.floor(Status['MP'] / 25) + Math.floor((Status['SPR'][0] + Status['SPR'][1] + Status['SPR'][2]) / 3);
        for (i=0;i<tmp[0].length;i++) {
          if (EquipOpt[tmp[0][i]])
            for (j=0;j<EquipOpt[tmp[0][i]].length;j++)
              tmp[1] += Number(EquipOpt[tmp[0]][j]);
        }
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
        $('Status_' + tmp[0][1]).innerHTML = '---';
      break;
      case 'LPsec':         // [ 16] 2秒毎のLP回復量
        tmp[0] = 16;
        tmp[1] += (Flag['13_7']) ? 15 + Math.floor(Number($('InBuff_0').value) / 10) + Math.floor((Status['Skill'][13][0] + Status['Skill'][13][1]) / 10): 0; // リクライム
        tmp[1] += (Flag['13_9']) ?  7 + Math.floor(Number($('InBuff_0').value) / 5) + Math.floor((Status['Skill'][13][0] + Status['Skill'][13][1]) / 10): 0; // リストレーション
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'MPsec':         // [ 17] 2秒毎のMP回復量
        tmp[0] = 17;
        tmp[1] += (Flag['15_0']) ? 5: 0; // レックスナチュラリス
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESAnimal':     // [ 53] 動物類からの物理ダメージ軽減率
        tmp[0] = 53;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESInsect':     // [ 54] 昆虫類からの物理ダメージ軽減率
        tmp[0] = 54;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESReptilian':  // [ 55] 爬虫類からの物理ダメージ軽減率
        tmp[0] = 55;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESDevil':      // [ 56] 悪魔系からの物理ダメージ軽減率
        tmp[0] = 56;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESImmortal':   // [ 57] 不死系からの物理ダメージ軽減率
        tmp[0] = 57;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESGhost':      // [ 58] 幽霊系からの物理ダメージ軽減率
        tmp[0] = 58;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESInanimate':  // [ 59] 無生物からの物理ダメージ軽減率
        tmp[0] = 59;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DAMCut':        // [ 61] ダメージカット
        tmp[0] = 61;
        tmp[1] += (Flag['16_2']) ? 0: 0; // 平和の歌 未実装
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'EXP':           // [ 82] 獲得EXP＋
        tmp[0] = 82;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'SkillEXP':      // [ 83] 熟練度増加量
        tmp[0] = 83;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'Blocking':      // [133] ブロッキング解除耐性
        tmp[0] = 133;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESCast':       // [134] 詠唱妨害耐性
        tmp[0] = 134;
        tmp[1] = Status['SPR'][0] + Status['SPR'][1] + Status['SPR'][2];
        tmp[2] += (Flag['19_6']) ? 0: 0; // フォローウィンド 未実装
        tmp[2] += (Flag['Honor'] == 4) ? 2: 0; // 渦巻く氷塊への道標
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[2] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[2];
      break;
      case 'Reflection':    // [135] 近接物理ダメージ反射率
        tmp[0] = 135;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'DReflect':      // [136] Debuff反射確率
        tmp[0] = 136;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESDAura':      // [137] 闇オーラの反動ダメージ
        tmp[0] = 137;
        tmp[1] = (Status['Job'][2] == 27) ? 50: 50; // カラミティ：ダークフィッテスト 未実装
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
      case 'RESBurn':       // [148] 火傷耐性                       [163] 火傷の耐性段階
        tmp[0] = new Array(148,163);
        tmp[1] += (Flag['Honor'] == 3) ? 5: 0; // 脈動する猛火への道標
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESStun':       // [149] 気絶耐性                       [164] 気絶の耐性段階
        tmp[0] = new Array(149,164);
        tmp[1] += (Status['Skill'][11][0] + Status['Skill'][11][0] >= 26) ? 15: 0; // ラムセンス
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESFrozen':     // [150] 凍傷耐性                       [165] 凍傷の耐性段階
        tmp[0] = new Array(150,165);
        tmp[1] += (Status['Skill'][11][0] + Status['Skill'][11][0] >= 26) ? 15: 0; // ラムセンス
        tmp[1] += (Flag['Honor'] == 4) ? 5: 0; // 渦巻く氷塊への道標
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESKD':         // [151] 転倒耐性                       [166] 転倒の耐性段階
        tmp[0] = new Array(151,166);
        tmp[1] += (Status['Skill'][11][0] + Status['Skill'][11][0] >= 26) ? 15: 0; // ラムセンス
        tmp[1] += (Flag['Honor'] == 5) ? 5: 0; // 突破せし稲妻への道標
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESPurler':     // [152] 落馬耐性                       [167] 落馬の耐性段階
        tmp[0] = new Array(152,167);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESKB':         // [153] ノックバック耐性               [168] ノックバックの耐性段階
        tmp[0] = new Array(153,168);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESBleeding':   // [154] 出血耐性                       [170] 出血の耐性段階
        tmp[0] = new Array(154,170);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESSleep':      // [156] 睡眠耐性                       [172] 睡眠の耐性段階
        tmp[0] = new Array(156,172);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESMadness':    // [157] 乱心耐性                       [173] 乱心の耐性段階
        tmp[0] = new Array(157,173);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESSilence':    // [158] 沈黙耐性                       [174] 沈黙の耐性段階
        tmp[0] = new Array(158,174);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESCurse':      // [159] 呪い耐性                       [175] 呪いの耐性段階
        tmp[0] = new Array(159,175);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESWeakening':  // [160] 衰弱耐性                       [176] 衰弱の耐性段階
        tmp[0] = new Array(160,176);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESDisease':    // [161] 病気耐性                       [177] 病気の耐性段階
        tmp[0] = new Array(161,177);
        if (EquipOpt[tmp[0][0]])
          for (i=0;i<EquipOpt[tmp[0][0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0][0]][i]);
        $('Status_' + tmp[0][0]).innerHTML = tmp[1];
      break;
      case 'RESDebuff':     // [162] 被Debuff持続時間
        tmp[0] = 162;
        if (EquipOpt[tmp[0]])
          for (i=0;i<EquipOpt[tmp[0]].length;i++)
            tmp[1] += Number(EquipOpt[tmp[0]][i]);
        $('Status_' + tmp[0]).innerHTML = tmp[1];
      break;
    }
  }
// 技能効果値
  if (Flag[5]) {
    var Lev = Status['Lev'][0]
    var SPR = Status['SPR'][0] + Status['SPR'][1] + Status['SPR'][2];
    var INT = Status['INT'][0] + Status['INT'][1] + Status['INT'][2];
    var Mix = Status['Skill'][8][0] + Status['Skill'][8][1];   // 調合
    var Ban = Status['Skill'][13][0] + Status['Skill'][13][1]; // 慈愛
    var Ble = Status['Skill'][14][0] + Status['Skill'][14][1]; // 祝福
    var Hym = Status['Skill'][16][0] + Status['Skill'][16][1]; // 聖歌

    switch (a) {
      case 'FirstAid':      // ファーストエイド
        tmp = (Status['Job'][2] == 16 && Status['Lev'][0] >= 50)
          ? 25 + Lev * 2.5 + Ban * 2.8 + INT * 3
          : 25 + Lev * 2.5 + Ban * 1.4 + INT;
        $('ViewHeal_0_1').innerHTML = Math.floor(tmp * Status['LSk'] / 100);
      break;
      case 'Heal':          // ヒール
        tmp = (Status['Job'][2] == 16 && Status['Lev'][0] >= 50)
          ? 105 + Lev * 2 + Ban * 5 + INT * 10
          :  50 + Lev * 2 + Ban * 3 + INT * 6;
        $('ViewHeal_1_1').innerHTML = Math.floor(tmp * Status['LSk'] / 100);
      break;
      case 'Regenerate':    // リクライム
//        $('ViewHeal_*_1').innerHTML = 15 + Math.floor(Ban / 10) + Math.floor(SPR / 10);
      break;
      case 'HealingAura':   // ヒールスウェル
        tmp = (Status['Job'][2] == 16 && Status['Lev'][0] >= 50)
          ? 150 + Lev * 2 + Ban * 4 + INT * 8.5
          : 150 + Lev * 2 + Ban * 3 + INT * 6;
        $('ViewHeal_2_1').innerHTML = Math.floor(tmp * Status['LSk'] / 100);
      break;
      case 'Sanctuary':     // テンプルム
        tmp = 100 + Lev * 2 + Ban * 2 + INT * 2;
        $('ViewHeal_3_1').innerHTML = Math.floor(tmp * Status['LSk'] / 100);
      break;
      case 'Restoration':   // リストレーション
        $('ViewHeal_4_1').innerHTML = 7 + Math.floor(Ban / 10) + Math.floor(SPR / 5);
      break;
      case 'RecoveryBelt':  // リカバリーベルト
//        tmp = 25 + Lev * 2.5 + ?? * 1.4 + INT;
//        $('ViewHeal_*_1').innerHTML = Math.floor(tmp * Status['LSk'] / 100);
      break;
      case 'CharityAmulet': // 慈愛のアミュレット
//        tmp = 50 + Lev * 2 + 90 * 3 + INT * 6;
//        $('ViewHeal_*').innerHTML = Math.floor(tmp * Status['LSk'] / 100);
      break;
      case 'Velox':         // グラーティア
        tmp[0] = Math.floor(SPR / (100 / 6));
        tmp[1] = Math.ceil((tmp[0] + 1) * (100 / 6));
        document.getElementById('ViewBuff_0_1').innerHTML = '+' + (5 + Math.floor(tmp[0] * 1.9));
        document.getElementById('ViewBuff_0_3').innerHTML = tmp[1];
      break;
      case 'LapisMedio':    // ラピスメディオ
        tmp[0] = Math.floor(SPR / (100 / 3));
        tmp[1] = Math.floor(Ble / (100 / 4));
        tmp[2] = Math.ceil((tmp[0] + 1) * (100 / 3));
        document.getElementById('ViewBuff_1_1').innerHTML = '+' + (5 + tmp[0] + tmp[1]);
        document.getElementById('ViewBuff_1_3').innerHTML = tmp[2];
      break;
      case 'GroupBarrier':  // ウィンクルム
        document.getElementById('ViewBuff_2_1').innerHTML = '-' + (10 + Math.floor(Ble / 5));
      break;
      case 'BlessWeapon':   // ホーリーウェポン
        tmp[0] = Math.floor(SPR / (100 / 6));
        tmp[1] = Math.ceil((tmp[0] + 1) * (100 / 6));
        document.getElementById('ViewBuff_3_1').innerHTML = tmp[0] + Name['Text']['Skill']['Text'][2][Flag[0]];
        document.getElementById('ViewBuff_3_3').innerHTML = tmp[1];
      break;
      case 'Gloom':         // グルーミーエフェクト
        tmp[0] = Math.floor(SPR / (100 / 8));
        tmp[1] = Math.ceil((tmp[0] + 1) * (100 / 8));
        document.getElementById('ViewBuff_4_1').innerHTML = tmp[0] + Name['Text']['Skill']['Text'][2][Flag[0]];
        document.getElementById('ViewBuff_4_3').innerHTML = tmp[1];
      break;
      case 'Enchantment':   // エンハンスエンチャント
        document.getElementById('ViewBuff_5_1').innerHTML = 10 + Math.floor(Ble / (100 / 20));
        tmp[0] = (SPR >= 101) ? 4: Math.floor(SPR / (100 / 4));
        tmp[1] = Math.floor(SPR / (100 / 5));
        tmp[2] = Math.ceil((tmp[0] + 1) * (100 / 4));
        tmp[3] = Math.ceil((tmp[1] + 1) * (100 / 5));
        document.getElementById('ViewBuff_6_1').innerHTML = tmp[0] + tmp[1] + Name['Text']['Skill']['Text'][2][Flag[0]];
        document.getElementById('ViewBuff_6_3').innerHTML = (tmp[2] < tmp[3]) ? tmp[2]: tmp[3];
      break;
      case 'MinstrelSong':  // 詩人の歌
        tmp[0] = Math.floor(SPR / (100 / 13));
        tmp[1] = Math.floor(Hym / (100 / 13));
        tmp[2] = Math.ceil((tmp[0] + 1) * (100 / 13));
        document.getElementById('ViewBuff_7_1').innerHTML = '+' + (5 + tmp[0] + tmp[1]);
        document.getElementById('ViewBuff_7_3').innerHTML = tmp[2];
      break;
      case 'PeacefulHymn':  // 平和の歌
        document.getElementById('ViewBuff_8_1').innerHTML = '???';
        document.getElementById('ViewBuff_8_3').innerHTML = '---';
      break;
      case 'SageSong':      // 魔力の歌
        tmp[0] = Math.floor(SPR / (100 / 8));
        tmp[1] = Math.floor(Hym / (100 / 8));
        tmp[2] = Math.ceil((tmp[0] + 1) * (100 / 8));
        document.getElementById('ViewBuff_9_1').innerHTML = tmp[0] + tmp[1] + Name['Text']['Skill']['Text'][2][Flag[0]];
        document.getElementById('ViewBuff_9_3').innerHTML = tmp[2];
        document.getElementById('ViewBuff_10_1').innerHTML = '???';
        document.getElementById('ViewBuff_10_3').innerHTML = '---';
      break;
      case 'Toxify':        // フォックスグローブ
        document.getElementById('ViewOther_0_1').innerHTML = Math.floor(Mix / (100 / 5)) + Name['Text']['Skill']['Text'][2][Flag[0]];
      break;
      case 'ToxicAura':     // ビルトキシン
        document.getElementById('ViewOther_1_1').innerHTML = Math.floor(Mix / (100 / 15)) + Name['Text']['Skill']['Text'][2][Flag[0]];
      break;
    }
  }

// POT効果値
  if (Flag[6]) {
    switch (a) {
      case 'POT_A':
        document.getElementById('ViewPOT_0_1').innerHTML  = Math.floor(20 * Status['POT'] / 100);  // 肉塊
        document.getElementById('ViewPOT_1_1').innerHTML  = Math.floor(60 * Status['POT'] / 100);  // 痛み止め
        document.getElementById('ViewPOT_2_1').innerHTML  = Math.floor(120 * Status['POT'] / 100); // 傷薬
        document.getElementById('ViewPOT_3_1').innerHTML  = Math.floor(180 * Status['POT'] / 100); // 治療薬
        document.getElementById('ViewPOT_4_1').innerHTML  = Math.floor(450 * Status['POT'] / 100); // 特治療薬
        document.getElementById('ViewPOT_5_1').innerHTML  = Math.floor(145 * Status['POT'] / 100); // 神秘のポーション
        document.getElementById('ViewPOT_6_1').innerHTML  = Math.floor(10 * Status['POT'] / 100);  // 雪割草
        document.getElementById('ViewPOT_7_1').innerHTML  = Math.floor(25 * Status['POT'] / 100);  // 蓬莱草
        document.getElementById('ViewPOT_8_1').innerHTML  = Math.floor(200 * Status['POT'] / 100); // カボチャクッキー
        document.getElementById('ViewPOT_9_1').innerHTML  = Math.floor(150 * Status['POT'] / 100); // アスティアンキャンディ
      break;
      case 'POT_B':
        document.getElementById('ViewPOT_10_1').innerHTML = Math.floor(Status['LP'] * Math.ceil(5 * Status['POT']) / 10000);  // リボン付きシャンパン
        document.getElementById('ViewPOT_11_1').innerHTML = Math.floor(Status['LP'] * Math.ceil(15 * Status['POT']) / 10000); // 快復のポーション
        document.getElementById('ViewPOT_12_1').innerHTML = Math.floor(Status['LP'] * Math.ceil(30 * Status['POT']) / 10000); // 生命のポーション
        document.getElementById('ViewPOT_13_1').innerHTML = Math.floor(Status['LP'] * Math.ceil(18 * Status['POT']) / 10000); // テイワズ
      break;
    }
  }
// ts3.innerHTML = a;
}

//      case 'DPenalty':      // [ 84] デスペナルティー
//      break;
//      case 'RatePenalty':   // [ 87] 罰発生確率
//      break;
//      case 'RateStasis':    // [ 88] タイムステイシス発生確率
//      break;
//      case 'RateImmobile':  // [101] 移動不可発生確率 (弱)          [102] 移動不可発生確率 (強)
//      break;
//      case 'RateDisease':   // [111] 病気発生確率 (弱)              [112] 病気発生確率 (強)
//      break;
//      case 'RateCurse':     // [113] 呪い発生確率 (弱)              [114] 呪い発生確率 (強)
//      break;
//      case 'RateCorrosion': // [115] 腐食発生確率 (弱)              [116] 腐食発生確率 (強)
//      break;
//      case 'RateCastDelay': // [117] 詠唱遅延発生確率 (弱)          [118] 詠唱遅延発生確率 (強)
//      break;
//      case 'RateATK':       // [121] 攻撃力減少発生確率 (弱)        [122] 攻撃力減少発生確率 (強)
//      break;
//      case 'RateACC':       // [125] 命中力低下発生確率 (弱)        [126] 命中力低下発生確率 (強)
//      break;
//      case 'RateEVA':       // [127] 回避減少発生確率 (弱)          [128] 回避減少発生確率 (強)
//      break;
//      case 'RateProvoked':  // [131] 挑発発生確率 (弱)              [132] 挑発発生確率 (強)
//      break;
//      case 'RESImmobile':   // [155] 移動不可耐性                   [171] 移動不可の耐性段階
//      break;
//      case 'RateMuscle':    // [180] 脚力低下発生率
//      break;
//      case 'RateDebuff':    // [181] 与debuff成功率
//      break;
//      case 'Disabling':     // [182] 物理ダメージ無効化確率
//      break;
//      case 'DResist':       // [183] 耐性値減少
//      break;
//      case 'RateMPDam':     // [184] MPダメージ発生確率
//      break;
//      case 'LPAbsorp':      // [185] LP吸収量
//      break;
//      case 'RateLPAbsorp':  // [186] LP吸収確率
//      break;
//      case 'ValBleeding':   // [187] 出血効果量
//      break;
