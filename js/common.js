var CheatFlag = 0;
var Layer    = null;
var LayerNum = 0;
var noClose  = 0;
var Timer    = null;
var TimeOut  = 0;

// ------------------------------------------------------------------------------------------------------------------------------
function DDMOpen(a,b) {
  var x = document.getElementById(DropDownName + a + '_' + b);
  var y = a + b;

  if (x) {
    DDMClose('Cancel');
    x.style.display = 'inline';
    if (Layer && (LayerNum != y)) Layer.style.display = 'none';
    Layer = x;
    LayerNum = y;
  } else if (Layer) {
    Layer.style.display = 'none';
    LayerNum = 0;
    Layer = null;
  }
}
// ------------------------------------------------------------------------------------------------------------------------------
function DDMClose(a) {
  switch(a) {
    case 'Time':
      Timer = window.setTimeout('DDMClose("Close")',TimeOut);
    break;
    case 'Cancel':
      if (Timer) {
        window.clearTimeout(Timer);
        Timer = null;
      }
    break;
    case 'Close':
      if (Layer && noClose != 1) {
        Layer.style.display = 'none';
        LayerNum = 0;
        Layer = null;
      } else noClose = 0;
      Layer = null;
    break;
  }
}
// ------------------------------------------------------------------------------------------------------------------------------
function Message(a,b) {
  var tmp = new Array();
  tmp[1] = (CheatFlag) ? 'みｗなｗぎｗっｗてｗきｗたｗｗｗｗ' : '';
  switch (a) {
    case 1: document.getElementById('Msg2').innerHTML = b; break;
    default:
      tmp[2] = Math.floor(Math.random() * 81);
      if (tmp[2] == 0) {
        tmp[0] = '　 _ 　　∩<br />(　ﾟ∀ﾟ)彡<br />　⊂彡';
        tmp[1] = (CheatFlag) ? tmp[1] : 'おｐｐ';
      } else if (tmp[2] == 10) {
        tmp[0] = 'インペリアルクロス！！<br />　\'`ｨ(´∀｀∩<br />ﾊﾟﾘｲ(´∀｀∩ \'`ｨ(´∀｀∩ \'`ｨ(´∀｀∩<br />　\'`ｨ(´∀｀∩';
        tmp[1] = (CheatFlag) ? tmp[1] : 'パリイ!!&nbsp;パリイ!!&nbsp;パリイ!!';
      } else if (tmp[2] == 20) {
        tmp[0] = 'インペリアルアロー！！<br />　　　　　　\'`ｨ(´∀｀∩<br />…(´д｀；) \'`ｨ(´∀｀∩ \'`ｨ(´∀｀∩<br />　　　　　　\'`ｨ(´∀｀∩';
        tmp[1] = (CheatFlag) ? tmp[1] : 'ていこく&nbsp;ぼうさつ&nbsp;の&nbsp;れきし';
      } else if (tmp[2] == 30) {
        tmp[0] = 'な　なにをする　きさまらー！';
        tmp[1] = (CheatFlag) ? tmp[1] : 'ころしてでも&nbsp;&nbsp;うばいとる'
      } else if (tmp[2] == 40) {
        tmp[0] = '(ﾟдﾟ)';
        tmp[1] = (CheatFlag) ? tmp[1] : 'こっち見んな'
      } else if (tmp[2] == 50) {
        tmp[0] = 'ぬるぽ';
        tmp[1] = (CheatFlag) ? tmp[1] : 'ｶﾞｯ'
      } else if (tmp[2] == 60) {
        tmp[0] = '∧<br />　(ﾟ、｡｀フ<br />　(uu ,,)o';
        tmp[1] = (CheatFlag) ? tmp[1] : 'うん？'
      } else if (tmp[2] == 70) {
        tmp[0] = ' _,,..,,,,_<br />&nbsp;　 　/ ,\' 3　 `ヽｰっ<br />&nbsp;　　 l　　 ⊃　⌒_つ<br />　 　`\'ｰ---‐\'\'\'\'\'"';
        tmp[1] = (CheatFlag) ? tmp[1] : '&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;';
      } else if (tmp[2] == 80) {
        tmp[0] = '〃∩ ∧＿∧<br />&nbsp;⊂⌒（ 　・ω・）<br />&nbsp;　 ｀ヽ_っ⌒/⌒ｃ<br />　　　　 ⌒ ⌒';
        tmp[1] = (CheatFlag) ? tmp[1] : 'はいはいわろすわろす'
      } else {
        tmp[0] = '\'`ｨ(´∀｀∩';
        tmp[1] = (CheatFlag) ? tmp[1] : '\'`ｨ(´∀｀∩';
      }
      document.getElementById('Msg1').innerHTML = '&lt;&nbsp;' + tmp[1] + '&nbsp;&gt;';
      document.getElementById('Msg2').innerHTML = tmp[0];
    break;
  }
}
// ------------------------------------------------------------------------------------------------------------------------------
function addFigure(a) {
  var tmp = new String(a).replace(/,/g, "");
  while (tmp != (tmp = tmp.replace(/^(-?\d+)(\d{3})/, "$1,$2")));
  return tmp;
}
// ------------------------------------------------------------------------------------------------------------------------------
function zeroPadding(a,b,c) {
  var tmp = '0';
  if (String(b).length >= a)
    return String(c);
  while (tmp.length < a)
    tmp += (b) ? ' ': '0';
  return (tmp + c).slice(-a);
}
// ------------------------------------------------------------------------------------------------------------------------------
function CountLength(a) {
  var tmp = new Array();
  tmp[0] = 0;
  for (var i=0;i<a.length;i++) {
    tmp[1] = a.charCodeAt(i);
    if (
      (tmp[1] >= 0x0 && tmp[1] < 0x81) ||
      (tmp[1] == 0xf8f0) ||
      (tmp[1] >= 0xff61 && tmp[1] < 0xffa0) ||
      (tmp[1] >= 0xf8f1 && tmp[1] < 0xf8f4)
    ) tmp[0] += 10;
    else tmp[0] += 20;
  }
  return tmp[0] / 10;
}
// ------------------------------------------------------------------------------------------------------------------------------
function IsArray(array) {
  return !(
    !array ||
    (!array.length || array.length == 0) ||
    typeof array !== 'object' ||
    !array.constructor ||
    array.nodeType ||
    array.item
  );
}