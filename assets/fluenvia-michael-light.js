/* Presentation only; never replace a live control or its listener. */
(() => {
  const labels = ['Warm-up','Vocabulary','Reading','Language practice','Decision lab','Role-play','Final discussion'];
  document.querySelectorAll('#lessonPages .activity-head').forEach((head,index)=>{
    head.dataset.lightSection = String(index+1).padStart(2,'0')+' / '+labels[index].toUpperCase();
    const title=head.querySelector('h2');
    if(title)title.textContent=title.textContent.replace(/^\d+\.\s*/, '');
  });
  const brand=document.querySelector('header .lesson-brand');
  if(brand){const crumb=document.createElement('span');crumb.className='light-breadcrumb';crumb.textContent='Business English B2   /   AI in Finance';brand.after(crumb);}
})();