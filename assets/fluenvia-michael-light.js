/* Presentation only; never replace a live control or its listener. */
(() => {
  const labels = ['Warm-up','Vocabulary','Reading','Language practice','Decision lab','Role-play','Final discussion'];
  document.querySelectorAll('#lessonPages .activity-head').forEach((head,index)=>{
    head.dataset.lightSection = String(index+1).padStart(2,'0')+' / '+labels[index].toUpperCase();
    const title=head.querySelector('h2');
    if(title)for(const node of title.childNodes)if(node.nodeType===3)node.nodeValue=node.nodeValue.replace(/^\d+\.\s*/, '');
  });
  const brand=document.querySelector('header .lesson-brand');
  if(brand){const crumb=document.createElement('span');crumb.className='light-breadcrumb';crumb.textContent='Business English B2   /   AI in Finance';brand.after(crumb);}
  const menu=document.querySelector('.lesson-section-menu'),pager=document.querySelector('.pager'),back=document.querySelector('#back');
  if(menu&&pager&&back){
    const marker=document.createComment('Original section menu position');
    menu.before(marker);
    const desktop=window.matchMedia('(min-width: 1050px)');
    let mobileOpen=menu.open;
    const place=()=>{
      if(desktop.matches){
        if(menu.parentNode!==pager){mobileOpen=menu.open;back.after(menu);}
        menu.open=true;
      }else if(menu.parentNode===pager){marker.after(menu);menu.open=mobileOpen;}
    };
    if(desktop.addEventListener)desktop.addEventListener('change',place);else desktop.addListener(place);
    place();
  }
})();