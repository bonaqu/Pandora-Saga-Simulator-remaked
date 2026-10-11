(function () {
  'use strict';
  // Offline-safe copies of the D1-editable admin.shell.* UI registry. A
  // failed public localization GET can NEVER lock out the login form.
  const DEFAULTS = {"admin.shell.brand":{"en":"PANDORA FIELD CONSOLE","ru":"КОНСОЛЬ PANDORA","jp":"PANDORA 管理コンソール","tw":"PANDORA 管理主控台"},"admin.shell.channel":{"en":"ADMIN / SECURE CHANNEL","ru":"АДМИН / ЗАЩИЩЁННЫЙ КАНАЛ","jp":"管理者 / 安全な接続","tw":"管理員 / 安全連線"},"admin.shell.boot":{"en":"IDDQD ACCEPTED","ru":"IDDQD ПРИНЯТ","jp":"IDDQD 認証済み","tw":"IDDQD 已接受"},"admin.shell.locked":{"en":"GOD MODE REQUIRES AUTHENTICATION","ru":"РЕЖИМ БОГА: ТРЕБУЕТСЯ ВХОД","jp":"GOD MODE：認証が必要です","tw":"GOD MODE：需要登入驗證"},"admin.shell.unlocked":{"en":"GOD MODE ENABLED / WELCOME, ADMIN","ru":"РЕЖИМ БОГА ВКЛЮЧЁН / ДОБРО ПОЖАЛОВАТЬ","jp":"GOD MODE 起動 / 管理者の方、ようこそ","tw":"GOD MODE 已啟用 / 歡迎管理員"},"admin.shell.welcome":{"en":"Sign in to manage the Modern catalog. Legacy 2.00 remains preserved.","ru":"Войди для управления каталогом Modern. Legacy 2.00 остаётся нетронутым.","jp":"Modern カタログを管理するにはログインしてください。Legacy 2.00 は変更されません。","tw":"登入以管理 Modern 目錄。Legacy 2.00 將維持原樣。"},"admin.shell.enter":{"en":"Enter your administrator credentials.","ru":"Введи данные администратора.","jp":"管理者の認証情報を入力してください。","tw":"請輸入管理員登入資料。"},"admin.shell.denied":{"en":"CHEAT FAILED / ACCESS DENIED","ru":"ЧИТ НЕ СРАБОТАЛ / ДОСТУП ЗАПРЕЩЁН","jp":"CHEAT 失敗 / アクセス拒否","tw":"CHEAT 失敗 / 拒絕存取"},"admin.shell.rate":{"en":"CHEAT FAILED / ACCESS DENIED. Too many attempts. Try again later.","ru":"ЧИТ НЕ СРАБОТАЛ / ДОСТУП ЗАПРЕЩЁН. Слишком много попыток. Повтори позднее.","jp":"CHEAT 失敗 / アクセス拒否。試行回数が多すぎます。後でもう一度お試しください。","tw":"CHEAT 失敗 / 拒絕存取。嘗試次數過多，請稍後再試。"},"admin.shell.origin":{"en":"CHEAT FAILED / ACCESS DENIED. Sign-in must start from the production simulator or this secure page. Try again here; your password has not changed.","ru":"ЧИТ НЕ СРАБОТАЛ / ДОСТУП ЗАПРЕЩЁН. Начни вход с основного симулятора или этой защищённой страницы. Пароль не изменён.","jp":"CHEAT 失敗 / アクセス拒否。正式なシミュレーターかこの安全なページからログインしてください。パスワードは変更されていません。","tw":"CHEAT 失敗 / 拒絕存取。請從正式模擬器或本安全頁面登入。你的密碼並未變更。"},"admin.shell.authenticated":{"en":"Authenticated on the secure Worker origin.","ru":"Вход подтверждён на защищённом сервере.","jp":"安全なサーバーで認証されました。","tw":"已於安全伺服器完成驗證。"},"admin.shell.expired":{"en":"Session expired. Sign in again.","ru":"Сессия истекла. Войди снова.","jp":"セッションの有効期限が切れました。再度ログインしてください。","tw":"工作階段已過期，請重新登入。"},"admin.shell.unavailable":{"en":"Secure service unavailable. Please try again later.","ru":"Защищённый сервис недоступен. Попробуй позже.","jp":"安全なサービスに接続できません。後でもう一度お試しください。","tw":"安全服務暫時無法使用，請稍後再試。"},"admin.shell.loggedOut":{"en":"GOD MODE DISABLED","ru":"РЕЖИМ БОГА ВЫКЛЮЧЁН","jp":"GOD MODE 停止","tw":"GOD MODE 已停用"},"admin.shell.logoutUnconfirmed":{"en":"Logout was not confirmed. Your session may still be active.","ru":"Выход не подтверждён. Сессия могла остаться активной.","jp":"ログアウトを確認できませんでした。セッションが有効な可能性があります。","tw":"無法確認登出結果，你的工作階段可能仍然有效。"},"admin.shell.login":{"en":"LOGIN","ru":"ЛОГИН","jp":"ログイン名","tw":"登入帳號"},"admin.shell.password":{"en":"PASSWORD","ru":"ПАРОЛЬ","jp":"パスワード","tw":"密碼"},"admin.shell.authenticate":{"en":"AUTHENTICATE","ru":"ВОЙТИ","jp":"認証する","tw":"驗證登入"},"admin.shell.workspace":{"en":"CATALOG CONTROL","ru":"УПРАВЛЕНИЕ КАТАЛОГОМ","jp":"カタログ管理","tw":"目錄管理"},"admin.shell.logout":{"en":"LOGOUT","ru":"ВЫЙТИ","jp":"ログアウト","tw":"登出"},"admin.shell.jumpTranslations":{"en":"01 / Translations","ru":"01 / Переводы","jp":"01 / 翻訳","tw":"01 / 翻譯"},"admin.shell.jumpCatalog":{"en":"02 / Catalog, equipment and skills","ru":"02 / Каталог, предметы и навыки","jp":"02 / カタログ・装備・スキル","tw":"02 / 目錄、裝備與技能"},"admin.shell.capabilitiesTitle":{"en":"Editor capabilities and boundaries","ru":"Возможности и границы редактора","jp":"エディターの機能と制限","tw":"編輯器的功能與限制"},"admin.shell.capabilitiesBody":{"en":"The translation center edits interface text, skills, equipment, Souls, classes, races and calculated-stat names in all four languages. Language filters are for status and coverage only. The catalog below also handles class progression, racial passives and item data. Localization changes never alter calculations or saved builds.","ru":"Единый центр переводов редактирует интерфейс, навыки, снаряжение, души, классы, расы и названия расчётных характеристик сразу на четырёх языках. Языковые фильтры нужны только для статуса и статистики. Каталог ниже также поддерживает прогрессию классов, расовые пассивки и игровые предметы. Изменение перевода не влияет на расчёты и билды.","jp":"翻訳センターでは、UI、スキル、装備、ソウル、クラス、種族、計算結果の名称を4言語で編集できます。言語フィルターは翻訳状況とカバー率の確認に使用します。下のカタログではクラスの成長、種族パッシブ、アイテムデータも管理できます。翻訳の変更は計算や保存済みビルドに影響しません。","tw":"翻譯中心可同時編輯四種語言的介面、技能、裝備、靈魂、職業、種族及計算結果名稱。語言篩選僅用於翻譯狀態和完成度統計。下方目錄亦管理職業成長、種族被動技能及道具資料。翻譯變更不會影響計算或已儲存的配裝。"},"admin.shell.sourcesTitle":{"en":"Translation sources and publication","ru":"Подсказка по источникам переводов","jp":"翻訳の出典と公開","tw":"翻譯來源與發布"},"admin.shell.sourcesBody":{"en":"Approved translations are included in the baseline. New publications, drafts and history are stored in versioned D1 entries. Excel is no longer required for publishing translations.","ru":"Утверждённые переводы находятся в исходном каталоге. Новые публикации, черновики и история хранятся в D1 с версиями. Excel для новых переводов больше не нужен.","jp":"承認済みの翻訳は初期データに含まれています。新しい公開翻訳、下書き、履歴はバージョン付きのD1に保存されます。翻訳の公開にExcelは不要です。","tw":"已核准的翻譯包含於初始資料。新的翻譯發布、草稿與歷史紀錄均以版本化方式儲存在D1。發布翻譯不再需要Excel。"},"admin.shell.catalogHelp":{"en":"Catalog is the single editor for newly created equipment, Souls and skills. The translation center shows their published text and opens their catalog card. Catalog drafts are published in one revision.","ru":"Каталог — единственный редактор для новых предметов, душ и умений. Центр переводов показывает опубликованные тексты и открывает нужную карточку. Черновики каталога публикуются одной ревизией.","jp":"新しく作成した装備、ソウル、スキルはカタログでのみ編集します。翻訳センターには公開済みの文章が表示され、対応するカタログカードを開けます。カタログの下書きは1つの改訂として公開します。","tw":"新建裝備、靈魂與技能僅能在目錄編輯。翻譯中心顯示已發布內容，並可開啟對應的目錄卡片。目錄草稿以單一版本發布。"},"admin.shell.catalogLoading":{"en":"Loading the catalog…","ru":"Загрузка каталога…","jp":"カタログを読み込み中…","tw":"正在載入目錄…"},"admin.shell.footer":{"en":"MODERN CATALOG / MUSEUM ENGINE 2.00","ru":"КАТАЛОГ MODERN / ИСТОРИЧЕСКИЙ ДВИЖОК 2.00","jp":"MODERN カタログ / 保存版エンジン 2.00","tw":"MODERN 目錄 / 保存版引擎 2.00"},"admin.shell.locale":{"en":"Admin interface language","ru":"Язык админки","jp":"管理画面の言語","tw":"管理介面語言"},"admin.shell.navAria":{"en":"Quick navigation through admin tools","ru":"Быстрый переход по админке","jp":"管理ツールのクイック移動","tw":"管理工具快速導覽"},"admin.shell.workspaceAria":{"en":"Catalog management","ru":"Управление каталогом","jp":"カタログ管理","tw":"目錄管理"}};
  const choices=[['en','English'],['ru','Русский'],['jp','日本語'],['tw','繁體中文']];
  const supported=new Set(choices.map(pair=>pair[0]));
  let locale='en',overrides={};
  function determineLocale(){
    try{
      const saved=localStorage.getItem('pandora-admin-language');
      if(supported.has(saved))return saved;
    }catch{}
    const current=String(navigator.language||'').toLowerCase();
    if(current.startsWith('ru'))return 'ru';
    if(current.startsWith('ja'))return 'jp';
    if(current==='zh-tw'||current==='zh-hk'||current.startsWith('zh-hant'))return 'tw';
    return 'en';
  }
  function t(key){
    const value=overrides?.[locale]?.[key];
    return typeof value==='string'&&value.trim()?value:
      DEFAULTS[key]?.[locale]||DEFAULTS[key]?.en||key;
  }
  function text(node,key){
    if(!node || !DEFAULTS[key])return;
    node.dataset.adminShellI18nKey=key;
    const value=t(key);
    if(node.textContent!==value)node.textContent=value;
  }
  function render(){
    document.documentElement.lang={ru:'ru',en:'en',jp:'ja',tw:'zh-Hant'}[locale];
    document.querySelectorAll('[data-admin-shell-i18n-key]').forEach(node=>{
      text(node,node.dataset.adminShellI18nKey);
    });
    const select=document.getElementById('admin-shell-language');
    if(select){
      select.value=locale;
      select.setAttribute('aria-label',t('admin.shell.locale'));
    }
  }
  function setLocale(next){
    if(!supported.has(next))return false;
    locale=next;
    try{localStorage.setItem('pandora-admin-language',locale);}catch{}
    render();
    window.dispatchEvent(new Event('pandora-admin:localechange'));
    return true;
  }
  function mount(){
    locale=determineLocale();
    const header=document.querySelector('.terminal-header');
    if(header && !document.getElementById('admin-shell-language')){
      const select=document.createElement('select');
      select.id='admin-shell-language';
      select.className='admin-shell-language';
      for(const [value,label] of choices){
        const option=document.createElement('option');
        option.value=value;option.textContent=label;select.appendChild(option);
      }
      select.addEventListener('change',()=>setLocale(select.value));
      header.appendChild(select);
    }
    render();
    // Public, read-only localization response. Do not send credentials,
    // log tokens, touch cookies or call any authentication endpoint.
    fetch('/api/localization',{method:'GET',cache:'no-store',
      signal:AbortSignal.timeout(8000)})
      .then(reply=>reply.ok?reply.json():null)
      .then(body=>{
        if(!body||body.ok!==true||!body.overrides?.ui)return;
        for(const name of supported){
          const candidates=body.overrides.ui[name];
          if(!candidates || typeof candidates!=='object')continue;
          overrides[name]={};
          for(const [key,value] of Object.entries(candidates)){
            if(DEFAULTS[key]&&typeof value==='string'&&value.trim()&&value.length<=4000)
              overrides[name][key]=value;
          }
        }
        render();
      }).catch(()=>{}); // No localization request may disable login.
  }
  window.PandoraAdminShellI18n=Object.freeze({t,text,setLocale,getLocale:()=>locale});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();
