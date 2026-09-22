(() => {
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const header = document.querySelector('.site-header');
  const progress = document.querySelector('.scroll-progress');
  let scrollQueued = false;
  function updateScroll() {
    const y = window.scrollY;
    if (header) header.classList.toggle('is-scrolled', y > 12);
    if (progress) {
      const span = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${span > 0 ? Math.min(1, y / span) : 0})`;
    }
    const hero = document.querySelector('.hero');
    if (hero && !reducedMotion && window.innerWidth > 900 && y < 1000) {
      hero.style.backgroundPosition = `center calc(50% + ${Math.round(y * .18)}px)`;
    }
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateScroll); }
  }, { passive: true });
  updateScroll();
  const heroSurface = document.querySelector('.hero');
  if (heroSurface && !reducedMotion && window.matchMedia('(pointer: fine)').matches) {
    let pointerQueued = false, pointerX = 0, pointerY = 0;
    heroSurface.addEventListener('pointermove', event => {
      const bounds = heroSurface.getBoundingClientRect();
      pointerX = Math.round(event.clientX - bounds.left);
      pointerY = Math.round(event.clientY - bounds.top);
      if (!pointerQueued) {
        pointerQueued = true;
        requestAnimationFrame(() => {
          heroSurface.style.setProperty('--mx', `${pointerX}px`);
          heroSurface.style.setProperty('--my', `${pointerY}px`);
          pointerQueued = false;
        });
      }
    }, { passive: true });
  }

  const toggle = document.querySelector('.menu-toggle');
  const mobileNav = document.querySelector('.mobile-nav');
  function closeMenu() {
    if (!toggle || !mobileNav) return;
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Menüyü aç');
    mobileNav.classList.remove('is-open');
    document.body.classList.remove('menu-open');
  }
  if (toggle && mobileNav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') !== 'true';
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Menüyü kapat' : 'Menüyü aç');
      mobileNav.classList.toggle('is-open', open);
      document.body.classList.toggle('menu-open', open);
    });
    mobileNav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', event => { if (event.key === 'Escape') closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 850) closeMenu(); });
  }

  const revealItems = [...document.querySelectorAll('[data-reveal]')];
  if ('IntersectionObserver' in window && !reducedMotion) {
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      });
    }, { threshold: .1, rootMargin: '0px 0px -35px 0px' });
    revealItems.forEach(item => observer.observe(item));
  } else revealItems.forEach(item => item.classList.add('is-visible'));

  const counters = [...document.querySelectorAll('[data-counter]')];
  function runCounter(el) {
    const target = Number(el.dataset.counter || 0);
    if (reducedMotion || !Number.isFinite(target)) { el.textContent = String(target); return; }
    const start = performance.now(), duration = 1100;
    function frame(now) {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = String(Math.round(target * eased));
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }
  if ('IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) { runCounter(entry.target); counterObserver.unobserve(entry.target); }
      });
    }, { threshold: .5 });
    counters.forEach(el => counterObserver.observe(el));
  } else counters.forEach(runCounter);

  const catalog = document.querySelector('[data-catalog]');
  if (catalog) {
    const buttons = [...document.querySelectorAll('[data-filter]')];
    const cards = [...catalog.querySelectorAll('[data-product-card]')];
    const search = document.querySelector('#product-search');
    const count = document.querySelector('#product-count');
    const empty = document.querySelector('.empty-state');
    const moreWrap = document.querySelector('.load-more-wrap');
    const more = document.querySelector('#load-more');
    const pageSize = 20;
    let active = new URLSearchParams(location.search).get('kategori') || 'tumu';
    if (!buttons.some(b => b.dataset.filter === active)) active = 'tumu';
    let shown = pageSize;
    const normalize = value => (value || '').toLocaleLowerCase('tr-TR').trim();

    function render() {
      const query = normalize(search?.value);
      const matched = cards.filter(card =>
        (active === 'tumu' || card.dataset.category === active) &&
        (!query || normalize(card.dataset.search).includes(query))
      );
      cards.forEach(card => card.hidden = true);
      matched.slice(0, shown).forEach(card => card.hidden = false);
      buttons.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === active)));
      if (count) count.textContent = `${matched.length} ürün bulundu${matched.length > shown ? ` · ilk ${shown} gösteriliyor` : ''}`;
      if (empty) empty.classList.toggle('is-visible', matched.length === 0);
      if (moreWrap) moreWrap.hidden = matched.length <= shown;
    }
    function animateVisible(start = 0) {
      if (reducedMotion || !Element.prototype.animate) return;
      cards.filter(card => !card.hidden).slice(start, start + 12).forEach((card, index) => {
        card.animate([
          { opacity: 0, transform: 'translateY(16px)' },
          { opacity: 1, transform: 'translateY(0)' }
        ], { duration: 720, delay: Math.min(index, 7) * 45, easing: 'cubic-bezier(.19,1,.22,1)', fill: 'both' });
      });
    }

    buttons.forEach(button => button.addEventListener('click', () => {
      active = button.dataset.filter;
      shown = pageSize;
      const url = new URL(location.href);
      if (active === 'tumu') url.searchParams.delete('kategori');
      else url.searchParams.set('kategori', active);
      history.replaceState(null, '', url);
      render();
      animateVisible();
    }));
    search?.addEventListener('input', () => { shown = pageSize; render(); });
    more?.addEventListener('click', () => { const previous = shown; shown += pageSize; render(); animateVisible(previous); });
    render();
    animateVisible();
  }
})();
