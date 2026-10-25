// Use the same destinations and icons during a conversation as on every main page.
const conversationNav = document.createElement('nav');
conversationNav.className = 'bottom-nav conversation-nav';
conversationNav.setAttribute('aria-label', 'Hauptmenü');
for (const [label, target] of [['Home', 'homeNavButton'], ['Karten', 'cardsNavButton'], ['Statistiken', 'progressNavButton'], ['Profil', 'profileNavButton']]) {
  const button = document.createElement('button');
  button.type = 'button';
  const caption = document.createElement('small');
  caption.textContent = label;
  button.append(caption);
  button.addEventListener('click', () => document.getElementById(target).click());
  conversationNav.append(button);
}
document.getElementById('practice').append(conversationNav);

const drawings = {
  Home: '<path d="m3 10 9-7 9 7v10H15v-7H9v7H3Z"/>',
  Karten: '<rect x="7" y="3" width="13" height="17" rx="2"/><path d="m7 6-3 1a2 2 0 0 0-1.4 2.4l3 11a2 2 0 0 0 2.4 1.4l5-1.4M11 7h5M11 11h4"/>',
  Statistiken: '<rect x="3" y="12" width="4" height="9" rx="1"/><rect x="10" y="3" width="4" height="18" rx="1"/><rect x="17" y="8" width="4" height="13" rx="1"/>',
  Profil: '<circle cx="12" cy="7" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2Z"/>'
};
document.querySelectorAll('.bottom-nav button').forEach((button) => {
  const label = button.querySelector('small');
  if (!label) return;
  const name = label.textContent.trim().split(/\s/)[0];
  if (!drawings[name]) return;
  [...button.childNodes].filter((node) => node !== label).forEach((node) => node.remove());
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  icon.setAttribute('viewBox', '0 0 24 24'); icon.setAttribute('aria-hidden', 'true');
  icon.innerHTML = drawings[name]; button.prepend(icon);
  if (name === 'Home') icon.classList.add('home-icon');
  if (button.classList.contains('active')) button.setAttribute('aria-current', 'page');
});
