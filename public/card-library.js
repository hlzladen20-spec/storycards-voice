export function setupCardLibrary({root,profile,choice}){
 const section=document.createElement('section');section.id='cardLibrary';section.className='panel hidden card-library';
 section.innerHTML='<div class="library-heading"><button class="ghost library-back" type="button">‹ Karten</button><h2>Meine Karten</h2></div><div class="library-tabs" role="group" aria-label="Kartensammlung"><button type="button" data-library="cards">Satzkarten</button><button type="button" data-library="vocabulary">Vokabeln</button></div><div class="library-cards"></div><div class="library-vocabulary" hidden></div>';
 root.append(section);
 const cards=profile.querySelector('.card-manager'),vocabulary=profile.querySelector('.vocab-management');
 if(cards){cards.open=true;section.querySelector('.library-cards').append(cards);}
 if(vocabulary)section.querySelector('.library-vocabulary').append(vocabulary);
 function addForm(host,form,label){
  if(!form)return;const details=document.createElement('details');details.className='library-add-form';const summary=document.createElement('summary');summary.textContent=label;details.append(summary,form);host.append(details);
 }
 if(cards)addForm(cards,cards.querySelector('.manager-form'),'＋ Eigene Satzkarte hinzufügen');
 if(vocabulary){addForm(vocabulary,vocabulary.querySelector('.vocab-add'),'＋ Eigenen Kurzsatz hinzufügen');const main=vocabulary.querySelector('.vocab-manager'),learned=vocabulary.querySelector('.vocab-learned');if(main&&learned)vocabulary.insertBefore(main,learned);}
 const entry=document.createElement('button');entry.type='button';entry.className='secondary library-open';entry.textContent='Meine Karten verwalten →';choice.append(entry);
 const tabs=[...section.querySelectorAll('[data-library]')];
 function select(kind){
  section.querySelector('.library-cards').hidden=kind!=='cards';section.querySelector('.library-vocabulary').hidden=kind!=='vocabulary';
  tabs.forEach(tab=>tab.setAttribute('aria-pressed',String(tab.dataset.library===kind)));
 }
 function open(kind='cards'){
  for(const area of root.querySelectorAll(':scope > section'))area.classList.add('hidden');
  section.classList.remove('hidden');select(kind);
  if(cards)cards.open=true;
  const list=vocabulary?.querySelector('.vocab-manager');if(list)list.open=true;
 }
 for(const tab of tabs)tab.onclick=()=>select(tab.dataset.library);
 entry.onclick=()=>open();section.querySelector('.library-back').onclick=()=>document.getElementById('choiceCardsButton').click();
 document.addEventListener('storycards-open-library',event=>open(event.detail||'cards'));
 select('cards');return {section,open};
}
