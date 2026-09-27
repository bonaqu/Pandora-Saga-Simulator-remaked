<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Strict//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  
  

  
<head>
    <title>
      /lang/javascript/Base64/trunk/base64.js –
      CodeRepos::Share – Trac
    </title>
        <link rel="search" href="/share/search" />
        <link rel="help" href="/share/wiki/TracGuide" />
        <link rel="alternate" href="/share/browser/lang/javascript/Base64/trunk/base64.js?format=txt" type="text/plain" title="Plain Text" /><link rel="alternate" href="/share/export/38979/lang/javascript/Base64/trunk/base64.js" type="text/x-javascript; charset=utf-8" title="Original Format" />
        <link rel="up" href="/share/browser/lang/javascript/Base64/trunk" title="Parent directory" />
        <link rel="start" href="/share/wiki" />
        <link rel="stylesheet" href="/share/chrome/common/css/trac.css" type="text/css" /><link rel="stylesheet" href="/share/chrome/common/css/code.css" type="text/css" /><link rel="stylesheet" href="/share/chrome/common/css/browser.css" type="text/css" />
        <link rel="shortcut icon" href="/share/chrome/common/trac.ico" type="image/x-icon" />
        <link rel="icon" href="/share/chrome/common/trac.ico" type="image/x-icon" />
      <link type="application/opensearchdescription+xml" rel="search" href="/share/search/opensearch" title="Search CodeRepos::Share" />
    <script type="text/javascript" src="/share/chrome/common/js/jquery.js"></script><script type="text/javascript" src="/share/chrome/common/js/trac.js"></script><script type="text/javascript" src="/share/chrome/common/js/search.js"></script>
    <!--[if lt IE 7]>
    <script type="text/javascript" src="/share/chrome/common/js/ie_pre7_hacks.js"></script>
    <![endif]-->
    <link rel="stylesheet" type="text/css" media="screen,tv,projection" title="ass-ari" href="http://svn.coderepos.org/share/websites/coderepos.org/trac/share/styles/ass-ari.css" /><link rel="alternate stylesheet" type="text/css" media="screen,tv,projection" title="plants-repository" href="http://svn.coderepos.org/share/websites/coderepos.org/trac/share/styles/plants-repository.css" /><link rel="alternate stylesheet" type="text/css" media="screen,tv,projection" title="default" href="http://svn.coderepos.org/share/websites/coderepos.org/trac/share/styles/default.css" /><link rel="openid2.provider" href="http://openid.coderepos.org/auth" /><link rel="openid.server" href="http://openid.coderepos.org/auth" /><script type="text/javascript" src="http://svn.coderepos.org/share/lang/javascript/javascript-xpath/trunk/release/javascript-xpath-latest-cmp.js"></script><script type="text/javascript" src="http://svn.coderepos.org/share/lang/javascript/javascript-xpath/bindings/jquery/src/xpath4jquery.js"></script><script type="text/javascript" src="http://svn.coderepos.org/share/websites/coderepos.org/trac/share/js/TracUtils.js"></script>
  </head>


  

  <head>
    <title>/lang/javascript/Base64/trunk/base64.js</title>
    <script type="text/javascript">
      jQuery(document).ready(function($) {
        $("#jumploc input").hide();
        $("#jumploc select").change(function () {
          this.parentNode.parentNode.submit();
        })
      });
    </script>
  </head>
  <body>
    <div id="banner">
      <div id="header">
        <a id="logo" href="/share/wiki/TracIni#header_logo-section"><img src="/share/chrome/site/your_project_logo.png" alt="(please configure the [header_logo] section in trac.ini)" /></a>
      </div>
      <form id="search" action="/share/search" method="get">
        <div>
          <label for="proj-search">Search:</label>
          <input type="text" id="proj-search" name="q" size="18" value="" />
          <input type="submit" value="Search" />
        </div>
      </form>
      <div id="metanav" class="nav">
    <ul>
      <li class="first"><a href="/share/login">Login</a></li><li><a href="/share/prefs">Preferences</a></li><li><a href="/share/wiki/TracGuide">Help/Guide</a></li><li class="last"><a href="/share/about">About Trac</a></li>
    </ul>
  </div>
    </div>
    <div id="mainnav" class="nav">
    <ul>
      <li class="first"><a href="/share/wiki">Wiki</a></li><li><a href="/share/timeline">Timeline</a></li><li><a href="/share/roadmap">Roadmap</a></li><li class="active"><a href="/share/browser">Browse Source</a></li><li><a href="/share/report">View Tickets</a></li><li class="last"><a href="/share/search">Search</a></li>
    </ul>
  </div>
    <div id="main">
      <div id="ctxtnav" class="nav">
        <h2>Context Navigation</h2>
          <ul>
            <li class="first "><a href="/share/changeset/30682/lang/javascript/Base64/trunk/base64.js">Last Change</a></li><li><a href="/share/browser/lang/javascript/Base64/trunk/base64.js?annotate=blame&amp;rev=30682" title="Annotate each line with the last changed revision (this can be time consuming...)">Annotate</a></li><li class="last"><a href="/share/log/lang/javascript/Base64/trunk/base64.js">Revision Log</a></li>
          </ul>
        <hr />
      </div>
    <div id="content" class="browser">
      <h1>
    <a class="pathentry first" title="Go to root directory" href="/share/browser">root</a><span class="pathentry sep">/</span><a class="pathentry" title="View lang" href="/share/browser/lang">lang</a><span class="pathentry sep">/</span><a class="pathentry" title="View javascript" href="/share/browser/lang/javascript">javascript</a><span class="pathentry sep">/</span><a class="pathentry" title="View Base64" href="/share/browser/lang/javascript/Base64">Base64</a><span class="pathentry sep">/</span><a class="pathentry" title="View trunk" href="/share/browser/lang/javascript/Base64/trunk">trunk</a><span class="pathentry sep">/</span><a class="pathentry" title="View base64.js" href="/share/browser/lang/javascript/Base64/trunk/base64.js">base64.js</a>
    <br style="clear: both" />
  </h1>
      <div id="jumprev">
        <form action="" method="get">
          <div>
            <label for="rev">
              View revision:</label>
            <input type="text" id="rev" name="rev" size="6" />
          </div>
        </form>
      </div>
      <table id="info" summary="Revision info">
        <tr>
          <th scope="col">
            Revision <a href="/share/changeset/30682">30682</a>, <span title="3513 bytes">3.4 kB</span>
            (checked in by dankogai, <a class="timeline" href="/share/timeline?from=2009-03-02T07%3A44%3A23Z%2B0900&amp;precision=second" title="2009-03-02T07:44:23Z+0900 in Timeline">2 years</a> ago)
          </th>
        </tr>
        <tr>
          <td class="message searchable">
              <p>
Fixed IE bug <br />
</p>
          </td>
        </tr>
      </table>
      <div id="preview" class="searchable">
    <table class="code"><thead><tr><th class="lineno" title="Line numbers">Line</th><th class="content"> </th></tr></thead><tbody><tr><th id="L1"><a href="#L1">1</a></th><td>/*</td></tr><tr><th id="L2"><a href="#L2">2</a></th><td> * $Id: base64.js,v 1.1 2009/03/01 22:38:45 dankogai Exp dankogai $</td></tr><tr><th id="L3"><a href="#L3">3</a></th><td> *</td></tr><tr><th id="L4"><a href="#L4">4</a></th><td> * History:</td></tr><tr><th id="L5"><a href="#L5">5</a></th><td> *   dankogai's original: character-based</td></tr><tr><th id="L6"><a href="#L6">6</a></th><td> *   drry's fix: split string to array then join</td></tr><tr><th id="L7"><a href="#L7">7</a></th><td> *   new version: regexp-based</td></tr><tr><th id="L8"><a href="#L8">8</a></th><td> */</td></tr><tr><th id="L9"><a href="#L9">9</a></th><td></td></tr><tr><th id="L10"><a href="#L10">10</a></th><td>(function(){</td></tr><tr><th id="L11"><a href="#L11">11</a></th><td></td></tr><tr><th id="L12"><a href="#L12">12</a></th><td>var b64chars </td></tr><tr><th id="L13"><a href="#L13">13</a></th><td>    = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';</td></tr><tr><th id="L14"><a href="#L14">14</a></th><td>var b64tab = function(bin){</td></tr><tr><th id="L15"><a href="#L15">15</a></th><td>    var t = {};</td></tr><tr><th id="L16"><a href="#L16">16</a></th><td>    for (var i = 0, l = bin.length; i &lt; l; i++) t[bin.charAt(i)] = i;</td></tr><tr><th id="L17"><a href="#L17">17</a></th><td>    return t;</td></tr><tr><th id="L18"><a href="#L18">18</a></th><td>}(b64chars);</td></tr><tr><th id="L19"><a href="#L19">19</a></th><td></td></tr><tr><th id="L20"><a href="#L20">20</a></th><td>var sub_toBase64 = function(m){</td></tr><tr><th id="L21"><a href="#L21">21</a></th><td>    var n = (m.charCodeAt(0) &lt;&lt; 16)</td></tr><tr><th id="L22"><a href="#L22">22</a></th><td>          | (m.charCodeAt(1) &lt;&lt;  8)</td></tr><tr><th id="L23"><a href="#L23">23</a></th><td>          | (m.charCodeAt(2)      );</td></tr><tr><th id="L24"><a href="#L24">24</a></th><td>    return b64chars.charAt( n &gt;&gt;&gt; 18)</td></tr><tr><th id="L25"><a href="#L25">25</a></th><td>         + b64chars.charAt((n &gt;&gt;&gt; 12) &amp; 63)</td></tr><tr><th id="L26"><a href="#L26">26</a></th><td>         + b64chars.charAt((n &gt;&gt;&gt;  6) &amp; 63)</td></tr><tr><th id="L27"><a href="#L27">27</a></th><td>         + b64chars.charAt( n         &amp; 63);</td></tr><tr><th id="L28"><a href="#L28">28</a></th><td>};</td></tr><tr><th id="L29"><a href="#L29">29</a></th><td></td></tr><tr><th id="L30"><a href="#L30">30</a></th><td>var toBase64 = function(bin){</td></tr><tr><th id="L31"><a href="#L31">31</a></th><td>    if (bin.match(/[^\x00-\xFF]/)) throw 'unsupported character found' ;</td></tr><tr><th id="L32"><a href="#L32">32</a></th><td>    var padlen = 0;</td></tr><tr><th id="L33"><a href="#L33">33</a></th><td>    while(bin.length % 3) {</td></tr><tr><th id="L34"><a href="#L34">34</a></th><td>        bin += '\0';</td></tr><tr><th id="L35"><a href="#L35">35</a></th><td>        padlen++;</td></tr><tr><th id="L36"><a href="#L36">36</a></th><td>    };</td></tr><tr><th id="L37"><a href="#L37">37</a></th><td>    var b64 = bin.replace(/[\x00-\xFF]{3}/g, sub_toBase64);</td></tr><tr><th id="L38"><a href="#L38">38</a></th><td>    if (!padlen) return b64;</td></tr><tr><th id="L39"><a href="#L39">39</a></th><td>    b64 = b64.substr(0, b64.length - padlen);</td></tr><tr><th id="L40"><a href="#L40">40</a></th><td>    while(padlen--) b64 += '=';</td></tr><tr><th id="L41"><a href="#L41">41</a></th><td>    return b64;</td></tr><tr><th id="L42"><a href="#L42">42</a></th><td>};</td></tr><tr><th id="L43"><a href="#L43">43</a></th><td></td></tr><tr><th id="L44"><a href="#L44">44</a></th><td>var btoa = window.btoa || toBase64;</td></tr><tr><th id="L45"><a href="#L45">45</a></th><td></td></tr><tr><th id="L46"><a href="#L46">46</a></th><td>var sub_fromBase64 = function(m){</td></tr><tr><th id="L47"><a href="#L47">47</a></th><td>        var n = (b64tab[ m.charAt(0) ] &lt;&lt; 18)</td></tr><tr><th id="L48"><a href="#L48">48</a></th><td>            |   (b64tab[ m.charAt(1) ] &lt;&lt; 12)</td></tr><tr><th id="L49"><a href="#L49">49</a></th><td>            |   (b64tab[ m.charAt(2) ] &lt;&lt;  6)</td></tr><tr><th id="L50"><a href="#L50">50</a></th><td>            |   (b64tab[ m.charAt(3) ]);</td></tr><tr><th id="L51"><a href="#L51">51</a></th><td>    return String.fromCharCode(  n &gt;&gt; 16 )</td></tr><tr><th id="L52"><a href="#L52">52</a></th><td>        +  String.fromCharCode( (n &gt;&gt;  8) &amp; 0xff )</td></tr><tr><th id="L53"><a href="#L53">53</a></th><td>        +  String.fromCharCode(  n        &amp; 0xff );</td></tr><tr><th id="L54"><a href="#L54">54</a></th><td>};</td></tr><tr><th id="L55"><a href="#L55">55</a></th><td></td></tr><tr><th id="L56"><a href="#L56">56</a></th><td>var fromBase64 = function(b64){</td></tr><tr><th id="L57"><a href="#L57">57</a></th><td>    b64 = b64.replace(/[^A-Za-z0-9\+\/]/g, '');</td></tr><tr><th id="L58"><a href="#L58">58</a></th><td>    var padlen = 0;</td></tr><tr><th id="L59"><a href="#L59">59</a></th><td>    while(b64.length % 4){</td></tr><tr><th id="L60"><a href="#L60">60</a></th><td>        b64 += 'A';</td></tr><tr><th id="L61"><a href="#L61">61</a></th><td>        padlen++;</td></tr><tr><th id="L62"><a href="#L62">62</a></th><td>    }</td></tr><tr><th id="L63"><a href="#L63">63</a></th><td>    var bin = b64.replace(/[A-Za-z0-9\+\/]{4}/g, sub_fromBase64);</td></tr><tr><th id="L64"><a href="#L64">64</a></th><td>    bin.length -= [0,0,2,1][padlen];</td></tr><tr><th id="L65"><a href="#L65">65</a></th><td>    return bin;</td></tr><tr><th id="L66"><a href="#L66">66</a></th><td>};</td></tr><tr><th id="L67"><a href="#L67">67</a></th><td></td></tr><tr><th id="L68"><a href="#L68">68</a></th><td>var atob = window.atob || fromBase64;</td></tr><tr><th id="L69"><a href="#L69">69</a></th><td></td></tr><tr><th id="L70"><a href="#L70">70</a></th><td>var re_char_nonascii = /[^\x00-\xFF]/g;</td></tr><tr><th id="L71"><a href="#L71">71</a></th><td></td></tr><tr><th id="L72"><a href="#L72">72</a></th><td>var sub_char_nonascii = function(m){</td></tr><tr><th id="L73"><a href="#L73">73</a></th><td>    var n = m.charCodeAt(0);</td></tr><tr><th id="L74"><a href="#L74">74</a></th><td>    return n &lt; 0x800 ? String.fromCharCode(0xc0 | (n &gt;&gt;&gt;  6))</td></tr><tr><th id="L75"><a href="#L75">75</a></th><td>                     + String.fromCharCode(0x80 | (n &amp; 0x3f))</td></tr><tr><th id="L76"><a href="#L76">76</a></th><td>        :              String.fromCharCode(0xe0 | ((n &gt;&gt;&gt; 12) &amp; 0x0f))</td></tr><tr><th id="L77"><a href="#L77">77</a></th><td>                     + String.fromCharCode(0x80 | ((n &gt;&gt;&gt;  6) &amp; 0x3f))</td></tr><tr><th id="L78"><a href="#L78">78</a></th><td>                     + String.fromCharCode(0x80 |  (n         &amp; 0x3f))</td></tr><tr><th id="L79"><a href="#L79">79</a></th><td>        ;</td></tr><tr><th id="L80"><a href="#L80">80</a></th><td>};</td></tr><tr><th id="L81"><a href="#L81">81</a></th><td></td></tr><tr><th id="L82"><a href="#L82">82</a></th><td>var utob = function(uni){</td></tr><tr><th id="L83"><a href="#L83">83</a></th><td>    return uni.replace(re_char_nonascii, sub_char_nonascii);</td></tr><tr><th id="L84"><a href="#L84">84</a></th><td>};</td></tr><tr><th id="L85"><a href="#L85">85</a></th><td></td></tr><tr><th id="L86"><a href="#L86">86</a></th><td>var re_bytes_nonascii</td></tr><tr><th id="L87"><a href="#L87">87</a></th><td>    = /[\xC0-\xDF][\x80-\xBF]|[\xE0-\xEF][\x80-\xBF]{2}|[\xF0-\xF7][\x80-\xBF]{3}/g;</td></tr><tr><th id="L88"><a href="#L88">88</a></th><td></td></tr><tr><th id="L89"><a href="#L89">89</a></th><td>var sub_bytes_nonascii = function(m){</td></tr><tr><th id="L90"><a href="#L90">90</a></th><td>    var c0 = m.charCodeAt(0);</td></tr><tr><th id="L91"><a href="#L91">91</a></th><td>    var c1 = m.charCodeAt(1);</td></tr><tr><th id="L92"><a href="#L92">92</a></th><td>    if(c0 &lt; 0xe0){</td></tr><tr><th id="L93"><a href="#L93">93</a></th><td>        return String.fromCharCode(((c0 &amp; 0x1f) &lt;&lt; 6) | (c1 &amp; 0x3f));</td></tr><tr><th id="L94"><a href="#L94">94</a></th><td>    }else{</td></tr><tr><th id="L95"><a href="#L95">95</a></th><td>        var c2 = m.charCodeAt(2);</td></tr><tr><th id="L96"><a href="#L96">96</a></th><td>        return String.fromCharCode(</td></tr><tr><th id="L97"><a href="#L97">97</a></th><td>            ((c0 &amp; 0x0f) &lt;&lt; 12) | ((c1 &amp; 0x3f) &lt;&lt;  6) | (c2 &amp; 0x3f)</td></tr><tr><th id="L98"><a href="#L98">98</a></th><td>        );</td></tr><tr><th id="L99"><a href="#L99">99</a></th><td>    }</td></tr><tr><th id="L100"><a href="#L100">100</a></th><td>};</td></tr><tr><th id="L101"><a href="#L101">101</a></th><td>    </td></tr><tr><th id="L102"><a href="#L102">102</a></th><td>var btou = function(bin){</td></tr><tr><th id="L103"><a href="#L103">103</a></th><td>    return bin.replace(re_bytes_nonascii, sub_bytes_nonascii);</td></tr><tr><th id="L104"><a href="#L104">104</a></th><td>};</td></tr><tr><th id="L105"><a href="#L105">105</a></th><td></td></tr><tr><th id="L106"><a href="#L106">106</a></th><td>if (!this['Base64']) Base64 = {</td></tr><tr><th id="L107"><a href="#L107">107</a></th><td>    fromBase64:fromBase64,</td></tr><tr><th id="L108"><a href="#L108">108</a></th><td>    toBase64:toBase64,</td></tr><tr><th id="L109"><a href="#L109">109</a></th><td>    atob:atob,</td></tr><tr><th id="L110"><a href="#L110">110</a></th><td>    btoa:btoa,</td></tr><tr><th id="L111"><a href="#L111">111</a></th><td>    utob:utob,</td></tr><tr><th id="L112"><a href="#L112">112</a></th><td>    btou:btou,</td></tr><tr><th id="L113"><a href="#L113">113</a></th><td>    encode:function(u){ return btoa(utob(u)) },</td></tr><tr><th id="L114"><a href="#L114">114</a></th><td>    encodeURI:function(u){</td></tr><tr><th id="L115"><a href="#L115">115</a></th><td>        return btoa(utob(u)).replace(/[+\/]/g, function(m0){</td></tr><tr><th id="L116"><a href="#L116">116</a></th><td>            return m0 == '+' ? '-' : '_';</td></tr><tr><th id="L117"><a href="#L117">117</a></th><td>        }).replace(/=+$/, '');</td></tr><tr><th id="L118"><a href="#L118">118</a></th><td>    },</td></tr><tr><th id="L119"><a href="#L119">119</a></th><td>    decode:function(a){ </td></tr><tr><th id="L120"><a href="#L120">120</a></th><td>        return btou(atob(a.replace(/[-_]/g, function(m0){</td></tr><tr><th id="L121"><a href="#L121">121</a></th><td>            return m0 == '-' ? '+' : '/';</td></tr><tr><th id="L122"><a href="#L122">122</a></th><td>        })));</td></tr><tr><th id="L123"><a href="#L123">123</a></th><td>    }</td></tr><tr><th id="L124"><a href="#L124">124</a></th><td>};</td></tr><tr><th id="L125"><a href="#L125">125</a></th><td></td></tr><tr><th id="L126"><a href="#L126">126</a></th><td>})();</td></tr></tbody></table>
      </div>
      <div id="help">
        <strong>Note:</strong> See <a href="/share/wiki/TracBrowser">TracBrowser</a>
        for help on using the browser.
      </div>
      <div id="anydiff">
        <form action="/share/diff" method="get">
          <div class="buttons">
            <input type="hidden" name="new_path" value="/lang/javascript/Base64/trunk/base64.js" />
            <input type="hidden" name="old_path" value="/lang/javascript/Base64/trunk/base64.js" />
            <input type="hidden" name="new_rev" value="30682" />
            <input type="hidden" name="old_rev" value="30682" />
            <input type="submit" value="View changes..." title="Select paths and revs for Diff" />
          </div>
        </form>
      </div>
    </div>
    <div id="altlinks">
      <h3>Download in other formats:</h3>
      <ul>
        <li class="first">
          <a rel="nofollow" href="/share/browser/lang/javascript/Base64/trunk/base64.js?format=txt">Plain Text</a>
        </li><li class="last">
          <a rel="nofollow" href="/share/export/38979/lang/javascript/Base64/trunk/base64.js">Original Format</a>
        </li>
      </ul>
    </div>
    </div>
    <div id="footer" lang="en" xml:lang="en"><hr />
      <a id="tracpowered" href="http://trac.edgewall.org/"><img src="/share/chrome/common/trac_logo_mini.png" height="30" width="107" alt="Trac Powered" /></a>
      <p class="left">
        Powered by <a href="/share/about"><strong>Trac 0.11</strong></a><br />
        By <a href="http://www.edgewall.org/">Edgewall Software</a>.
      </p>
      <p class="right">Visit the Trac open source project at<br /><a href="http://trac.edgewall.org/">http://trac.edgewall.org/</a></p>
    </div>
  </body>
</html>