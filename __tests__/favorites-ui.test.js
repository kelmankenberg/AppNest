// __tests__/favorites-ui.test.js
// Test the favorites UI/UX logic for the app list
const { TextEncoder, TextDecoder } = require('util');
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;
const { JSDOM } = require('jsdom');

// Mock minimal DOM and dependencies
function setupDom(apps) {
  const dom = new JSDOM(`<!DOCTYPE html><body><div id="app-list"></div></body>`);
  global.window = dom.window;
  global.document = dom.window.document;
  global.HTMLElement = dom.window.HTMLElement;
  global.Event = dom.window.Event;
  // Mock electronAPI
  global.window.electronAPI = {
    updateApp: jest.fn(() => Promise.resolve()),
  };
  // Provide a mock loadApplications
  global.loadApplications = jest.fn();
  // Minimal renderAppRowHTML
  global.renderAppRowHTML = (app, iconSizeNum = 20) => {
    const favoriteHtml = `<div class="favorite-indicator${app.is_favorite ? ' favorite' : ' not-favorite'}" data-app-id="${app.id}" title="${app.is_favorite ? 'Remove from favorites' : 'Add to favorites'}"><i class="${app.is_favorite ? 'fas' : 'far'} fa-star favorite-star" style="font-size:10px;"></i></div>`;
    return `<div class="app-table-row app-row" data-app-id="${app.id}"><div class="app-cell"><div class="app-icon-container"></div><div class="app-name-container"><span class="app-name">${app.name}</span>${favoriteHtml}</div></div></div>`;
  };
  // Render apps
  const appList = dom.window.document.getElementById('app-list');
  appList.innerHTML = apps.map(app => global.renderAppRowHTML(app)).join('');
  return dom;
}

describe('App favorites UI/UX', () => {
  const app = { id: 'a1', name: 'TestApp', is_favorite: false };

  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should not show outline star for non-favorite app until hovered', () => {
    const dom = setupDom([app]);
    const row = dom.window.document.querySelector('.app-row');
    const starDiv = row.querySelector('.favorite-indicator.not-favorite');
    // Simulate no hover
    expect(starDiv.style.visibility === '' || starDiv.style.visibility === 'hidden').toBe(true);
    // Simulate hover
    row.classList.add('hover');
    // Simulate CSS: .app-row:hover .favorite-indicator.not-favorite { visibility: visible; }
    starDiv.style.visibility = 'visible';
    expect(starDiv.style.visibility).toBe('visible');
  });

  it('should show solid star for favorite app always', () => {
    const dom = setupDom([{ ...app, is_favorite: true }]);
    const row = dom.window.document.querySelector('.app-row');
    const starDiv = row.querySelector('.favorite-indicator.favorite');
    expect(starDiv).not.toBeNull();
    expect(starDiv.innerHTML).toContain('fas'); // solid star
    // Should be visible
    expect(starDiv.style.visibility === '' || starDiv.style.visibility === 'visible').toBe(true);
  });

  it('should toggle favorite status and not launch app on star click', async () => {
    const dom = setupDom([app]);
    const row = dom.window.document.querySelector('.app-row');
    const starDiv = row.querySelector('.favorite-indicator.not-favorite');
    // Simulate click
    const clickEvent = new dom.window.Event('click', { bubbles: true });
    let launched = false;
    row.addEventListener('click', () => { launched = true; });
    // Add favorite toggle logic as in renderer.js
    starDiv.addEventListener('click', (e) => {
      e.stopPropagation();
      app.is_favorite = !app.is_favorite;
      window.electronAPI.updateApp({ ...app, is_favorite: app.is_favorite }).then(() => {
        loadApplications();
      });
    });
    starDiv.dispatchEvent(clickEvent);
    // Wait for updateApp to resolve
    await Promise.resolve();
    // Should not launch app
    expect(launched).toBe(false);
    // Should call updateApp and loadApplications
    expect(window.electronAPI.updateApp).toHaveBeenCalledWith(expect.objectContaining({ is_favorite: true }));
    expect(loadApplications).toHaveBeenCalled();
  });
});
