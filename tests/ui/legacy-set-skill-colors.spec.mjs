import {test,expect} from '@playwright/test';

test('learned/gray icons stay correct even if the archived engine replaces the global Set',async({page})=>{
  await page.goto('/?ui=ru');
  const data=await page.evaluate(()=>{
    const first=document.querySelector('#LearnView [id^="LearnSkillIcon_"]');
    if(!first)throw Error('Native skill icon list is empty');
    const second=[...document.querySelectorAll('#LearnView [id^="LearnSkillIcon_"]')]
      .find(node=>node.id!==first.id);
    if(!second)throw Error('Need a second native skill icon');
    const match=first.id.match(/^LearnSkillIcon_(\d+)_(\d+)$/);
    if(!match)throw Error('Native icon identity changed');
    const key=match[1]+'_'+match[2],originalLearn=window.Learn,
      originalFlag=window.Flag[3],originalSet=window.Set;
    try{
      window.Flag[3]=1;
      window.Learn=[[key],[],[],[]];
      window.Set=function ShadowedLegacySet(){throw Error('Native Set is not safe here');};
      window.PandoraRemaked.skillControls.syncLearningColors();
      return {first:first.style.backgroundImage,second:second.style.backgroundImage,
        learned:key,originalSetWasFunction:typeof originalSet==='function'};
    }finally{
      window.Set=originalSet;
      window.Learn=originalLearn;
      window.Flag[3]=originalFlag;
      window.PandoraRemaked.skillControls.syncLearningColors();
    }
  });
  expect(data.first).not.toContain('gray/');
  expect(data.second).toContain('gray/');
  expect(data.first).toContain('.png');
  expect(data.second).toContain('.png');
});
