import {test,expect} from '@playwright/test';

// This verifies responsive rendering of *recalculated* equipped/buffed values
// and 4-digit overflow, not independent live-game formula parity.
test('equipped DEF + magic-resistance results remain readable with 4-digit values at every layout breakpoint',async({page})=>{
  test.setTimeout(240_000);
  for(const width of [320,390,620,861,1024,1366,1920]){
    await page.setViewportSize({width,height:900});
    const compared={};
    for(const locale of ['en','ru','jp','tw']){
      await page.goto('/?ui='+locale);
      const data=await page.evaluate(()=>{
        // Isolate already source-verified effects in the retained engine;
        // this is not a picker-eligibility test for the current level/class.
        Flag[7]=0;Flag['0_8']=1;Flag['14_4']=1;
        Status.Equip[3]=[310031,0,0,5,42,0,0];
        EquipCheck();CalcSet('ALL');
        const before=Store();
        const read=id=>document.getElementById('Status_'+id)?.textContent.trim();
        const computed={def:read(49),magic:read(145)};
        const rows=[...document.querySelectorAll('#StatusView [data-remaked-calculator-pair]')];
        if(rows.length!==43)throw Error('Expected all 43 result slots');
        const native=rows.map(row=>row.querySelector('.input_gt')?.textContent.trim());
        const measure=()=>{
          return rows.map(row=>{
            const label=row.querySelector('[id^="TextStatus_"]');
            const number=row.querySelector('.input_gt');
            const numberNode=number.querySelector('[id^="Status_"]')||number;
            const words=document.createRange();words.selectNodeContents(label);
            const digits=document.createRange();digits.selectNodeContents(numberNode);
            const labelRect=words.getBoundingClientRect(),numericRect=digits.getBoundingClientRect();
            const cell=number.getBoundingClientRect(),pair=row.getBoundingClientRect();
            return {
              labelFits:labelRect.right<=cell.left-1&&labelRect.left>=pair.left-1,
              digitsFit:numericRect.left>=cell.left-1&&numericRect.right<=cell.right+1,
              oneLine:labelRect.top>=pair.top-1&&labelRect.bottom<=pair.bottom+1
            };
          });
        };
        const actual=measure();
        rows.forEach(row=>{
          const number=row.querySelector('.input_gt');
          (number.querySelector('[id^="Status_"]')||number).textContent='1234';
        });
        const fourDigit=measure();
        return {computed,native,actual,fourDigit,
          scrollWidth:document.documentElement.scrollWidth,
          noMutation:before===Store()};
      });
      const label=width+':'+locale;
      expect(data.native,label).toHaveLength(43);
      expect(data.native.every(v=>v && !/NaN|Infinity|undefined|null/.test(v)),label).toBe(true);
      expect(Number(data.computed.def),label).toBeGreaterThan(8);
      expect(Number(data.computed.magic),label).toBeGreaterThanOrEqual(25);
      expect(data.actual.every(x=>x.labelFits&&x.digitsFit&&x.oneLine),label+':native').toBe(true);
      expect(data.fourDigit.every(x=>x.labelFits&&x.digitsFit&&x.oneLine),label+':four-digits').toBe(true);
      expect(data.scrollWidth,label).toBeLessThanOrEqual(width+1);
      expect(data.noMutation,label).toBe(true);
      compared[locale]=data.computed;
    }
    for(const locale of ['ru','jp','tw'])
      expect(compared[locale],width+':'+locale).toEqual(compared.en);
  }
});
