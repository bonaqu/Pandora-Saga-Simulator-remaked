function TextSet() {
  var i,j,k,tmp,xx;
  $('TextMenu').innerHTML = Name['Menu'][Flag[0]];
  for (i=0;i<Name['Tab'].length;i++)
    $('TextTab_' + i).innerHTML = Name['Tab'][i][Flag[0]];

  for (i=0;i<Name['Text']['ATK'].length;i++)
    $('TextATK_' + i).innerHTML = Name['Text']['ATK'][i][Flag[0]];
  for (i=0;i<Name['Text']['RES'].length;i++)
    $('TextRES_' + i).innerHTML = Name['Text']['RES'][i][Flag[0]];
  for (i=0;i<Name['Text']['Buff'].length;i++)
    $('TextBuff_' + i).innerHTML = Name['Text']['Buff'][i][Flag[0]];
  for (i=0;i<Name['Clan'].length;i++) {
    xx  = (i == 0) ? 'CalcSet(\'Clan\');': 'CalcSet(\'ALL\');';
    tmp = '<select id="SelBuffClan_' + i + '" onchange="' + xx + '" onkeypress="' + xx + '" style="width:100%;height:16px;"><option value="0" selected="selected">' + Name['Clan'][i][1 + Flag[0]] + '</option>';
    for (j=1;j<=Name['Clan'][i][0];j++)
      tmp += '<option value="' + j + '">' + Name['Clan'][i][1 + Flag[0]] + ' Lv' + j + '</option>';
    tmp += '</select>';
    $('BuffClan_' + i).innerHTML = tmp;
  }
  for (i=0;i<Skill['Honor'].length;i++)
    $('TextBuffHonor_' + i).innerHTML = Skill['Honor'][i][Flag[0]];

  for (i=0;i<=2;i++)
    $('TextFile_' + i).innerHTML = Name['Text'][i][Flag[0]];
  for (i=0,k=3;i<6;i++,k++)
    $('TextFile_' + k).innerHTML = Name['Option'][i][3 + Flag[0]];
  for (i=0,k=9;i<Name['Skill'].length;i++,k++)
    $('TextFile_' + k).innerHTML = (Name['Skill'][i][1 + Flag[0]].length >= 5) ? '<span title="' + Name['Skill'][i][1 + Flag[0]] + '" class="help">' + Name['Skill'][i][1 + Flag[0]].slice(0,4) + '</span>': Name['Skill'][i][1 + Flag[0]];
  for (i=1,k=34;i<Name['Equip'].length;i++,k++) {
    tmp = Name['Equip'][i][Flag[0]];
    $('TextFile_' + k).innerHTML = (i == 9 || i == 12) ? tmp + '1': tmp;
    if (i == 9 || i == 12) {
      k++;
      $('TextFile_' + k).innerHTML = tmp + '2';
    }
  }

  RJChange('Race');
  $('StatusRace').innerHTML = Name['Race'][Status['Job'][0]][Flag[0]];
  RJChange('RSkill');
  $('StatusRSkill').innerHTML = Name['Race']['Skill'][Status['Job'][0]][Status['Job'][1]][Flag[0]];
  RJChange('Job');
  $('StatusJob').innerHTML = Name['Job'][Status['Job'][2]][2 + Flag[0]];

  $('Title').innerHTML = Name['Title'][1 + Flag[0]] + '&nbsp;' + Name['Title'][0];
  for (i=0;i<Name['Text'].length;i++)
    $('Text_' + i).innerHTML = Name['Text'][i][Flag[0]];
  for (i=0;i<Name['Text']['Status'].length;i++)
    $('TextStatus_' + i).innerHTML = Name['Text']['Status'][i][Flag[0]];
  for (i=0;i<Name['Skill'].length;i++) {
    if (Flag[0] == 1 && i != 0 && i != 6 && i != 12 && i != 17 && i != 22)
      $('TextSkill_' + i).innerHTML = (Name['Skill'][i][1 + Flag[0]].length >= 5) ? '<span title="' + Name['Skill'][i][1 + Flag[0]] + '" class="help">' + Name['Skill'][i][1 + Flag[0]].slice(0,4) + '</span>': Name['Skill'][i][1 + Flag[0]];
    else
      $('TextSkill_' + i).innerHTML = Name['Skill'][i][1 + Flag[0]];
  }
  for (i=0;i<Name['Text']['Skill']['Heal'].length;i++)
    $('ViewHeal_' + i + '_0').innerHTML = Name['Text']['Skill']['Heal'][i][Flag[0]];
  for (i=0;i<Name['Text']['Skill']['Buff'].length;i++) {
    $('ViewBuff_' + i + '_0').innerHTML = Name['Text']['Skill']['Buff'][i][Flag[0] + 1];
    $('ViewBuff_' + i + '_2').innerHTML = (Name['Text']['Skill']['Buff'][i][1] == 'ウィンクルム' || Name['Text']['Skill']['Buff'][i][1].search(/エンハ \(魔攻\)/i) != -1) ? '': Name['Text']['Skill']['Text'][0][Flag[0]];
  }
  for (i=0;i<Name['Text']['Skill']['Other'].length;i++)
    $('ViewOther_' + i + '_0').innerHTML = Name['Text']['Skill']['Other'][i][Flag[0] + 1];
  for (i=0;i<Name['POT'].length;i++)
    $('ViewPOT_' + i + '_0').innerHTML = Name['POT'][i][Flag[0]];
  tmp = '<select onchange="$(\'SelEquip_0_2\').selectedIndex=this.selectedIndex;Status[\'Equip\'][0][2]=this.selectedIndex;$(\'SelEquip_1_2\').selectedIndex=this.selectedIndex;Status[\'Equip\'][1][2]=this.selectedIndex;$(\'SelEquip_2_2\').selectedIndex=this.selectedIndex;Status[\'Equip\'][2][2]=this.selectedIndex;$(\'SelEquip_3_2\').selectedIndex=this.selectedIndex;Status[\'Equip\'][3][2]=this.selectedIndex;$(\'SelEquip_4_2\').selectedIndex=this.selectedIndex;Status[\'Equip\'][4][2]=this.selectedIndex;$(\'SelEquip_5_2\').selectedIndex=this.selectedIndex;Status[\'Equip\'][5][2]=this.selectedIndex;$(\'SelEquip_6_2\').selectedIndex=this.selectedIndex;Status[\'Equip\'][6][2]=this.selectedIndex;CalcSet(\'ALL\');" style="width:81px;height:16px;">';
  for (i=0;i<Name['Gem'][1].length;i++)
    tmp += (i == 0) ? '<option selected="selected">' + Name['Gem'][1][i][Flag[0]] + '</option>': '<option>' + Name['Gem'][1][i][Flag[0]] + '</option>';
  $('SelGem').innerHTML = tmp + '</select>';

  for (i=0;i<Name['Equip'].length;i++)
    $('TextEquip_' + i).innerHTML = Name['Equip'][i][Flag[0]];
/* --
hh='';
for (i=0;i<=13;i++)
  hh += Status['Equip'][i]+'<br />';
ts.innerHTML=hh;

la = '';
for (i=0;i<Name['Skill'].length;i++) {
  la += 'i:' + i + ' ' + Status['Skill'][i] + '<br />';
}
ts2.innerHTML = '<div style="z-index:99;background:#fff;">' + la + '</div>';
-- */

  ListCreate('Set');
  ListCreate('Equip');
  ListCreate('Soul');
  ListCreate('SoulSelect');
  ListCreate('SoulCheck');
  CalcSet('ALL');
}
// -------------------------------------------------------------------------------------
function RJChange(a) {
  var a,i,tmp;
  tmp = new Array();
  tmp[0] = '<select id="Sel' + a + '"';
  switch (a) {
    case 'Race':
      tmp[2] = 'StatusSet(\'Status\',\'Race\');RJChange(\'RSkill\');RJText(\'Race\');RJText(\'RSkill\');ListCreate(\'Equip\');ListCreate(\'SoulCheck\');CalcSet(\'ALL\');';
      tmp[0] += ' size="3" onchange="' + tmp[2] + '" onkeypress="' + tmp[2] + '" style="width:142px;">';
      for (i=0;i<Name['Race'].length;i++) {
        tmp[1] = (i == Status['Job'][0]) ?  selected="selected": '';
        tmp[0] += '<option value="' + i + '"' + tmp[1] + '>' + Name['Race'][i][Flag[0]] + '</option>';
      }
    break;
    case 'RSkill':
      tmp[2] = 'Status[\'Job\'][1]=this.selectedIndex;RJText(\'RSkill\');CalcSet(\'ALL\');';
      tmp[0] += ' size="3" onchange="' + tmp[2] + '" onkeypress="' + tmp[2] + '" style="width:142px;">';
      for (i=0;i<Name['Race']['Skill'][Status['Job'][0]].length;i++) {
        tmp[1] = (i == Status['Job'][1]) ?  selected="selected": '';
        tmp[0] += '<option value="' + i + '"' + tmp[1] + '>' + Name['Race']['Skill'][Status['Job'][0]][i][Flag[0]] + '</option>';
      }
    break;
    case 'Job':
      tmp[0] += ' size="8" onchange="CalcSet(\'Job\');" onkeypress="CalcSet(\'Job\');" style="width:144px;">';
      for (i=0;i<Name['Job'].length;i++) {
        tmp[1] = (i == Status['Job'][2]) ?  selected="selected": '';
        tmp[0] += '<option value="' + i + '"' + tmp[1] + '>' + Name['Job']['Sel'][i][Flag[0]] + Name['Job'][i][2 + Flag[0]] + '</option>';
      }
    break;
  }
  tmp[0] += '</select>';
  $('In' + a).innerHTML = tmp[0];
}
// -------------------------------------------------------------------------------------
function RJText(a) {
  var a,tmp;
  tmp = new Array();
  tmp[0] = 'Status' + a;
  switch (a) {
    case 'Race'  : tmp[1] = Name['Race'][Status['Job'][0]][Flag[0]]; break;
    case 'RSkill': tmp[1] = Name['Race']['Skill'][Status['Job'][0]][Status['Job'][1]][Flag[0]]; break;
    case 'Job'   : tmp[1] = Name['Job'][Status['Job'][2]][2 + Flag[0]]; break;
  }
  $(tmp[0]).innerHTML = tmp[1];
}
// -------------------------------------------------------------------------------------
function ListCreate(a) {
  var a,i,j,k,l,tmp,sel,aa,xx,yy,zz;
  tmp = new Array();
  xx = new Array();
  yy = new Array();
  zz = new Array();
  switch (a) {
    case 'Equip':
      xx[0] = 44;
      xx[1] = 10; // 装備可能種族フラグ開始番号
      xx[2] = 16; // 装備可能職業フラグ開始番号
      xx[3] = new Array();
      for (i=0;i<=13;i++)
        tmp[i] = new Array();
      for (i=0;i<xx[0];i++) {
        aa  = 'Status[\'Equip\'][' + i + '][0]=this.value;ListCreate(\'SoulCheck\');';
        aa += (i == 0) ? 'CalcSet(\'Weapon\');': '';
        aa += 'CalcSet(\'Equip\');';
        tmp[i]  = '<select id="SelEquip_' + i + '_0" onchange="' + aa + '" onkeypress="' + aa + '" style="width:225px;height:16px;">';
        yy[i] = new Array();
        zz[i] = new Array();
      }
      for (i=0;i<xx[0];i++) {
        for (j=0;j<EquipData[0][i].length;j++) {
          if (j == 0) {
            zz[i].push(i * 10000 + j);
            yy[i][j] += '<option value="' + (i * 10000 + j) + '" class="col_bg2">' + EquipData[Flag[0]][i][j][0] + '</option>';
          } else if (EquipData[0][i][j][xx[1] + Status['Job'][0]] && EquipData[0][i][j][xx[2] + Status['Job'][2]]) {
            zz[i].push(i * 10000 + j);
            yy[i][j] += '<option value="' + (i * 10000 + j) + '">Lv:' + zeroPadding(2,1,EquipData[0][i][j][4]) + ' ' + EquipData[Flag[0]][i][j][0] + '</option>';
          }
        }
      }
      for (i=0;i<=13;i++) tmp[0] += yy[i];
      tmp[1] += yy[20];
      for (i=0;i<=5;i++) tmp[i + 2] += yy[i + 30];
      tmp[8] += yy[40];tmp[9] += yy[40];
      tmp[10] += yy[41];
      tmp[11] += yy[42];
      tmp[12] += yy[43];tmp[13] += yy[43];
      zz[0] += ',';
      for (i=1;i<=13;i++) zz[0] += (i == 13) ? zz[i]: zz[i] + ',';
      zz[0] = zz[0].split(',')
      zz[1] = zz[20];
      for (i=0;i<=5;i++) zz[i + 2] = zz[i + 30];
      zz[8] = zz[40];zz[9] = zz[40];
      zz[10] = zz[41];
      zz[11] = zz[42];
      zz[12] = zz[43];zz[13] = zz[43];
      for (i=0;i<=13;i++) {
        $('Equip_' + i + '_0').innerHTML = tmp[i] + '</select>';

        xx[3][0] = Math.floor(Status['Equip'][i][0] / 10000);
        xx[3][1] = Status['Equip'][i][0] % 10000;
        for (j=0;j<zz[i].length;j++) {
          xx[3][2] = Math.floor(zz[i][j] / 10000);
          xx[3][3] = zz[i][j] % 10000;
          if (xx[3][0] == xx[3][2] && xx[3][1] == xx[3][3]) {
            $('SelEquip_' + i + '_0').selectedIndex = j;
            break;
          } else if (zz[i][j] > Status['Equip'][i][0]) {
            $('SelEquip_' + i + '_0').selectedIndex = 0;
            Status['Equip'][i][0] = 0;
            break;
          }
        }
      }
    break;
    case 'Set':
      for (i=0;i<=13;i++) {
        aa = new Array(
          'Status[\'Equip\'][' + i + '][1]=this.selectedIndex;CalcSet(\'Equip\');'
         ,'Status[\'Equip\'][' + i + '][2]=this.selectedIndex;CalcSet(\'Equip\');'
        );
        aa[2]  = 'Status[\'Equip\'][' + i + '][3]=this.selectedIndex;';
        aa[2] += (i == 0) ? 'CalcSet(\'Weapon\');': '';
        aa[2] += 'CalcSet(\'Equip\');';
        tmp[i] = new Array();
        tmp[i][0] = '<select id="SelEquip_' + i + '_1" onchange="' + aa[0] + '" onkeypress="' + aa[0] + '" style="width:45px;height:16px;"><option value="0" selected="selected">' + Name['Gem'][0][0][Flag[0]] + '</option><option value="1">' + Name['Gem'][0][1][Flag[0]] + '</option>';
        tmp[i][1] = '<select id="SelEquip_' + i + '_2" onchange="' + aa[1] + '" onkeypress="' + aa[1] + '" style="width:81px;height:16px;"><option value="0" selected="selected">' + Name['Gem'][1][0][Flag[0]] + '</option>';
        for (j=1;j<Name['Gem'][1].length;j++)
          tmp[i][1] += '<option value="' + j + '">' + Name['Gem'][1][j][Flag[0]] + '</option>';
        tmp[i][2] = '<select id="SelEquip_' + i + '_3" onchange="' + aa[2] + '" onkeypress="' + aa[2] + '" style="width:45px;height:16px;"><option value="0" selected="selected">+ 0</option>';
        for (j=1;j<=10;j++)
          tmp[i][2] += (j == 10) ? '<option value="' + j + '">+' + j + '</option>': '<option value="' + j + '">+ ' + j + '</option>';
        for (j=0,k=1;j<3;j++,k++) {
          $('Equip_' + i + '_' + k).innerHTML = tmp[i][j] + '</select>';
          if (i >= 1)
            $('SelEquip_' + i + '_1').style.display = 'none';
          if (i >= 7) {
            $('SelEquip_' + i + '_2').style.display = 'none';
            $('SelEquip_' + i + '_3').style.display = 'none';
          }
          $('SelEquip_' + i + '_' + k).selectedIndex = Status['Equip'][i][k];
        }
      }
    break;
    case 'SoulCheck':
      for (i=0;i<=13;i++) {
        tmp[0] = Math.floor($('SelEquip_' + i + '_0').value / 10000);
        tmp[1] = $('SelEquip_' + i + '_0').value % 10000;
        for (j=0,k=4;j<EquipData[0][tmp[0]][tmp[1]][5];j++,k++)
          $('SelEquip_' + i + '_' + k).style.display = 'inline';
        for (j=3,k=6,l=8;j>EquipData[0][tmp[0]][tmp[1]][5];j--,k--,l--) {
          Status['Equip'][i][k] = 0;
          $('SelEquip_' + i + '_' + k).selectedIndex = 0;
          $('SelEquip_' + i + '_' + k).style.display = 'none';
        }
      }
    break;
    case 'Soul':
      xx[0] = 8; // 装着可能部位の番号
      for (i=0;i<=13;i++) {
        tmp[i] = new Array();
        xx[1] = '';
        SoulCompare[i].push(0);
        for (j=0,k=4;j<3;j++,k++) {
          aa = 'Status[\'Equip\'][' + i + '][' + k + ']=this.value;CalcSet(\'Equip\',' + i + ',' + k + ');';
          tmp[i][j] = '<select id="SelEquip_' + i + '_' + k + '" onchange="' + aa + '" onkeypress="' + aa + '" style="width:171px;height:16px;"><option value="0" class="col_bg2" selected="selected">' + SoulData[Flag[0]][0][0] + '</option>';
        }
        for (j=1;j<SoulData[0].length;j++) {
                 if (i ==  0 && SoulData[0][j][xx[0]]) {
            xx[1] += '<option value="' + j + '">' + SoulData[Flag[0]][j][0] + '</option>';
            SoulCompare[i].push(j);
          } else if (i ==  1 && SoulData[0][j][1 + xx[0]]) {
            xx[1] += '<option value="' + j + '">' + SoulData[Flag[0]][j][0] + '</option>';
            SoulCompare[i].push(j);
          } else if (i ==  2 && SoulData[0][j][2 + xx[0]]) {
            xx[1] += '<option value="' + j + '">' + SoulData[Flag[0]][j][0] + '</option>';
            SoulCompare[i].push(j);
          } else if (i ==  3 && SoulData[0][j][3 + xx[0]]) {
            xx[1] += '<option value="' + j + '">' + SoulData[Flag[0]][j][0] + '</option>';
            SoulCompare[i].push(j);
          } else if (i ==  4 && SoulData[0][j][4 + xx[0]]) {
            xx[1] += '<option value="' + j + '">' + SoulData[Flag[0]][j][0] + '</option>';
            SoulCompare[i].push(j);
          } else if (i ==  5 && SoulData[0][j][5 + xx[0]]) {
            xx[1] += '<option value="' + j + '">' + SoulData[Flag[0]][j][0] + '</option>';
            SoulCompare[i].push(j);
          } else if (i ==  6 && SoulData[0][j][6 + xx[0]]) {
            xx[1] += '<option value="' + j + '">' + SoulData[Flag[0]][j][0] + '</option>';
            SoulCompare[i].push(j);
          } else if (i == 11 && SoulData[0][j][7 + xx[0]]) {
            xx[1] += '<option value="' + j + '">' + SoulData[Flag[0]][j][0] + '</option>';
            SoulCompare[i].push(j);
          }
        }
        for (j=0,k=4;j<3;j++,k++) {
          tmp[i][j] += xx[1];
          $('Equip_' + i + '_' + k).innerHTML = tmp[i][j] + '</select>';
        }
      }
    break;
    case 'SoulSelect':
      for (i=0;i<=13;i++) {
        for (k=4;k<=6;k++) {
          for (j=0;j<SoulCompare[i].length;j++) {
            if (SoulCompare[i][j] == Status['Equip'][i][k]) {
              $('SelEquip_' + i + '_' + k).selectedIndex = j;
              break;
            } else if (SoulCompare[i][j] > Status['Equip'][i][k]) {
              $('SelEquip_' + i + '_' + k).selectedIndex = 0;
              Status['Equip'][i][k] = 0;
              break;
            }
          }
        }
      }
    break;
  }
}