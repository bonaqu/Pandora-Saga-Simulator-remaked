function File(a,b) {
  var i,j,k,l,tmp;
  tmp = new Array();
  if (typeof localStorage != "object" && typeof globalStorage == "object") localStorage = globalStorage[location.host];
  tmp = (localStorage.file) ? localStorage.file: '7ZFBCoAwDATvvkWwKdb6/5dptywYevC+LAObkBBymLKXl0CSjryRJ/L69G1ejHVUDiqCTZ7wFJPxKfiypbcrf3uTOGa1TAUsUwjLFMIyhbBMISxTCMsUwjKFsEwhtgc=';
  tmp = Base64.btou(RawDeflate.inflate(Base64.fromBase64(tmp)));
  tmp = tmp.split('/');

  switch (a) {
    case 'CodeLoad':
      Expand($('InCode').value);
      ListCreate('Set');
      ListCreate('Equip');
      ListCreate('SoulSelect');
      ListCreate('SoulCheck');
      $('SelRace').selectedIndex = Status['Job'][0];
      RJChange('RSkill');
      $('SelRSkill').selectedIndex = Status['Job'][1];
      $('SelJob').selectedIndex = Status['Job'][2];
      $('StatusRace').innerHTML = Name['Race'][Status['Job'][0]][Flag[0]];
      $('StatusRSkill').innerHTML = Name['Race']['Skill'][Status['Job'][0]][Status['Job'][1]][Flag[0]];
      $('StatusJob').innerHTML = Name['Job'][Status['Job'][2]][Flag[0] + 2];
      $('StatusLev').innerHTML = Status['Lev'][0];
      $('StatusStP_0').innerHTML = Status['StP'][0];
      $('StatusStP_1').innerHTML = Status['StP'][1];
      $('StatusSkP_0').innerHTML = Status['SkP'][0];
      $('StatusSkP_1').innerHTML = Status['SkP'][1];
      $('StatusUnP_0').innerHTML = Status['UnP'][0];
      $('StatusUnP_1').innerHTML = Status['UnP'][1];
      for (i=0;i<Name['Skill'].length;i++) {
        $('Skill_' + i + '_1').innerHTML = Status['Skill'][i][0];
        $('Skill_' + i + '_2').innerHTML = Status['Skill'][i][2];
        if (i != 0 && i != 6 && i != 12 && i != 17 && i != 22) {
          $('Skill_' + i + '_3').innerHTML = (Status['Skill'][i][2] + Status['Skill'][i][3] == MaxSk) ? '-': SPt[Status['Skill'][i][2] + Status['Skill'][i][3] + 1][1];
          CalcSet('Skill',i,0,'Potential');
          CalcSet('Skill',i,0,'Adeptness');
        }
      }
      SkillBar('ALL');
      CalcSet('ALL');
      Log();
    break;
    case 'Save':
      tmp[b] = Store();
    break;
    case 'Load':
      Expand(tmp[b]);
      ListCreate('Set');
      ListCreate('Equip');
      ListCreate('SoulSelect');
      ListCreate('SoulCheck');
      $('SelRace').selectedIndex = Status['Job'][0];
      RJChange('RSkill');
      $('SelRSkill').selectedIndex = Status['Job'][1];
      $('SelJob').selectedIndex = Status['Job'][2];
      $('StatusRace').innerHTML = Name['Race'][Status['Job'][0]][Flag[0]];
      $('StatusRSkill').innerHTML = Name['Race']['Skill'][Status['Job'][0]][Status['Job'][1]][Flag[0]];
      $('StatusJob').innerHTML = Name['Job'][Status['Job'][2]][Flag[0] + 2];
      $('StatusLev').innerHTML = Status['Lev'][0];
      $('StatusStP_0').innerHTML = Status['StP'][0];
      $('StatusStP_1').innerHTML = Status['StP'][1];
      $('StatusSkP_0').innerHTML = Status['SkP'][0];
      $('StatusSkP_1').innerHTML = Status['SkP'][1];
      $('StatusUnP_0').innerHTML = Status['UnP'][0];
      $('StatusUnP_1').innerHTML = Status['UnP'][1];
      for (i=0;i<Name['Skill'].length;i++) {
        $('Skill_' + i + '_1').innerHTML = Status['Skill'][i][0];
        $('Skill_' + i + '_2').innerHTML = Status['Skill'][i][2];
        if (i != 0 && i != 6 && i != 12 && i != 17 && i != 22) {
          $('Skill_' + i + '_3').innerHTML = (Status['Skill'][i][2] + Status['Skill'][i][3] == MaxSk) ? '-': SPt[Status['Skill'][i][2] + Status['Skill'][i][3] + 1][1];
          CalcSet('Skill',i,0,'Potential');
          CalcSet('Skill',i,0,'Adeptness');
        }
      }
      SkillBar('ALL');
      CalcSet('ALL');
      Log();
    break;
    case 'Del':
      tmp[b] = '0,0,0,1,0,0,0,0,0,0,7,0,0,8,0,0,4,0,0,6,0,0,4,0,0,5,0,0,18,0,120,0,5,0,25,0,2,0,25,0,5,0,25,0,2,0,20,0,4,0,25,0,1,0,10,0,1,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,5,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0';
    break;
    case 'View':
      tmp[b] = tmp[b].split(',');
      for (i=0;i<tmp[b].length;i++)
        tmp[b][i] = Number(tmp[b][i]);
      k=0;
      $('FileNo').innerHTML = 'File NO.' + zeroPadding(2,1,b + 1);
      $('FileRace').innerHTML = Name['Race'][tmp[b][k]][Flag[0]];k++;
      $('FileRSkill').innerHTML = Name['Race']['Skill'][tmp[b][k - 1]][tmp[b][k]][Flag[0]];k++;
      $('FileJob').innerHTML = Name['Job'][tmp[b][k]][Flag[0] + 2];k++;
      $('FileStatusLev').innerHTML = tmp[b][k];k++;
      $('FileStatusStP_0').innerHTML = tmp[b][k];k++;
      $('FileStatusStP_1').innerHTML = tmp[b][k];k++;
      $('FileStatusSkP_0').innerHTML = tmp[b][k];k++;
      $('FileStatusSkP_1').innerHTML = tmp[b][k];k++;
      $('FileStatusUnP_0').innerHTML = tmp[b][k];k++;
      $('FileStatusUnP_1').innerHTML = tmp[b][k];k++;
      StatusColor('FileStatusSTA',tmp[b][k],tmp[b][k + 1],tmp[b][k + 2]);k+=3;
      StatusColor('FileStatusSTR',tmp[b][k],tmp[b][k + 1],tmp[b][k + 2]);k+=3;
      StatusColor('FileStatusAGI',tmp[b][k],tmp[b][k + 1],tmp[b][k + 2]);k+=3;
      StatusColor('FileStatusDEX',tmp[b][k],tmp[b][k + 1],tmp[b][k + 2]);k+=3;
      StatusColor('FileStatusSPR',tmp[b][k],tmp[b][k + 1],tmp[b][k + 2]);k+=3;
      StatusColor('FileStatusINT',tmp[b][k],tmp[b][k + 1],tmp[b][k + 2]);k+=3;
      for (i=0;i<Name['Skill'].length;i++,k+=2) {
        $('FileSkill_' + i + '_0').innerHTML = tmp[b][k] + tmp[b][k + 1];
        k+=2;
        $('FileSkill_' + i + '_1').innerHTML = tmp[b][k] + tmp[b][k + 1];
      }
      for (i=0;i<=13;i++,k+=7)
        $('FileEquip_' + i).innerHTML = EquipOption(tmp[b][k],tmp[b][k + 1],tmp[b][k + 2],tmp[b][k + 3],tmp[b][k + 4],tmp[b][k + 5],tmp[b][k + 6]);
    break;
  }
  if (a != 'View') {
    tmp = tmp.join('/');
    localStorage.file = Base64.toBase64(RawDeflate.deflate(Base64.utob(tmp)));
  }
}
// -------------------------------------------------------------------------------------
function Store() {
  var i,j,tmp;
  tmp = new Array();

  for (i=0;i<=2;i++)
    tmp.push(Status['Job'][i]);
  tmp.push(Status['Lev'][0]);
  tmp.push(Status['StP'][0]);
  tmp.push(Status['StP'][1]);
  tmp.push(Status['SkP'][0]);
  tmp.push(Status['SkP'][1]);
  tmp.push(Status['UnP'][0]);
  tmp.push(Status['UnP'][1]);
  for (i=0;i<6;i++)
    for (j=0;j<Status[Name['Option'][i][2]].length;j++)
      tmp.push(Status[Name['Option'][i][2]][j]);
  for (i=0;i<Name['Skill'].length;i++)
    for (j=0;j<Name['Skill'][i].length;j++)
      tmp.push(Status['Skill'][i][j]);
  for (i=0;i<Status['Equip'].length;i++) {
    for (j=0;j<Status['Equip'][i].length;j++)
      tmp.push(Status['Equip'][i][j]);
  }
  tmp = tmp.join(',');
  return tmp;
}
// -------------------------------------------------------------------------------------
function Expand(a) {
  var a,i,j,k,tmp;
  if (!a) return false;
  a = (a.search(',') != -1) ? a: Base64.btou(RawDeflate.inflate(Base64.fromBase64(a)));
  tmp = a.split(',');
  for (i=0;i<tmp.length;i++)
    tmp[i] = Number(tmp[i]);

  for (i=0,k=0;i<=2;i++,k++)
    Status['Job'][i] = tmp[k];
  Status['Lev'][0] = tmp[k];k++;
  Status['StP'][0] = tmp[k];k++;
  Status['StP'][1] = tmp[k];k++;
  Status['SkP'][0] = tmp[k];k++;
  Status['SkP'][1] = tmp[k];k++;
  Status['UnP'][0] = tmp[k];k++;
  Status['UnP'][1] = tmp[k];k++;
  for (i=0;i<6;i++)
    for (j=0;j<Status[Name['Option'][i][2]].length;j++,k++)
      Status[Name['Option'][i][2]][j] = tmp[k]
  for (i=0;i<Name['Skill'].length;i++)
    for (j=0;j<4;j++,k++)
      Status['Skill'][i][j] = tmp[k];
  for (i=0;i<Status['Equip'].length;i++) {
    for (j=0;j<Status['Equip'][i].length;j++,k++)
      Status['Equip'][i][j] = tmp[k];
  }
}