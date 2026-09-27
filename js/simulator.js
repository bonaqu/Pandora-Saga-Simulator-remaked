//BPt[ 2] = new Array(999,999,999);
// -------------------------------------------------------------------------------------
function KeyDown(a) {
  var a,tmp;
  if (navigator.userAgent.match(/MSIE/))
    tmp = a.keyCode;
  else
    tmp = a.which;
//   alert(tmp);
  switch (tmp) {
    case 43:  StatusMove('Lev',1);          CalcSet('Lev'); break; // [+] レベル+1
    case 45:  StatusMove('Lev',-1);         CalcSet('Lev'); break; // [-] レベル-1
    case 113: StatusMove('Status','STA',1); CalcSet('STA'); break; // [q] 体力+1
    case 81:  StatusMove('Status','STA',-1);CalcSet('STA'); break; // [Q] 体力-1
    case 119: StatusMove('Status','STR',1); CalcSet('STR'); break; // [w] 筋力+1
    case 87:  StatusMove('Status','STR',-1);CalcSet('STR'); break; // [W] 筋力-1
    case 101: StatusMove('Status','AGI',1); CalcSet('AGI'); break; // [e] 敏捷+1
    case 69:  StatusMove('Status','AGI',-1);CalcSet('AGI'); break; // [E] 敏捷-1
    case 114: StatusMove('Status','DEX',1); CalcSet('DEX'); break; // [r] 器用+1
    case 82:  StatusMove('Status','DEX',-1);CalcSet('DEX'); break; // [R] 器用-1
    case 116: StatusMove('Status','SPR',1); CalcSet('SPR'); break; // [t] 霊感+1
    case 84:  StatusMove('Status','SPR',-1);CalcSet('SPR'); break; // [T] 霊感-1
    case 121: StatusMove('Status','INT',1); CalcSet('INT'); break; // [y] 知性+1
    case 89:  StatusMove('Status','INT',-1);CalcSet('INT'); break; // [Y] 知性-1
    case 97:  CalcSet('Skill',1,1,'Adeptness');             break; // [a] 斬る+1
    case 65:  CalcSet('Skill',1,-1,'Adeptness');            break; // [A] 斬る-1
    case 115: CalcSet('Skill',2,1,'Adeptness');             break; // [s] 突く+1
    case 83:  CalcSet('Skill',2,-1,'Adeptness');            break; // [S] 突く-1
    case 100: CalcSet('Skill',3,1,'Adeptness');             break; // [d] 払う+1
    case 68:  CalcSet('Skill',3,-1,'Adeptness');            break; // [D] 払う-1
    case 102: CalcSet('Skill',4,1,'Adeptness');             break; // [f] 打撃+1
    case 70:  CalcSet('Skill',4,-1,'Adeptness');            break; // [F] 打撃-1
    case 103: CalcSet('Skill',5,1,'Adeptness');             break; // [g] 防御+1
    case 71:  CalcSet('Skill',5,-1,'Adeptness');            break; // [G] 防御-1
    case 122: CalcSet('Skill',7,1,'Adeptness');             break; // [z] 射撃+1
    case 90:  CalcSet('Skill',7,-1,'Adeptness');            break; // [Z] 射撃-1
    case 120: CalcSet('Skill',8,1,'Adeptness');             break; // [x] 調合+1
    case 88:  CalcSet('Skill',8,-1,'Adeptness');            break; // [X] 調合-1
    case 99:  CalcSet('Skill',9,1,'Adeptness');             break; // [c] 暗殺+1
    case 67:  CalcSet('Skill',9,-1,'Adeptness');            break; // [C] 暗殺-1
    case 118: CalcSet('Skill',10,1,'Adeptness');            break; // [v] 仕掛+1
    case 86:  CalcSet('Skill',10,-1,'Adeptness');           break; // [V] 仕掛-1
    case 98:  CalcSet('Skill',11,1,'Adeptness');            break; // [b] 回避+1
    case 66:  CalcSet('Skill',11,-1,'Adeptness');           break; // [B] 回避-1
    case 104: CalcSet('Skill',13,1,'Adeptness');            break; // [h] 慈愛+1
    case 72:  CalcSet('Skill',13,-1,'Adeptness');           break; // [H] 慈愛-1
    case 106: CalcSet('Skill',14,1,'Adeptness');            break; // [j] 祝福+1
    case 74:  CalcSet('Skill',14,-1,'Adeptness');           break; // [J] 祝福-1
    case 107: CalcSet('Skill',15,1,'Adeptness');            break; // [k] 祓魔+1
    case 75:  CalcSet('Skill',15,-1,'Adeptness');           break; // [K] 祓魔-1
    case 108: CalcSet('Skill',16,1,'Adeptness');            break; // [l] 聖歌+1
    case 76:  CalcSet('Skill',16,-1,'Adeptness');           break; // [L] 聖歌-1
    case 110: CalcSet('Skill',18,1,'Adeptness');            break; // [n] 元素+1
    case 78:  CalcSet('Skill',18,-1,'Adeptness');           break; // [N] 元素-1
    case 109: CalcSet('Skill',19,1,'Adeptness');            break; // [m] 具現+1
    case 77:  CalcSet('Skill',19,-1,'Adeptness');           break; // [M] 具現-1
    case 44:  CalcSet('Skill',20,1,'Adeptness');            break; // [,] 暗黒+1
    case 60:  CalcSet('Skill',20,-1,'Adeptness');           break; // [<] 暗黒-1
    case 46:  CalcSet('Skill',21,1,'Adeptness');            break; // [.] 惑乱+1
    case 62:  CalcSet('Skill',21,-1,'Adeptness');           break; // [>] 惑乱-1
    case 47:  CalcSet('Skill',23,1,'Adeptness');            break; // [/] 種族+1
    case 63:  CalcSet('Skill',23,-1,'Adeptness');           break; // [?] 種族-1
    case 92:  CalcSet('Skill',24,1,'Adeptness');            break; // [\] 騎乗+1
    case 95:  CalcSet('Skill',24,-1,'Adeptness');           break; // [_] 騎乗-1
  }
}
// -------------------------------------------------------------------------------------------
function Reset(a) {
  var tmp = new Array()
  switch (a) {
    case 'Status':
      Status['StP'][0] = Status['StP'][1];
      $('StatusStP_0').innerHTML = Status['StP'][0];
      for (i=0;i<6;i++) {
        Status[Name['Option'][i][2]][1] = 0;
        $('Status' + Name['Option'][i][2] + '_0').innerHTML = Status[Name['Option'][i][2]][0] + Status[Name['Option'][i][2]][1] + Status[Name['Option'][i][2]][2];
        $('Status' + Name['Option'][i][2] + '_1').innerHTML = Status[Name['Option'][i][2]][0] + Status[Name['Option'][i][2]][1];
      }
    break;
    case 'Skill':
      Status['SkP'][0] = Status['SkP'][1];
      Status['UnP'][0] = Status['UnP'][1];
      $('StatusSkP_0').innerHTML = Status['SkP'][0];
      $('StatusUnP_0').innerHTML = Status['UnP'][0];
      for (i=0;i<Name['Skill'].length;i++) {
        Status['Skill'][i][1] = 0;
        Status['Skill'][i][3] = 0;
        $('Skill_' + i + '_1').innerHTML = Status['Skill'][i][0] + Status['Skill'][i][1];
        $('Skill_' + i + '_2').innerHTML = Status['Skill'][i][2] + Status['Skill'][i][3];
      }
      SkillBar('ALL');
    break;
    case 'Equip':
      for (i=0;i<=13;i++) {
        Status['Equip'][i] = new Array(0,0,0,0,0,0,0);
        $('SelEquip_' + i + '_0').selectedIndex = 0;
        $('SelEquip_' + i + '_1').selectedIndex = 0;
        $('SelEquip_' + i + '_2').selectedIndex = 0;
        $('SelEquip_' + i + '_3').selectedIndex = 0;
        $('SelEquip_' + i + '_4').selectedIndex = 0;
        $('SelEquip_' + i + '_5').selectedIndex = 0;
        $('SelEquip_' + i + '_6').selectedIndex = 0;
      }
      ListCreate('SoulCheck');
      CalcSet('ALL');
    break;
    case 'Log':
      dLog = new Array();
      for (i=0;i<=MaxLv;i++) {
        dLog[i] = new Array();
        dLog[i]['Point'] = new Array(0,0,0,0,0,0);
        dLog[i]['Status'] = new Array();
        dLog[i]['Skill'] = new Array();
        dLog[i]['Flag'] = 0;
        for (j=0;j<6;j++)
          dLog[i]['Status'][j] = new Array(0,0);
        for (j=0;j<Name['Skill'].length;j++)
          dLog[i]['Skill'][j] = new Array(0,0,0,0);
      }
    break;
  }
  Log();
}
// -------------------------------------------------------------------------------------
function StatusSet(a,b) {
  var a,b,i,j,k,l,tmp;
  tmp = new Array();
  for (i=0;i<Name['Skill'].length;i++)
    tmp[i] = new Array();

  switch (a) {
    case 'Status':
      if (b == 'Race' && Status['Job'][0] == $('SelRace').selectedIndex) break;
      if (b == 'Job' && Name['Job'][Status['Job'][2]][0] == Name['Job'][$('SelJob').selectedIndex][0]) break;
      for (i=0;i<6;i++)
        tmp[i] = Status[Name['Option'][i][2]][0] + Status[Name['Option'][i][2]][1];
      Status['Job'][0] = $('SelRace').selectedIndex;
      if (b == 'Race') Status['Job'][2] = $('SelJob').selectedIndex;
      for (i=0;i<6;i++)
        Status[Name['Option'][i][2]] = new Array(Status['Set']['Base'][$('SelRace').selectedIndex][i + 1] + Status['Set']['Job'][Name['Job'][$('SelJob').selectedIndex][0]][i + 1],0,0);
      Reset('Status');
      for (i=0;i<6;i++) {
        StatusMove('Status',Name['Option'][i][2],tmp[i] - Status[Name['Option'][i][2]][0]);
        StatusColor('Status' + Name['Option'][i][2],Status[Name['Option'][i][2]][0],Status[Name['Option'][i][2]][1],Status[Name['Option'][i][2]][2]);
      }
    break;
    case 'Skill':
      for (i=1;i<Name['Skill'].length;i++,j++) {
        if (i == 6 || i == 12 || i == 17 || i == 22)
          i++;
        tmp[i] = new Array(Status['Skill'][i][0] + Status['Skill'][i][1],Status['Skill'][i][2] + Status['Skill'][i][3]);
      }
      Status['Job'][2] = $('SelJob').selectedIndex;
      for (i=1;i<Name['Skill'].length;i++) {
        if (i == 6 || i == 12 || i == 17 || i == 22)
          i++;
        Status['Skill'][i] = new Array(Skill['D'][Name['Job'][Status['Job'][2]][0]][i],0,Skill['P'][Status['Job'][2]][i],0);
      }
      for (i=0,j=1;i<Name['Skill'].length;i++,j++) {
        if (i == 0 || i == 6 || i == 12 || i == 17 || i == 22)
          i++;
        Status['Skill'][i] = new Array(Skill['D'][Name['Job'][Status['Job'][2]][0]][j],0,Skill['P'][Status['Job'][2]][j],0);
      }
      for (i=0;i<5;i++) {
             if (i == 0) l = new Array( 0, 1, 5);
        else if (i == 1) l = new Array( 6, 6,10);
        else if (i == 2) l = new Array(12,11,14);
        else if (i == 3) l = new Array(17,15,18);
        else if (i == 4) l = new Array(22,19,20);
        Status['Skill'][l[0]] = new Array(0,0,0,0);
        for (j=l[1];j<=l[2];j++) {
          Status['Skill'][l[0]][0] += Skill['D'][Name['Job'][Status['Job'][2]][0]][j];
          Status['Skill'][l[0]][2] += Skill['P'][Status['Job'][2]][j];
        }
      }
      Reset('Skill');
      for (i=0;i<4;i++)
        Learn[i] = new Array();
      for (i=1;i<Name['Skill'].length;i++) {
        if (i == 6 || i == 12 || i == 17 || i == 22)
          i++;
        StatusMove('Skill',i,tmp[i][0] - Status['Skill'][i][0],'Adeptness');
        StatusMove('Skill',i,tmp[i][1] - Status['Skill'][i][2],'Potential');
        SkillList('Potential',i);
        SkillList('Adeptness',i);
      }
    break;
  }
}
// -------------------------------------------------------------------------------------
function StatusMove(a,b,c,event) {
  var a,b,c,tmp,event;
  tmp = new Array();
  switch (a) {
    case 'Lev':
      tmp[0] = (b > 0) ? '+': '-';
      if (tmp[0] == '-') b *= -1; // 負の値を正に変換
      for (i=1;i<=4;i++) // tmp[1]:Lv [2]:StatusPoint [3]:SkillPoint [4]:???Point
        tmp[i] = 0;
      if (tmp[0] == '+') {
        for (i=0;i<b;i++) {
          if (tmp[1] + Status['Lev'][0] < MaxLv) {
            tmp[1]++;
            tmp[2] += BPt[Status['Lev'][0] + tmp[1]][0];
            tmp[3] += BPt[Status['Lev'][0] + tmp[1]][1];
            tmp[4] += BPt[Status['Lev'][0] + tmp[1]][2];
          } else break;
        }
      } else if (tmp[0] == '-') {
        for (i=0;i<b;i++) {
          if (tmp[1] + Status['Lev'][0] > 1) {
            tmp[2] -= BPt[Status['Lev'][0] + tmp[1]][0];
            tmp[3] -= BPt[Status['Lev'][0] + tmp[1]][1];
            tmp[4] -= BPt[Status['Lev'][0] + tmp[1]][2];
            tmp[1]--;
          } else break;
        }
      }
      Status['Lev'][0] += tmp[1];
      $('StatusLev').innerHTML = Status['Lev'][0];
      Status['StP'][0] += tmp[2];
      Status['StP'][1] += tmp[2];
      $('StatusStP_0').innerHTML = Status['StP'][0];
      $('StatusStP_1').innerHTML = Status['StP'][1];
      Status['SkP'][0] += tmp[3];
      Status['SkP'][1] += tmp[3];
      $('StatusSkP_0').innerHTML = Status['SkP'][0];
      $('StatusSkP_1').innerHTML = Status['SkP'][1];
      Status['UnP'][0] += tmp[4];
      Status['UnP'][1] += tmp[4];
      $('StatusUnP_0').innerHTML = Status['UnP'][0];
      $('StatusUnP_1').innerHTML = Status['UnP'][1];
      Log('Lev');
    break;
    case 'Status':
      tmp[0] = (c > 0) ? '+': '-';
      if (tmp[0] == '-') c *= -1; // 負の値を正に変換
      for (i=0;i<c;i++) {
        if (tmp[0] == '+') {
          if (Status['StP'][0] >= SPt[Status[b][0] + Status[b][1] + 1][0]) {
            if (MaxSt > Status[b][0] + Status[b][1]) {
              Status[b][1]++;
              Status['StP'][0] -= SPt[Status[b][0] + Status[b][1]][0];
            } else break;
          } else break;
        } else if (tmp[0] == '-') {
          if (Status[b][0] < Status[b][0] + Status[b][1]) {
            Status['StP'][0] += SPt[Status[b][0] + Status[b][1]][0];
            Status[b][1]--;
          } else break;
        }
      }
      $('StatusStP_0').innerHTML = Status['StP'][0];
      $('Status' + b + '_4').innerHTML = (Status[b][0] + Status[b][1] == MaxSt) ? '--': SPt[Status[b][0] + Status[b][1] + 1][0] + 'P';
      Log('Status',b);
    break;
    case 'Skill':
      if (!event)
        event = window.event;
      if (document.all)
        c = (!c) ? event.offsetX: c;
      else
        c = (!c) ? event.layerX: c;

      if (event != 'Adeptness' && event != 'Potential')
        c -= Status['Skill'][b][0] + Status['Skill'][b][1];
      tmp[0] = (c > 0) ? '+': '-';
      if (tmp[0] == '-') c *= -1; // 負の値を正に変換

      for (i=0;i<c;i++) {
        if (event == 'Potential') tmp[1] = new Array('UnP',3,Status['Skill'][b][2] + Status['Skill'][b][3],MaxSk,Status['Skill'][b][2]);
        else                      tmp[1] = new Array('SkP',1,Status['Skill'][b][0] + Status['Skill'][b][1],Status['Skill'][b][2] + Status['Skill'][b][3],Status['Skill'][b][0]);
        if (tmp[0] == '+') {
          if (Status[tmp[1][0]][0] >= 1 && tmp[1][2] < tmp[1][3]) {
            Status['Skill'][b][tmp[1][1]]++;
            Status[tmp[1][0]][0]--;
          } else break;
        } else if (tmp[0] == '-') {
          if (tmp[1][4] < tmp[1][2]) {
            Status[tmp[1][0]][0]++;
            Status['Skill'][b][tmp[1][1]]--;
          } else break;
        }
      }
      $('Skill_' + b + '_1').innerHTML = Status['Skill'][b][0] + Status['Skill'][b][1];
      $('Skill_' + b + '_2').innerHTML = Status['Skill'][b][2] + Status['Skill'][b][3];
      $('Skill_' + b + '_3').innerHTML = (Status['Skill'][b][2] + Status['Skill'][b][3] == MaxSk) ? '-': SPt[Status['Skill'][b][2] + Status['Skill'][b][3] + 1][1];
      $('StatusSkP_0').innerHTML = Status['SkP'][0];
      $('StatusUnP_0').innerHTML = Status['UnP'][0];
      tmp[0] = new Array(0,0,0,0,0,0,6,6,6,6,6,6,12,12,12,12,12,17,17,17,17,17,22,22,22);
           if (b >  0 && b <=  5) tmp[1] =  1;
      else if (b >  6 && b <= 11) tmp[1] =  7;
      else if (b > 12 && b <= 16) tmp[1] = 13;
      else if (b > 17 && b <= 21) tmp[1] = 18;
      else if (b > 22 && b <= 24) tmp[1] = 23;
      tmp[2] = new Array(0,0,0,0);
      for (i=tmp[1];i<Name['Skill'].length;i++) {
        if (i == 6 || i == 12 || i == 17 || i == 22)
          i++;
        tmp[2][0] += Status['Skill'][i][0];
        tmp[2][1] += Status['Skill'][i][1];
        tmp[2][2] += Status['Skill'][i][2];
        tmp[2][3] += Status['Skill'][i][3];
        $('Skill_' + tmp[0][i] + '_1').innerHTML = tmp[2][0] + tmp[2][1];
        $('Skill_' + tmp[0][i] + '_2').innerHTML = tmp[2][2] + tmp[2][3];
        if (i == 5 || i == 11 || i == 16 || i == 21 || i == 24) {
          Status['Skill'][tmp[0][i]] = new Array(tmp[2][0],tmp[2][1],tmp[2][2],tmp[2][3]);
          tmp[2] = new Array(0,0,0,0);
        }
      }
      tmp = (event == 'Potential') ? 2: 0;
      SkillBar(b);
      Log('Skill',b,tmp);
// ts3.innerHTML = '<div style="z-index:100;">'+Status['Skill'][0]+'<br>'+Status['Skill'][6]+'<br>'+Status['Skill'][12]+'<br>'+Status['Skill'][17]+'<br>'+Status['Skill'][22]+'</div>';
// ts.innerHTML = '<div style="z-index:99;">' + 'a:' + a + ' b:' + b + ' c:' + c + '<br />event:' + event + '</div>';
    break;
  }
}
// -------------------------------------------------------------------------------------
function SkillBar(a) {
  var i,tmp;
  tmp = '';
  if (a == 'ALL') {
    for (a=1;a<Name['Skill'].length;a++) {
      tmp = '';
      if (a == 6 || a == 12 || a == 17 || a == 22)
        a++;
      tmp += '<div style="position:absolute;top:0px;left:0px;width:' + (Status['Skill'][a][0] + Status['Skill'][a][1]) + 'px;height:15px;background:';
      tmp += (Agent.search(/Safari/i) != -1 || Agent.search(/MSIE/i) != -1 || Agent.search(/Opera/i) != -1) ? 'url(./image/interface/bar_green.png)': '-moz-linear-gradient(left,#000,#0f0 100%)';
      tmp += ';"></div>';
      tmp += '<div style="position:absolute;top:0px;left:' + (Status['Skill'][a][2] + Status['Skill'][a][3]) + 'px;width:1px;height:15px;background:';
      tmp += (Agent.search(/Safari/i) != -1 || Agent.search(/MSIE/i) != -1 || Agent.search(/Opera/i) != -1) ? 'url(./image/interface/bar_blue.png)': '#00f';
      tmp += '"></div>';
      if (Status['Skill'][a][0] + Status['Skill'][a][1] >= Status['Skill'][a][2] + Status['Skill'][a][3]) {
        tmp = '<div style="position:absolute;top:0px;left:0px;width:' + (Status['Skill'][a][2] + Status['Skill'][a][3] + 1) + 'px;height:15px;background:';
        tmp += (Agent.search(/Safari/i) != -1 || Agent.search(/MSIE/i) != -1 || Agent.search(/Opera/i) != -1) ? 'url(./image/interface/bar_blue.png)': '-moz-linear-gradient(left,#000,#00f 100%)';
        tmp += '"></div>';
      }
      $('Skill_' + a + '_0').innerHTML = tmp;
    }
  } else {
    tmp += '<div style="position:absolute;top:0px;left:0px;width:' + (Status['Skill'][a][0] + Status['Skill'][a][1]) + 'px;height:15px;background:';
    tmp += (Agent.search(/Safari/i) != -1 || Agent.search(/MSIE/i) != -1 || Agent.search(/Opera/i) != -1) ? 'url(./image/interface/bar_green.png)': '-moz-linear-gradient(left,#000,#0f0 100%)';
    tmp += ';"></div>';
    tmp += '<div style="position:absolute;top:0px;left:' + (Status['Skill'][a][2] + Status['Skill'][a][3]) + 'px;width:1px;height:15px;background:';
    tmp += (Agent.search(/Safari/i) != -1 || Agent.search(/MSIE/i) != -1 || Agent.search(/Opera/i) != -1) ? 'url(./image/interface/bar_blue.png)': '#00f';
    tmp += '"></div>';
    if (Status['Skill'][a][0] + Status['Skill'][a][1] >= Status['Skill'][a][2] + Status['Skill'][a][3]) {
      tmp = '<div style="position:absolute;top:0px;left:0px;width:' + (Status['Skill'][a][2] + Status['Skill'][a][3] + 1) + 'px;height:15px;background:';
      tmp += (Agent.search(/Safari/i) != -1 || Agent.search(/MSIE/i) != -1 || Agent.search(/Opera/i) != -1) ? 'url(./image/interface/bar_blue.png)': '-moz-linear-gradient(left,#000,#00f 100%)';
      tmp += '"></div>';
    }
    $('Skill_' + a + '_0').innerHTML = tmp;
  }
}
// -------------------------------------------------------------------------------------
function SkillList(a,b) {
  var a,b,i,j,tmp;
  if (Flag[3]) { // SkillListFlagが真の時だけ実行する
    tmp = new Array();
    tmp[0] = new Array();
    tmp[1] = new Array();
         if (b >  0 && b <=  5) tmp[2] = tmp[1] +  0;
    else if (b >  6 && b <= 11) tmp[2] = tmp[1] +  6;
    else if (b > 12 && b <= 16) tmp[2] = tmp[1] + 12;
    else if (b > 17 && b <= 21) tmp[2] = tmp[1] + 17;
    else if (b > 22 && b <= 24) tmp[2] = tmp[1] + 22;

         if (Status['Job'][2] == 0)  tmp[3] = new Array( 0, 0, 0);
    else if (Status['Job'][2] == 1)  tmp[3] = new Array( 0, 1, 1);
    else if (Status['Job'][2] == 2)  tmp[3] = new Array( 0, 1, 2);
    else if (Status['Job'][2] == 3)  tmp[3] = new Array( 0, 1, 3);
    else if (Status['Job'][2] == 4)  tmp[3] = new Array( 0, 4, 4);
    else if (Status['Job'][2] == 5)  tmp[3] = new Array( 0, 4, 5);
    else if (Status['Job'][2] == 6)  tmp[3] = new Array( 0, 4, 6);
    else if (Status['Job'][2] == 7)  tmp[3] = new Array( 7, 7, 7);
    else if (Status['Job'][2] == 8)  tmp[3] = new Array( 7, 8, 8);
    else if (Status['Job'][2] == 9)  tmp[3] = new Array( 7, 8, 9);
    else if (Status['Job'][2] == 10) tmp[3] = new Array( 7, 8,10);
    else if (Status['Job'][2] == 11) tmp[3] = new Array( 7,11,11);
    else if (Status['Job'][2] == 12) tmp[3] = new Array( 7,11,12);
    else if (Status['Job'][2] == 13) tmp[3] = new Array( 7,11,13);
    else if (Status['Job'][2] == 14) tmp[3] = new Array(14,14,14);
    else if (Status['Job'][2] == 15) tmp[3] = new Array(14,15,15);
    else if (Status['Job'][2] == 16) tmp[3] = new Array(14,15,16);
    else if (Status['Job'][2] == 17) tmp[3] = new Array(14,15,17);
    else if (Status['Job'][2] == 18) tmp[3] = new Array(14,18,18);
    else if (Status['Job'][2] == 19) tmp[3] = new Array(14,18,19);
    else if (Status['Job'][2] == 20) tmp[3] = new Array(14,18,20);
    else if (Status['Job'][2] == 21) tmp[3] = new Array(21,21,21);
    else if (Status['Job'][2] == 22) tmp[3] = new Array(21,22,22);
    else if (Status['Job'][2] == 23) tmp[3] = new Array(21,22,23);
    else if (Status['Job'][2] == 24) tmp[3] = new Array(21,22,24);
    else if (Status['Job'][2] == 25) tmp[3] = new Array(21,25,25);
    else if (Status['Job'][2] == 26) tmp[3] = new Array(21,25,26);
    else if (Status['Job'][2] == 27) tmp[3] = new Array(21,25,27);
    switch (a) {
      case 'Potential':
        for (i=0;i<Skill[0][b].length;i++) {
          if (Skill[0][b][i][9].search(/_/i)) {
            tmp[1] = Skill[0][b][i][9].split('_');
            for (j=0;j<tmp[1].length;j++)
              tmp[0][j] = tmp[1][j].split('=');
          } else
            tmp[0][0] = Skill[0][b][i][9].split('=');
          switch (tmp[0].length) {
            case 1:
              if (tmp[0][0][0] == 'J') {
                if (
                  (tmp[0][0][1] == tmp[3][0] && tmp[0][0][2] <= Status['Lev'][0])
               || (tmp[0][0][1] == tmp[3][1] && tmp[0][0][2] <= Status['Lev'][0])
               || (tmp[0][0][1] == tmp[3][2] && tmp[0][0][2] <= Status['Lev'][0])
                )
                if (Learn[1].indexOf(b + '_' + i) == -1)
                  Learn[1].push(b + '_' + i);
              } else if (tmp[0][0][0] == 'S') {
                if (tmp[0][0][2] <= Status['Skill'][tmp[0][0][1]][2] + Status['Skill'][tmp[0][0][1]][3])
                  if (Learn[1].indexOf(b + '_' + i) == -1)
                    Learn[1].push(b + '_' + i);
              }
            break;
            case 2:
              if (
                (tmp[0][0][0] == 'J' && tmp[0][0][1] == Status['Job'][2] && tmp[0][0][2] <= Status['Lev'][0]                && tmp[0][1][2] <= Status['Skill'][tmp[0][1][1]][2] + Status['Skill'][tmp[0][1][1]][3])
             || (tmp[0][0][0] == 'S' && tmp[0][0][2] <= Status['Skill'][tmp[0][0][1]][2] + Status['Skill'][tmp[0][0][1]][3] && tmp[0][1][2] <= Status['Skill'][tmp[0][1][1]][2] + Status['Skill'][tmp[0][1][1]][3])
              ) {
                if (Learn[1].indexOf(b + '_' + i) == -1)
                  Learn[1].push(b + '_' + i);
              }
            break;
          }
        }
      break;
      case 'Adeptness':
        for (i=0;i<Learn[1].length;i++) {
          Learn[2][i] = Learn[1][i].split('_');
          if (Skill[0][Learn[2][i][0]][Learn[2][i][1]][9].search(/_/i)) {
            tmp[1] = Skill[0][Learn[2][i][0]][Learn[2][i][1]][9].split('_');
            for (j=0;j<tmp[1].length;j++)
              tmp[0][j] = tmp[1][j].split('=');
          } else
            tmp[0][0] = Skill[0][Learn[2][i][0]][Learn[2][i][1]][9].split('=');
          switch (tmp[0].length) {
            case 1:
              if (tmp[0][0][0] == 'J') {
                if (
                  (tmp[0][0][1] == tmp[3][0] && tmp[0][0][2] <= Status['Lev'][0])
               || (tmp[0][0][1] == tmp[3][1] && tmp[0][0][2] <= Status['Lev'][0])
               || (tmp[0][0][1] == tmp[3][2] && tmp[0][0][2] <= Status['Lev'][0])
                )
                if (Learn[0].indexOf(Learn[2][i][0] + '_' + Learn[2][i][1]) == -1)
                  Learn[0].push(Learn[2][i][0] + '_' + Learn[2][i][1]);
              } else if (tmp[0][0][0] == 'S') {
                if (tmp[0][0][2] <= Status['Skill'][tmp[0][0][1]][0] + Status['Skill'][tmp[0][0][1]][1])
                  if (Learn[0].indexOf(Learn[2][i][0] + '_' + Learn[2][i][1]) == -1)
                    Learn[0].push(Learn[2][i][0] + '_' + Learn[2][i][1]);
              }
            break;
            case 2:
              if (
                (tmp[0][0][0] == 'J' && tmp[0][0][1] == Status['Job'][2] && tmp[0][0][2] <= Status['Lev'][0]                && tmp[0][1][2] <= Status['Skill'][tmp[0][1][1]][0] + Status['Skill'][tmp[0][1][1]][1])
             || (tmp[0][0][0] == 'S' && tmp[0][0][2] <= Status['Skill'][tmp[0][0][1]][0] + Status['Skill'][tmp[0][0][1]][1] && tmp[0][1][2] <= Status['Skill'][tmp[0][1][1]][0] + Status['Skill'][tmp[0][1][1]][1])
              ) {
                if (Learn[0].indexOf(Learn[2][i][0] + '_' + Learn[2][i][1]) == -1)
                  Learn[0].push(Learn[2][i][0] + '_' + Learn[2][i][1]);
              }
            break;
          }
        }
// ts2.innerHTML = '<div style="z-index:100;">'+Status['Skill'][0]+'<br>'+Status['Skill'][6]+'<br>'+Status['Skill'][12]+'<br>'+Status['Skill'][17]+'<br>'+Status['Skill'][22]+'</div>';
      break;
      case 'Create':
        tmp  = '<ul><li class="head" style="width:100%;">' + Name['Learn'][0][Flag[0]] + '</li></ul>';
        for (i=0;i<Learn[1].length;i++) {
          tmp += '<ul><li id="LearnSkillIcon_' + Learn[2][i][0] + '_' + Learn[2][i][1] + '" onmouseover="DDMOpen(' + Learn[2][i][0] + ',' + Learn[2][i][1] + ');" onmouseout="DDMClose(\'Time\');" class="learn_icon" style="margin:5px 0px 0px 5px;width:38px;height:36px;background:url(./image/icon/gray/' + zeroPadding(2,0,Learn[2][i][0]) + zeroPadding(2,0,Learn[2][i][1]) + '.png);background-repeat:no-repeat;">';
          tmp += '<div id="LearnSkill_' + Learn[2][i][0] + '_' + Learn[2][i][1] + '" onmouseover="DDMClose(\'Cancel\');" onmouseout="DDMClose(\'Time\');" class="learn" style="z-index:99;display:none;position:absolute;top:38px;left:0px;padding:2px;width:255px;">';
          tmp += '<ul><li style="margin-left:5px;padding-top:2px;width:250px;line-height:16px;">' + Skill[Flag[0]][Learn[2][i][0]][Learn[2][i][1]][0] + '</li></ul>';
          tmp += '<ul>';
          tmp += '<li style="margin:2px 12px 0px 5px;padding-top:2px;width:118px;line-height:16px;">' + Name['Skill'][Learn[2][i][0]][Flag[0] + 1] + '</li>';
          tmp += '<li style="margin:2px 2px 0px 0px;padding-top:2px;width:65px;line-height:16px;">' + Name['Learn'][1][Flag[0]] + '</li>';
          tmp += '<li id="LearnSkillMP_' + Learn[2][i][0] + '_' + Learn[2][i][1] + '" style="margin:2px 2px 0px 0px;padding:2px 1px 0px 0px;width:38px;line-height:16px;text-align:right;">' + Skill[0][Learn[2][i][0]][Learn[2][i][1]][5] + '</li>';
          tmp += '<li style="margin:2px 0px 0px 0px;padding-top:2px;width:10px;height:16px;"></li>';
          tmp += '</ul>';
          tmp += '<ul>';
          tmp += '<li style="margin:2px 2px 0px 5px;padding-top:2px;width:65px;line-height:16px;">' + Name['Learn'][2][Flag[0]] + '</li>';
          tmp += '<li style="margin:2px 12px 0px 0px;padding:2px 1px 0px 0px;width:50px;line-height:16px;text-align:right;">' + Skill[0][Learn[2][i][0]][Learn[2][i][1]][6] + Name['Learn'][4][Flag[0]] + '</li>';
          tmp += '<li style="margin:2px 2px 0px 0px;padding-top:2px;width:65px;line-height:16px;">' + Name['Learn'][3][Flag[0]] + '</li>';
          tmp += '<li style="margin:2px 2px 0px 0px;padding:2px 1px 0px 0px;width:50px;line-height:16px;text-align:right;">' + Skill[0][Learn[2][i][0]][Learn[2][i][1]][7] + Name['Learn'][4][Flag[0]] + '</li>';
          tmp += '</ul>';
          tmp += '<ul>';
          tmp += '<li style="margin:2px 2px 0px 5px;padding-top:2px;width:65px;line-height:16px;">' + Name['Learn'][5][Flag[0]] + '</li>';
          tmp += '<li style="margin:2px 12px 0px 0px;padding:2px 1px 0px 0px;width:50px;line-height:16px;text-align:right;">' + Skill[0][Learn[2][i][0]][Learn[2][i][1]][8] + Name['Learn'][4][Flag[0]] + '</li>';
          tmp += '<li style="margin:2px 0px 0px 0px;padding-top:2px;width:120px;height:16px;"></li>';
          tmp += '</ul>';
          tmp += '<ul><li style="margin:2px 2px 0px 5px;padding-top:2px;width:250px;line-height:16px;">' + Name['Learn'][6][Flag[0]] + '</li></ul>';
          tmp += '<ul><li style="margin:2px 2px 0px 15px;padding-top:2px;width:245px;line-height:16px;">' + Skill[Flag[0]][Learn[2][i][0]][Learn[2][i][1]][1] + '</li></ul>';
          tmp += '<ul><li style="margin:2px 2px 0px 5px;padding-top:2px;width:250px;line-height:16px;">' + Name['Learn'][7][Flag[0]] + '</li></ul>';
          tmp += '<ul><li style="margin:2px 2px 0px 15px;padding-top:2px;width:245px;line-height:16px;">' + Skill[Flag[0]][Learn[2][i][0]][Learn[2][i][1]][2] + '</li></ul>';
          tmp += '<ul><li style="margin:12px 2px 0px 5px;padding-top:2px;width:250px;white-space:normal;">' + Skill[Flag[0]][Learn[2][i][0]][Learn[2][i][1]][3] + '</li></ul>';
          tmp += '</div>';
          tmp += '</li></ul>';
        }
        $('LearnView').innerHTML = tmp;
      break;
      case 'Color':
        for (i=0;i<Learn[0].length;i++) {
          Learn[3][i] = Learn[0][i].split('_');

          if (Skill[0][Learn[3][i][0]][Learn[3][i][1]][9].search(/_/i)) {
            tmp[1] = Skill[0][Learn[3][i][0]][Learn[3][i][1]][9].split('_');
            for (j=0;j<tmp[1].length;j++)
              tmp[0][j] = tmp[1][j].split('=');
          } else
            tmp[0][0] = Skill[0][Learn[3][i][0]][Learn[3][i][1]][9].split('=');
          switch (tmp[0].length) {
            case 1:
              if (tmp[0][0][0] == 'J') {
                if (
                  (tmp[0][0][1] == tmp[3][0] && tmp[0][0][2] <= Status['Lev'][0])
               || (tmp[0][0][1] == tmp[3][1] && tmp[0][0][2] <= Status['Lev'][0])
               || (tmp[0][0][1] == tmp[3][2] && tmp[0][0][2] <= Status['Lev'][0])
                )
                  $('LearnSkillIcon_' + Learn[3][i][0] + '_' + Learn[3][i][1]).style.background = 'url(./image/icon/' + zeroPadding(2,0,Learn[3][i][0]) + zeroPadding(2,0,Learn[3][i][1]) + '.png)';
              else
                  $('LearnSkillIcon_' + Learn[3][i][0] + '_' + Learn[3][i][1]).style.background = 'url(./image/icon/gray/' + zeroPadding(2,0,Learn[3][i][0]) + zeroPadding(2,0,Learn[3][i][1]) + '.png)';
              } else if (tmp[0][0][0] == 'S') {
                if (tmp[0][0][2] <= Status['Skill'][tmp[0][0][1]][0] + Status['Skill'][tmp[0][0][1]][1])
                  $('LearnSkillIcon_' + Learn[3][i][0] + '_' + Learn[3][i][1]).style.background = 'url(./image/icon/' + zeroPadding(2,0,Learn[3][i][0]) + zeroPadding(2,0,Learn[3][i][1]) + '.png)';
                else
                  $('LearnSkillIcon_' + Learn[3][i][0] + '_' + Learn[3][i][1]).style.background = 'url(./image/icon/gray/' + zeroPadding(2,0,Learn[3][i][0]) + zeroPadding(2,0,Learn[3][i][1]) + '.png)';
              }
            break;
            case 2:
              if (
                (tmp[0][0][0] == 'J' && tmp[0][0][1] == Status['Job'][2] && tmp[0][0][2] <= Status['Lev'][0]                && tmp[0][1][2] <= Status['Skill'][tmp[0][1][1]][0] + Status['Skill'][tmp[0][1][1]][1])
             || (tmp[0][0][0] == 'S' && tmp[0][0][2] <= Status['Skill'][tmp[0][0][1]][0] + Status['Skill'][tmp[0][0][1]][1] && tmp[0][1][2] <= Status['Skill'][tmp[0][1][1]][0] + Status['Skill'][tmp[0][1][1]][1])
              ) {
                if (tmp[0][0][2] <= Status['Skill'][tmp[0][0][1]][0] + Status['Skill'][tmp[0][0][1]][1])
                  $('LearnSkillIcon_' + Learn[3][i][0] + '_' + Learn[3][i][1]).style.background = 'url(./image/icon/' + zeroPadding(2,0,Learn[3][i][0]) + zeroPadding(2,0,Learn[3][i][1]) + '.png)';
              }
            break;
          }
        }
      break;
    }
  }
}
// -------------------------------------------------------------------------------------
dLog = new Array();
for (i=0;i<=MaxLv;i++) {
  dLog[i] = new Array();
  dLog[i]['Point'] = new Array(0,0,0,0,0,0);
  dLog[i]['Status'] = new Array();
  dLog[i]['Skill'] = new Array();
  dLog[i]['Flag'] = 0;
  for (j=0;j<6;j++)
    dLog[i]['Status'][j] = new Array(0,0);
  for (j=0;j<Name['Skill'].length;j++)
    dLog[i]['Skill'][j] = new Array(0,0,0,0);
}
// -------------------------------------------------------------------------------------
function Log(a,b,c) {
  var a,b,c,i,j,k,l,tmp,xx;
  if (Flag[4]) { // LogFlagが真の時だけ実行する
    xx = new Array();

         if (b == 'STA') c = 0;
    else if (b == 'STR') c = 1;
    else if (b == 'AGI') c = 2;
    else if (b == 'DEX') c = 3;
    else if (b == 'SPR') c = 4;
    else if (b == 'INT') c = 5;
    switch (a) {
      case 'Lev': // Lvを動かした場合、現在の値と比較用の値を格納する
        dLog[Status['Lev'][0]]['Flag'] = 1;
        dLog[Status['Lev'][0]]['Point'][0] = Status['StP'][0];
        dLog[Status['Lev'][0]]['Point'][1] = Status['StP'][0];
        dLog[Status['Lev'][0]]['Point'][2] = Status['SkP'][0];
        dLog[Status['Lev'][0]]['Point'][3] = Status['SkP'][0];
        dLog[Status['Lev'][0]]['Point'][4] = Status['UnP'][0];
        dLog[Status['Lev'][0]]['Point'][5] = Status['UnP'][0];
        for (i=0;i<6;i++,k++)
          for (j=0;j<2;j++)
            dLog[Status['Lev'][0]]['Status'][i][j] = Status[Name['Option'][i][2]][0] + Status[Name['Option'][i][2]][1];
        for (i=0;i<Name['Skill'].length;i++) {
          for (j=0;j<2;j++)
            dLog[Status['Lev'][0]]['Skill'][i][j] = Status['Skill'][i][0] + Status['Skill'][i][1];
          for (j=2;j<4;j++)
            dLog[Status['Lev'][0]]['Skill'][i][j] = Status['Skill'][i][2] + Status['Skill'][i][3];
        }
      break;
      case 'Status':
        dLog[Status['Lev'][0]]['Status'][c][1] = Status[b][0] + Status[b][1];
      break;
      case 'Skill':
        dLog[Status['Lev'][0]]['Skill'][b][c + 1] = Status['Skill'][b][c] + Status['Skill'][b][c + 1];
      break;
    }
tmp = Name['Race'][Status['Job'][0]][Flag[0]] + ' / ' + Name['Race']['Skill'][Status['Job'][0]][Status['Job'][1]][Flag[0]] + ' / ' + Name['Job'][Status['Job'][2]][Flag[0] + 2] + '\n';
tmp += '-------------------------------------------------\n';
for (i=MaxLv;i>0;i--) {
  if (dLog[i]['Flag']) { // 現在の値と比較用の値が入力されている場合のみ書き出す
    tmp += 'Lv:' + zeroPadding(2,1,i) + '  ' + Name['Log'][0][Flag[0]] + ':' + zeroPadding(3,1,dLog[i]['Point'][0]) + '/' + zeroPadding(3,1,dLog[i]['Point'][2]) + '/' + zeroPadding(3,1,dLog[i]['Point'][4]) + '\n';
    tmp += '  ' + Name['Option'][0][Flag[0] + 3] + ':' + zeroPadding(2,1,dLog[i]['Status'][0][0]) + ' ' + Name['Option'][1][Flag[0] + 3] + ':' + zeroPadding(2,1,dLog[i]['Status'][1][0]) + ' ' + Name['Option'][2][Flag[0] + 3] + ':' + zeroPadding(2,1,dLog[i]['Status'][2][0]) + ' ' + Name['Option'][3][Flag[0] + 3] + ':' + zeroPadding(2,1,dLog[i]['Status'][3][0]) + ' ' + Name['Option'][3][Flag[0] + 3] + ':' + zeroPadding(2,1,dLog[i]['Status'][4][0]) + ' ' + Name['Option'][4][Flag[0] + 3] + ':' + zeroPadding(2,1,dLog[i]['Status'][5][0]) + '\n';
    for (j=0;j<6;j++) {
      if (dLog[i]['Status'][j][0] < dLog[i]['Status'][j][1]) {
        xx[j]  = '    ' + Name['Option'][j][Flag[0] + 3];
        xx[j] += (Flag[0] == 1) ? '    :': '   :';
        xx[j] += zeroPadding(3,1,dLog[i]['Status'][j][0]) + ' -> ' + zeroPadding(3,1,dLog[i]['Status'][j][1]) + '\n';
      } else xx[j] = '';
      tmp += xx[j];
    }
    for (j=1;j<Name['Skill'].length;j++) {
      if (i == 6 || i == 12 || i == 17 || i == 22)
        j++;
      for (k=0,l=1;k<4;k+=2,l++) {
        if (dLog[i]['Skill'][j][k] < dLog[i]['Skill'][j][k + 1]) {
          xx[j]  = '    ' + Name['Log'][l][Flag[0]] + '/';
          if (Flag[0] == 1) {
            xx[j] += (Name['Skill'][i][1 + Flag[0]].length >= 5) ? Name['Skill'][i][1 + Flag[0]].slice(0,4): Name['Skill'][i][1 + Flag[0]];
          } else xx[j] += Name['Skill'][j][Flag[0] + 1];
          xx[j] += ':' + zeroPadding(3,1,dLog[i]['Skill'][j][k]) + ' -> ' + zeroPadding(3,1,dLog[i]['Skill'][j][k + 1]) + '\n';
        } else xx[j] = '';
        tmp += xx[j];
      }
    }
    tmp += '   ' + Name['Log'][3][Flag[0]] + Name['Log'][0][Flag[0]] + ':' + zeroPadding(3,1,dLog[i]['Point'][1]) + '/' + zeroPadding(3,1,dLog[i]['Point'][3]) + '/' + zeroPadding(3,1,dLog[i]['Point'][5]) + '\n';
    tmp += '-------------------------------------------------\n';
  }
  $('InLog').value = tmp;
}
  }
}
