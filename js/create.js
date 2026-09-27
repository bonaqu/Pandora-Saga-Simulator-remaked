var i,j,k,tmp;
tmp = ''; // -------------------- 攻撃タブ内
Name['Text']['ATK'] = new Array();
for (i=0,k=0;i<Set['ATK'].length;i++) {
  tmp += '<ul>';
  for (j=0;j<Set['ATK'][i].length;j+=2) {
    if (Set['ATK'][i][j] == 0) {
      tmp += '<li style="padding:2px 1px 0px 2px;margin:2px 0px 1px 0px;width:';
      tmp += (Set['ATK'][i][1 + j] == 1) ? 15: 107;
      tmp += 'px;height:16px;"></li>';
    } else {
      Name['Text']['ATK'][k] = new Array(Name['Option'][Set['ATK'][i][j]][3],Name['Option'][Set['ATK'][i][j]][4],Name['Option'][Set['ATK'][i][j]][5]);
      tmp += '<li id="TextATK_' + k + '" class="input_lt" style="margin:2px 0px 1px 0px;width:62px;height:14px;text-align:right;">' + Name['Option'][Set['ATK'][i][j]][3 + Flag[0]] + '</li>';
      tmp += '<li class="input_gt" style="margin:2px 1px 1px 0px;width:39px;height:14px;">';
      tmp += '  <ul>';
      tmp += '    <li id="Status_' + Set['ATK'][i][j] + '" style="width:30px;height:14px;text-align:right;">' + Set['ATK'][i][j] + '</li>';
      tmp += '  </ul>';
      tmp += (Set['ATK'][i][j + 1] == 1) ? '%': '';
      tmp += '</li>';
      k++;
    }
  }
  tmp += '</ul>';
}
$('ATKView').innerHTML = tmp;

tmp = ''; // -------------------- 防御タブ内
Name['Text']['RES'] = new Array();
for (i=0,k=0;i<Set['RES'].length;i++) {
  tmp += '<ul>';
  for (j=0;j<Set['RES'][i].length;j+=2) {
    if (Set['RES'][i][j] == 0) {
      tmp += '<li style="padding:2px 1px 0px 2px;margin:2px 0px 1px 0px;width:';
      tmp += (Set['RES'][i][1 + j] == 1) ? 15: 118;
      tmp += 'px;height:16px;"></li>';
    } else {
      Name['Text']['RES'][k] = new Array(Name['Option'][Set['RES'][i][j]][3],Name['Option'][Set['RES'][i][j]][4],Name['Option'][Set['RES'][i][j]][5]);
      tmp += '<li id="TextRES_' + k + '" class="input_lt" style="margin:2px 0px 1px 0px;width:73px;height:14px;text-align:right;">' + Name['Option'][Set['RES'][i][j]][3 + Flag[0]] + '</li>';
      tmp += '<li class="input_gt" style="margin:2px 1px 1px 0px;width:39px;height:14px;">';
      tmp += '  <ul>';
      tmp += '    <li id="Status_' + Set['RES'][i][j] + '" style="width:30px;height:14px;text-align:right;">' + Set['RES'][i][j] + '</li>';
      tmp += '  </ul>';
      tmp += (Set['RES'][i][j + 1] == 1) ? '%': '';
      tmp += '</li>';
      k++;
    }
  }
  tmp += '</ul>';
}
$('RESView').innerHTML = tmp;

tmp = ''; // -------------------- 補助欄生成
Name['Text']['Buff'] = new Array();
tmp += '<ul><li style="width:100%;"><ul><li id="Text_20" class="head" style="width:100%;text-align:center;">' + Name['Text'][20][Flag[0]] + '</li></ul>';
for (i=0,k=0;i<Set['Buff'][0].length;i+=3) {
  if (i == 0) { // 1列目
    tmp += '<ul><li style="margin-right:3px;padding:0px 3px 3px 3px;width:110px;"><ul>';
    tmp += '<li id="Text_21" class="input_lt" style="margin-top:3px;width:52px;height:14px;text-align:right;">' + Name['Text'][23][Flag[0]] + '</li>';
    tmp += '<li style="margin-top:3px;width:54px;height:18px;"><input type="text" id="InBuff_0" value="134" onchange="CalcSet(\'ALL\');" class="input_gt" style="width:50px;height:14px;text-align:right;" /></li>';
    tmp += '</ul><ul><li style="margin-top:3px;width:100%;height:18px;"></li></ul>';
  } else if (i == 3) { // 2列目
    tmp += '<ul><li style="margin-right:3px;padding:0px 3px 3px 3px;width:110px;"><ul>';
    tmp += '<li id="Text_22" class="input_lt" style="margin-top:3px;width:52px;height:14px;text-align:right;">' + Name['Text'][23][Flag[0]] + '</li>';
    tmp += '<li style="margin-top:3px;width:54px;height:18px;"><input type="text" id="InBuff_1" value="90" onchange="CalcSet(\'ALL\');" class="input_gt" style="width:50px;height:14px;text-align:right;" /></li>';
    tmp += '</ul><ul><li style="margin-top:3px;width:100%;height:18px;"></li></ul>';
  } else if (i == 6) { // 3列目
    tmp += '<ul><li style="margin-right:3px;padding:0px 3px 3px 3px;width:110px;"><ul>';
    tmp += '<li id="Text_23" class="input_lt" style="margin-top:3px;width:52px;height:14px;text-align:right;">' + Name['Text'][23][Flag[0]] + '</li>';
    tmp += '<li style="margin-top:3px;width:54px;height:18px;"><input type="text" id="InBuff_2" value="30" onchange="CalcSet(\'ALL\');" class="input_gt" style="width:50px;height:14px;text-align:right;" /></li>';
    tmp += '</ul><ul><li style="margin-top:3px;width:100%;height:18px;"></li></ul>';
  }
  for (j=0;j<Set['Buff'].length;j++) {
    if (Set['Buff'][j][i] == 0 && Set['Buff'][j][1 + i] == 0) {
      tmp += '<ul><li style="margin-top:3px;width:100%;height:16px;"></li></ul>';
    } else {
      tmp += '<ul><li id="Buff_' + Set['Buff'][j][i] + '_' + Set['Buff'][j][1 + i] + '" class="btn2_off" onclick="';
      if (Set['Buff'][j][2 + i] >= 2 && Set['Buff'][j][2 + i] <= 3) {
//      アナバシス、ムーブアシスト重複防止
             if (Set['Buff'][j][2 + i] ==  2) tmp += 'Flag[\'6_2\']=(!Flag[\'6_2\'])?1:0;Flag[\'11_0\']=0;';
        else if (Set['Buff'][j][2 + i] ==  3) tmp += 'Flag[\'6_2\']=0;Flag[\'11_0\']=(!Flag[\'11_0\'])?1:0;';
        tmp += '$(\'Buff_6_2\').className=(Flag[\'6_2\'])?\'btn2_on\':\'btn2_off\';$(\'Buff_11_0\').className=(Flag[\'11_0\'])?\'btn2_on\':\'btn2_off\';';
      } else if (Set['Buff'][j][2 + i] >= 4 && Set['Buff'][j][2 + i] <= 5) {
//      ウンジョー、グラーティア重複防止
             if (Set['Buff'][j][2 + i] ==  4) tmp += 'Flag[\'30_1\']=(!Flag[\'30_1\'])?1:0;Flag[\'14_3\']=0;';
        else if (Set['Buff'][j][2 + i] ==  5) tmp += 'Flag[\'30_1\']=0;Flag[\'14_3\']=(!Flag[\'14_3\'])?1:0;';
        tmp += '$(\'Buff_30_1\').className=(Flag[\'30_1\'])?\'btn2_on\':\'btn2_off\';$(\'Buff_14_3\').className=(Flag[\'14_3\'])?\'btn2_on\':\'btn2_off\';';
      } else if (Set['Buff'][j][2 + i] >= 6 && Set['Buff'][j][2 + i] <= 10) {
//      レジスト系重複防止
             if (Set['Buff'][j][2 + i] ==  6) tmp += 'Flag[\'18_8\']=(!Flag[\'18_8\'])?1:0;Flag[\'18_9\']=0;Flag[\'18_10\']=0;Flag[\'20_7\']=0;Flag[\'21_7\']=0;';
        else if (Set['Buff'][j][2 + i] ==  7) tmp += 'Flag[\'18_8\']=0;Flag[\'18_9\']=(!Flag[\'18_9\'])?1:0;Flag[\'18_10\']=0;Flag[\'20_7\']=0;Flag[\'21_7\']=0;';
        else if (Set['Buff'][j][2 + i] ==  8) tmp += 'Flag[\'18_8\']=0;Flag[\'18_9\']=0;Flag[\'18_10\']=(!Flag[\'18_10\'])?1:0;Flag[\'20_7\']=0;Flag[\'21_7\']=0;';
        else if (Set['Buff'][j][2 + i] ==  9) tmp += 'Flag[\'18_8\']=0;Flag[\'18_9\']=0;Flag[\'18_10\']=0;Flag[\'20_7\']=(!Flag[\'20_7\'])?1:0;Flag[\'21_7\']=0;';
        else if (Set['Buff'][j][2 + i] == 10) tmp += 'Flag[\'18_8\']=0;Flag[\'18_9\']=0;Flag[\'18_10\']=0;Flag[\'20_7\']=0;Flag[\'21_7\']=(!Flag[\'21_7\'])?1:0;';
        tmp += '$(\'Buff_18_8\').className=(Flag[\'18_8\'])?\'btn2_on\':\'btn2_off\';$(\'Buff_18_9\').className=(Flag[\'18_9\'])?\'btn2_on\':\'btn2_off\';$(\'Buff_18_10\').className=(Flag[\'18_10\'])?\'btn2_on\':\'btn2_off\';$(\'Buff_20_7\').className=(Flag[\'20_7\'])?\'btn2_on\':\'btn2_off\';$(\'Buff_21_7\').className=(Flag[\'21_7\'])?\'btn2_on\':\'btn2_off\';';
      } else {
        tmp += 'Flag[\'' + Set['Buff'][j][i] + '_' + Set['Buff'][j][1 + i] + '\']=(!Flag[\'' + Set['Buff'][j][i] + '_' + Set['Buff'][j][1 + i] + '\'])?1:0;this.className=(Flag[\'' + Set['Buff'][j][i] + '_' + Set['Buff'][j][1 + i] + '\'])?\'btn2_on\':\'btn2_off\';';
      }
      tmp += 'CalcSet(\'ALL\');" style="margin-top:3px;width:109px;height:16px;"><div id="TextBuff_' + k + '"';
      tmp += (Set['Buff'][j][2 + i] == 1) ? ' style="text-decoration:line-through;">': '>';
      if (Set['Buff'][j][i] == 30) {
//      石版の場合
        Name['Text']['Buff'][k] = Name['Rune'][Set['Buff'][j][1 + i]];
        tmp += Name['Text']['Buff'][k][Flag[0]];
      } else {
        Name['Text']['Buff'][k] = new Array();
        Name['Text']['Buff'][k][0] = (CountLength(Skill[0][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0]) <= 17) ? '<span title="' + Skill[0][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][3] + '" class="help">' + Skill[0][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0] + '</span>': '<span title="' + Skill[0][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0] + '\n' + Skill[0][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][3] + '" class="help">' + Skill[0][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0].slice(0,8) + '</span>';
        Name['Text']['Buff'][k][1] = (CountLength(Skill[1][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0]) <= 17) ? '<span title="' + Skill[1][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][3] + '" class="help">' + Skill[1][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0] + '</span>': '<span title="' + Skill[1][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0] + '\n' + Skill[1][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][3] + '" class="help">' + Skill[1][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0].slice(0,8) + '</span>';
        Name['Text']['Buff'][k][2] = (CountLength(Skill[2][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0]) <= 17) ? '<span title="' + Skill[2][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][3] + '" class="help">' + Skill[2][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0] + '</span>': '<span title="' + Skill[2][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0] + '\n' + Skill[2][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][3] + '" class="help">' + Skill[2][Set['Buff'][j][i]][Set['Buff'][j][1 + i]][0].slice(0,8) + '</span>';
        tmp += Name['Text']['Buff'][k][Flag[0]];
      }
      tmp += '</div></li></ul>';
      k++;
    }
  }
  tmp += '</li>';
}
tmp += '<li style="width:184px;">'; // クラン
tmp += '<ul><li id="Text_24" class="head" style="margin:3px 0px 0px 0px;width:100%;line-height:37px;text-align:center;">' + Name['Text'][26][Flag[0]] + '</li></ul>';
for (i=0;i<Name['Clan'].length;i++) {
  tmp += '<ul>';
  tmp += '<li id="BuffClan_' + i + '" style="margin-top:3px;width:100%;height:16px;"><select id="SelBuffClan_' + i + '" style="width:100%;height:16px;"><option value="0" selected="selected">' + Name['Clan'][i][1 + Flag[0]] + '</option>';
  for (j=1;j<=Name['Clan'][i][0];j++)
    tmp += '<option value="' + j + '">' + Name['Clan'][i][1 + Flag[0]] + ' Lv' + j + '</option>';
  tmp += '</select></li></ul>';
}
tmp += '</li>';
tmp += '<li style="padding:0px 3px;width:184px;">'; // 名誉
tmp += '<ul><li id="Text_25" class="head" style="margin:3px 0px 0px 0px;width:100%;line-height:37px;text-align:center;">' + Name['Text'][25][Flag[0]] + '</li></ul>';
for (i=0;i<Skill['Honor'].length;i++) {
  tmp += '<ul><li id="BuffHonor_' + i + '" onclick="';
  tmp += 'Flag[\'Honor\']=(Flag[\'Honor\']==' + (i + 1) + ')?0:' + (i + 1) + ';$(\'BuffHonor_0\').className=(Flag[\'Honor\']==1)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_1\').className=(Flag[\'Honor\']==2)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_2\').className=(Flag[\'Honor\']==3)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_3\').className=(Flag[\'Honor\']==4)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_4\').className=(Flag[\'Honor\']==5)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_5\').className=(Flag[\'Honor\']==6)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_6\').className=(Flag[\'Honor\']==7)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_7\').className=(Flag[\'Honor\']==8)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_8\').className=(Flag[\'Honor\']==9)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_9\').className=(Flag[\'Honor\']==10)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_10\').className=(Flag[\'Honor\']==11)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_11\').className=(Flag[\'Honor\']==12)?\'btn2_on\':\'btn2_off\';$(\'BuffHonor_12\').className=(Flag[\'Honor\']==13)?\'btn2_on\':\'btn2_off\';';
  tmp += 'CalcSet(\'ALL\');" class="btn2_off" style="margin-top:3px;width:183px;height:16px;"><div id="TextBuffHonor_' + i + '">' + Skill['Honor'][i][Flag[0]] + '</div></li></ul>';
}
tmp += '</li></ul></li></ul></li></ul>';
$('BUFFView').innerHTML = tmp;

tmp = ''; // -------------------- 体力とかのステータス欄生成
for (i=0,j=10;i<6;i++,j++) {
  tmp += '<ul>';
  tmp += '  <li id="Text_' + j + '" class="input_lt input_lt2_1" style="margin-top:2px;padding:2px 1px 0px 1px;width:30px;height:15px;text-align:center;">' + Name['Option'][i][3] + '</li>';
  tmp += '  <li class="input_gt" style="margin:2px 2px 0px 0px;width:67px;">';
  tmp += '    <ul>';
  tmp += '      <li id="Status' + Name['Option'][i][1] + '_0" style="width:20px;height:15px;text-align:right;">' + Status[Name['Option'][i][2]][0] + '</li>';
  tmp += '      <li style="width:5px;height:15px;">(</li>';
  tmp += '      <li id="Status' + Name['Option'][i][1] + '_1" style="width:14px;height:15px;text-align:right;">' + Status[Name['Option'][i][2]][0] + '</li>';
  tmp += '      <li id="Status' + Name['Option'][i][1] + '_2" style="padding-left:1px;width:6px;height:15px;"></li>';
  tmp += '      <li id="Status' + Name['Option'][i][1] + '_3" style="width:14px;height:15px;text-align:right;"></li>';
  tmp += '      <li style="width:7px;height:15px;">)</li>';
  tmp += '    </ul>';
  tmp += '  </li>';
  tmp += '</ul>';
  tmp += '<ul>';
  tmp += '  <li id="Status' + Name['Option'][i][1] + '_4" class="input_lt input_lt2_2" style="padding:3px 1px 0px 1px;width:30px;height:16px;text-align:center;">2P</li>';
  tmp += '  <li style="position:relative;width:70px;height:20px;">';
  tmp += '    <ul>';
  tmp += '      <li style="position:absolute;top:-1px;left:3px;"><input type="image" src="./image/interface/up1.png" alt="+1" title="+1" onclick="StatusMove(\'Status\',\'' + Name['Option'][i][2] + '\',1);CalcSet(\'' + Name['Option'][i][2] + '\');" style="margin-right:2px;" /><input type="image" src="./image/interface/up2.png" alt="+10" title="+10" onclick="StatusMove(\'Status\',\'' + Name['Option'][i][2] + '\',10);CalcSet(\'' + Name['Option'][i][2] + '\');" style="margin-right:2px;" /><input type="image" src="./image/interface/up3.png" alt="max" title="max" onclick="StatusMove(\'Status\',\'' + Name['Option'][i][2] + '\',99);CalcSet(\'' + Name['Option'][i][2] + '\');" /></li>';
  tmp += '    </ul>';
  tmp += '    <ul>';
  tmp += '      <li style="position:absolute;top:9px;left:3px;"><input type="image" src="./image/interface/down1.png" alt="-1" title="-1" onclick="StatusMove(\'Status\',\'' + Name['Option'][i][2] + '\',-1);CalcSet(\'' + Name['Option'][i][2] + '\');" style="margin-right:2px;" /><input type="image" src="./image/interface/down2.png" alt="-10" title="-10" onclick="StatusMove(\'Status\',\'' + Name['Option'][i][2] + '\',-10);CalcSet(\'' + Name['Option'][i][2] + '\');" style="margin-right:2px;" /><input type="image" src="./image/interface/down3.png" alt="min" title="min" onclick="StatusMove(\'Status\',\'' + Name['Option'][i][2] + '\',-99);CalcSet(\'' + Name['Option'][i][2] + '\');" /></li>';
  tmp += '    </ul>';
  tmp += '  </li>';
  tmp += '</ul>';
  tmp += '<ul><li class="line1" style="margin-top:2px;width:100%;height:1px;"></li></ul>';
  tmp += '<ul><li class="line2" style="width:100%;height:1px;"></li></ul>';
}
$('Status').innerHTML = tmp;

tmp = ''; // -------------------- LPとかのステータス欄生成
Name['Text']['Status'] = new Array();
for (i=0,k=0;i<Set['Status'].length;i++) {
  tmp += '<ul>';
  for (j=0;j<Set['Status'][i].length;j+=2) {
    if (Set['Status'][i][j] == 0) {
      tmp += '<li style="padding:2px 1px 0px 2px;margin:2px 0px 1px 0px;width:94px;height:16px;"></li>';
    } else {
      Name['Text']['Status'][k] = new Array(Name['Option'][Set['Status'][i][j]][3],Name['Option'][Set['Status'][i][j]][4],Name['Option'][Set['Status'][i][j]][5]);
      tmp += '<li id="TextStatus_' + k + '" class="input_lt" style="margin:2px 0px 1px 0px;width:49px;height:14px;text-align:right;">' + Name['Option'][Set['Status'][i][j]][3 + Flag[0]] + '</li>';
      tmp += '<li class="input_gt" style="margin:2px 1px 1px 0px;width:39px;height:14px;">';
      tmp += '  <ul>';
      tmp += '    <li id="Status_';
      tmp += (Set['Status'][i][j] == 52) ? Set['Status'][i][j] + '_' + j: Set['Status'][i][j];
      tmp += '" style="width:';
      tmp += (k == 0 || k == 1) ? '36': '30';
      tmp += 'px;height:14px;text-align:right;">' + j + ' ' + Set['Status'][i][j] + '</li>';
      tmp += '  </ul>';
      tmp += (Set['Status'][i][j + 1] == 1) ? '%': '';
      tmp += '</li>';
      k++;
    }
  }
  tmp += '</ul>';
}
$('StatusView').innerHTML = tmp;

tmp = ''; // -------------------- スキルリスト生成
for (i=0;i<Name['Skill'].length;i++) {
  Status['Skill']['D'][i] = 0;
  Status['Skill']['P'][i] = 0;
  if (i == 0 || i == 6 || i == 12 || i == 17 || i == 22) {
    if (i == 0) {
      for (j=1;j<=5;j++) {
        Status['Skill']['D'][i] += Skill['D'][Name['Job'][Status['Job'][2]][0]][j];
        Status['Skill']['P'][i] += Skill['P'][Status['Job'][2]][j];
      }
    } else if (i == 6) {
      for (j=6;j<=10;j++) {
        Status['Skill']['D'][i] += Skill['D'][Name['Job'][Status['Job'][2]][0]][j];
        Status['Skill']['P'][i] += Skill['P'][Status['Job'][2]][j];
      }
    } else if (i == 12) {
      for (j=11;j<=14;j++) {
        Status['Skill']['D'][i] += Skill['D'][Name['Job'][Status['Job'][2]][0]][j];
        Status['Skill']['P'][i] += Skill['P'][Status['Job'][2]][j];
      }
    } else if (i == 17) {
      for (j=15;j<=18;j++) {
        Status['Skill']['D'][i] += Skill['D'][Name['Job'][Status['Job'][2]][0]][j];
        Status['Skill']['P'][i] += Skill['P'][Status['Job'][2]][j];
      }
    } else if (i == 22) {
      for (j=19;j<=20;j++) {
        Status['Skill']['D'][i] += Skill['D'][Name['Job'][Status['Job'][2]][0]][j];
        Status['Skill']['P'][i] += Skill['P'][Status['Job'][2]][j];
      }
    }
    Status['Skill'][i] = new Array(Status['Skill']['D'][i],0,Status['Skill']['P'][i],0);
    tmp += '<ul>';
    tmp += '  <li class="input_lt lt2" style="margin-top:2px;padding-left:6px;width:348px;">';
    tmp += '    <ul>';
    tmp += '      <li id="TextSkill_' + i + '" style="width:219px;">' + Name['Skill'][i][1 + Flag[0]] + '</li>';
    tmp += '      <li id="Skill_' + i + '_1" class="col_txt_green" style="width:20px;text-align:right;">' + Status['Skill'][i][0] + '</li>';
    tmp += '      <li style="padding-left:1px;width:6px;">/</li>';
    tmp += '      <li id="Skill_' + i + '_2" class="col_txt_blue" style="width:20px;text-align:right;">' + Status['Skill'][i][2] + '</li>';
    tmp += '    </ul>';
    tmp += '  </li>';
    tmp += '</ul>';
  } else {
    j = i;
    j -= (i >= 6) ? 1: 0;
    j -= (i >= 12) ? 1: 0;
    j -= (i >= 17) ? 1: 0;
    j -= (i >= 22) ? 1: 0;
    Status['Skill'][i] = new Array(Skill['D'][Name['Job'][Status['Job'][2]][0]][j],0,Skill['P'][Status['Job'][2]][j],0);
    tmp += '<ul>';
    tmp += '  <li id="TextSkill_' + i + '" class="input_lt2_2 ';
    tmp += (i == 5 || i == 11 || i == 16 || i == 21 || i == 24) ? 'lt4': 'lt3';
    tmp += '" style="margin-left:6px;padding:1px 0px 0px 0px;width:35px;line-height:18px;text-align:center;">';
    if (Flag[0] == 1)
      tmp += (Name['Skill'][i][1 + Flag[0]].length >= 5) ? '<span title="' + Name['Skill'][i][1 + Flag[0]] + '" class="help">' + Name['Skill'][i][1 + Flag[0]].slice(0,4) + '</span>': Name['Skill'][i][Flag[0]];
    else
      tmp += Name['Skill'][i][1 + Flag[0]];
    tmp += '</li>';
    tmp += '  <li class="input_gt ';
    tmp += (i == 5 || i == 11 || i == 16 || i == 21 || i == 24) ? 'lt5': 'lt3';
    tmp += '" style="padding-left:3px;width:302px;height:17px;">';
    tmp += '    <ul>';
    tmp += '      <li id="Skill_' + i + '_0" onclick="CalcSet(\'Skill\',' + i + ',\'\',event);" style="width:121px;height:14px;"></li>';
    tmp += '      <li style="padding:1px 0px 0px 2px;width:57px;height:14px;"><input type="image" src="./image/interface/left3.png" alt="min" title="min" onclick="CalcSet(\'Skill\',' + i + ',-120,\'Adeptness\');" style="margin-right:2px;" /><input type="image" src="./image/interface/left2.png" alt="-10" title="-10" onclick="CalcSet(\'Skill\',' + i + ',-10,\'Adeptness\');" style="margin-right:2px;" /><input type="image" src="./image/interface/left1.png" alt="-1" title="-1" onclick="CalcSet(\'Skill\',' + i + ',-1,\'Adeptness\');" style="margin-right:5px;" /><input type="image" src="./image/interface/right1.png" alt="+1" title="+1" onclick="CalcSet(\'Skill\',' + i + ',1,\'Adeptness\');" style="margin-right:2px;" /><input type="image" src="./image/interface/right2.png" alt="+10" title="+10" onclick="CalcSet(\'Skill\',' + i + ',10,\'Adeptness\');" style="margin-right:2px;" /><input type="image" src="./image/interface/right3.png" alt="max" title="max" onclick="CalcSet(\'Skill\',' + i + ',120,\'Adeptness\');" /></li>';
    tmp += '      <li id="Skill_' + i + '_1" class="col_txt_green" style="padding-top:1px;width:20px;height:14px;text-align:right;">' + Status['Skill'][i][0] + '</li>';
    tmp += '      <li style="padding:1px 0px 0px 1px;width:6px;height:14px;">/</li>';
    tmp += '      <li id="Skill_' + i + '_2" class="col_txt_blue" style="padding-top:1px;width:20px;height:14px;text-align:right;">' + Status['Skill'][i][2] + '</li>';
    tmp += '      <li style="padding:1px 0px 0px 2px;width:57px;height:14px;"><input type="image" src="./image/interface/left3.png" alt="min" title="min" onclick="CalcSet(\'Skill\',' + i + ',-120,\'Potential\');" style="margin-right:2px;" /><input type="image" src="./image/interface/left2.png" alt="-10" title="-10" onclick="CalcSet(\'Skill\',' + i + ',-10,\'Potential\');" style="margin-right:2px;" /><input type="image" src="./image/interface/left1.png" alt="-1" title="-1" onclick="CalcSet(\'Skill\',' + i + ',-1,\'Potential\');" style="margin-right:5px;" /><input type="image" src="./image/interface/right1.png" alt="+1" title="+1" onclick="CalcSet(\'Skill\',' + i + ',1,\'Potential\');" style="margin-right:2px;" /><input type="image" src="./image/interface/right2.png" alt="+10" title="+10" onclick="CalcSet(\'Skill\',' + i + ',10,\'Potential\');" style="margin-right:2px;" /><input type="image" src="./image/interface/right3.png" alt="max" title="max" onclick="CalcSet(\'Skill\',' + i + ',120,\'Potential\');" /></li>';
    tmp += '      <li id="Skill_' + i + '_3" class="col_txt_red" style="padding-top:1px;width:14px;height:14px;text-align:right;">' + SPt[Status['Skill'][i][2]][1] + '</li>';
    tmp += '    </ul>';
    tmp += '  </li>';
    tmp += '</ul>';
  }
}
$('SkillSet').innerHTML = tmp;

tmp = ''; // -------------------- 技能効果値欄生成
for (i=0;i<Name['Text']['Skill']['Heal'].length;i++) {
  tmp += '<ul>';
  tmp += '  <li id="ViewHeal_' + i + '_0" class="input_lt" style="margin:2px 0px 0px 3px;width:95px;height:14px;text-align:right;">' + Name['Text']['Skill']['Heal'][i][Flag[0]] + '</li>';
  tmp += '  <li class="input_gt" style="margin:2px 2px 0px 0px;width:39px;">';
  tmp += '    <ul><li id="ViewHeal_' + i + '_1" style="width:30px;height:14px;text-align:right;">---</li></ul>';
  tmp += '  </li>';
  tmp += '  <li style="margin-top:2px;width:69px;height:19px;"></li>';
  tmp += '</ul>';
}
tmp += '<ul><li class="line1" style="margin-top:2px;width:100%;height:1px;"></li></ul>';
tmp += '<ul><li class="line2" style="width:100%;height:1px;"></li></ul>';
for (i=0;i<Name['Text']['Skill']['Buff'].length;i++) {
  tmp += '<ul>';
  tmp += '  <li id="ViewBuff_' + i + '_0" class="input_lt" style="margin:2px 0px 0px 3px;width:95px;height:14px;text-align:right;">' + Name['Text']['Skill']['Buff'][i][Flag[0] + 1] + '</li>';
  tmp += '  <li class="input_gt" style="margin:2px 2px 0px 0px;width:39px;">';
  tmp += '    <ul><li id="ViewBuff_' + i + '_1" style="width:';
  tmp += (Name['Text']['Skill']['Buff'][i][0] == 2) ? 36: 30;
  tmp += 'px;height:14px;text-align:right;">---</li>';
  tmp += (Name['Text']['Skill']['Buff'][i][0] == 1) ? '%': '';
  tmp += '    </ul>';
  tmp += '  </li>';
  tmp += '  <li id="ViewBuff_' + i + '_2" style="margin-top:2px;width:49px;line-height:19px;">' + Name['Text']['Skill']['Text'][0][Flag[0]] + '</li>';
  tmp += '  <li id="ViewBuff_' + i + '_3" class="col_txt_blue" style="margin-top:2px;width:20px;line-height:19px;text-align:right;">';
  tmp += (Name['Text']['Skill']['Buff'][i][1] == 'ウィンクルム' || Name['Text']['Skill']['Buff'][i][1].search(/エンハ \(魔攻\)/i) != -1) ? '': '---';
  tmp += '</li>';
  tmp += '</ul>';
}
for (i=0;i<Name['Text']['Skill']['Other'].length;i++) {
  tmp += '<ul>';
  tmp += '  <li id="ViewOther_' + i + '_0" class="input_lt" style="margin:2px 0px 0px 3px;width:95px;height:14px;text-align:right;">' + Name['Text']['Skill']['Other'][i][Flag[0] + 1] + '</li>';
  tmp += '  <li class="input_gt" style="margin:2px 2px 0px 0px;width:39px;">';
  tmp += '    <ul><li id="ViewOther_' + i + '_1" style="width:';
  tmp += (Name['Text']['Skill']['Other'][i][0] == 2) ? 36: 30;
  tmp += 'px;height:14px;text-align:right;">---</li>';
  tmp += (Name['Text']['Skill']['Other'][i][0] == 1) ? '%': '';
  tmp += '    </ul>';
  tmp += '  </li>';
  tmp += '  <li style="margin-top:2px;width:69px;height:19px;"></li>';
  tmp += '</ul>';
}
$('SkillView').innerHTML = tmp;

tmp = ''; // -------------------- POT効果値生成
for (i=0;i<Name['POT'].length;i++) {
  tmp += '<ul>';
  tmp += '  <li id="ViewPOT_' + i + '_0" class="input_lt" style="margin:2px 0px 0px 3px;width:95px;height:14px;text-align:right;">' + Name['POT'][i][Flag[0]] + '</li>';
  tmp += '  <li class="input_gt" style="margin:2px 2px 0px 0px;width:39px;">';
  tmp += '    <ul><li id="ViewPOT_' + i + '_1" style="width:30px;height:14px;text-align:right;">---</li></ul>';
  tmp += '  </li>';
  tmp += '  <li style="margin-top:2px;width:69px;height:19px;"></li>';
  tmp += '</ul>';
}
tmp += '<ul><li class="line1" style="margin-top:2px;width:100%;height:1px;"></li></ul>';
tmp += '<ul><li class="line2" style="width:100%;height:1px;"></li></ul>';
tmp += '<ul><li style="width:214px;height:84px;"></li></ul>'
$('POTView').innerHTML = tmp;
