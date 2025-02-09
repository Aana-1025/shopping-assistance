const API_URL = 'https://fakestoreapi.com';
const PLACES_API_URL = 'https://places.googleapis.com/v1/places:searchNearby';
const PLACES_API_KEY = 'AIzaSyASh4l8NPbO1XRuedGY0MXqtdWUNphmYI4'; 

let products = [];
let shoppingLists = [];
let priceAlerts = [];
let userLocation = null;

async function init() {
  await loadProducts();
  loadSavedData();
  setupEventListeners();
  renderShoppingLists();
  renderComparison();
  renderPriceAlerts();
  getUserLocation();
}

function setupEventListeners() {
  const createListBtn = document.querySelector('.new-list button');
  createListBtn.addEventListener('click', createNewList);

  const findStoresBtn = document.getElementById('findStores');
  findStoresBtn.addEventListener('click', findNearbyStores);
}

function getUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        userLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        };
      },
      (error) => {
        console.error('Error getting location:', error);
        alert('Please enable location services to find nearby stores.');
      }
    );
  } else {
    alert('Geolocation is not supported by your browser.');
  }
}

async function findNearbyStores() {
  if (!userLocation) {
    alert('Please wait for location data to load or enable location services.');
    return;
  }

  const radius = parseFloat(document.getElementById('searchRadius').value) * 1000; 
  
  try {
    const response = await fetch(PLACES_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': PLACES_API_KEY,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.rating'
      },
      body: JSON.stringify({
        locationBias: {
          circle: {
            center: userLocation,
            radius: radius.toString()
          }
        },
        includedTypes: ['shopping_mall', 'supermarket', 'department_store']
      })
    });

    const data = await response.json();
    renderStores(data.places || []);
  } catch (error) {
    console.error('Error fetching nearby stores:', error);
    alert('Error finding nearby stores. Please try again later.');
  }
}

function renderStores(stores) {
  const container = document.getElementById('storesList');
  if (stores.length === 0) {
    container.innerHTML = '<p>No stores found in the specified radius.</p>';
    return;
  }

  container.innerHTML = stores.map(store => `
    <div class="store-item">
      <h3>${store.displayName.text}</h3>
      <p>${store.formattedAddress}</p>
      ${store.rating ? `<p>Rating: ${store.rating} ⭐</p>` : ''}
    </div>
  `).join('');
}

async function loadProducts() {
  try {
    const response = await fetch(`${API_URL}/products`);
    const data = await response.json();
    products = data.map(item => ({
      id: item.id,
      name: item.title,
      price: item.price,
      store: 'Fake Store',
      rating: item.rating.rate,
      image: item.image,
      description: item.description
    }));
  } catch (error) {
    console.error('Error loading products:', error);
    products = [];
  }
}

function loadSavedData() {
  const savedLists = localStorage.getItem('shoppingLists');
  shoppingLists = savedLists ? JSON.parse(savedLists) : [];

  priceAlerts = products.map(product => ({
    productId: product.id,
    threshold: product.price * 0.9,
    currentPrice: product.price,
    previousPrice: product.price * 1.1 
  }));
}

function createNewList() {
  const input = document.getElementById('listName');
  const name = input.value.trim();
  
  if (name) {
    const newList = {
      id: Date.now(),
      name,
      items: []
    };
    
    shoppingLists.push(newList);
    saveShoppingLists();
    renderShoppingLists();
    input.value = '';
  }
}

function saveShoppingLists() {
  localStorage.setItem('shoppingLists', JSON.stringify(shoppingLists));
}

function renderShoppingLists() {
  const container = document.getElementById('shoppingLists');
  container.innerHTML = shoppingLists.map(list => `
    <div class="shopping-list">
      <h3>${list.name}</h3>
      <div class="list-items">
        ${list.items.map(itemId => {
          const product = products.find(p => p.id === itemId);
          if (!product) return '';
          return `
            <div class="list-item" data-list-id="${list.id}" data-product-id="${product.id}">
              <img src="${product.image}" alt="${product.name}" class="product-thumbnail">
              <div class="product-info">
                <div>${product.name}</div>
                <div class="price">$${product.price.toFixed(2)}</div>
              </div>
              <button class="remove-btn">×</button>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');


  container.querySelectorAll('.remove-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const item = e.target.closest('.list-item');
      const listId = parseInt(item.dataset.listId);
      const productId = parseInt(item.dataset.productId);
      removeFromList(listId, productId);
    });
  });
}

function renderComparison() {
  const tbody = document.getElementById('compareBody');
  tbody.innerHTML = products.map(product => `
    <tr>
      <td>
        <div class="product-cell">
          <img src="${product.image}" alt="${product.name}" class="product-thumbnail">
          <div>
            <div>${product.name}</div>
            <div class="product-description">${product.description.substring(0, 100)}...</div>
          </div>
        </div>
      </td>
      <td>$${product.price.toFixed(2)}</td>
      <td>${product.store}</td>
      <td>${product.rating}/5</td>
      <td>
        <button class="add-to-list" data-product-id="${product.id}">Add to List</button>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('.add-to-list').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = parseInt(e.target.dataset.productId);
      addToList(productId);
    });
  });
}

function renderPriceAlerts() {
  const container = document.getElementById('alertsContainer');
  container.innerHTML = priceAlerts.map(alert => {
    const product = products.find(p => p.id === alert.productId);
    if (!product) return '';
    
    const priceDiff = alert.currentPrice - alert.previousPrice;
    const priceClass = priceDiff < 0 ? 'price-decrease' : priceDiff > 0 ? 'price-increase' : '';
    
    return `
      <div class="alert-item">
        <div class="alert-product">
          <img src="${product.image}" alt="${product.name}" class="product-thumbnail">
          <div>
            <strong>${product.name}</strong>
            <div class="${priceClass}">
              Current: $${alert.currentPrice.toFixed(2)}
              (${priceDiff < 0 ? '↓' : priceDiff > 0 ? '↑' : '='} 
              ${Math.abs(priceDiff).toFixed(2)})
            </div>
            <div class="alert-threshold">
              Alert when below: $${alert.threshold.toFixed(2)}
            </div>
          </div>
        </div>
        <button class="update-alert" data-product-id="${alert.productId}">Update Alert</button>
      </div>
    `;
  }).join('');

  container.querySelectorAll('.update-alert').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const productId = parseInt(e.target.dataset.productId);
      updateAlert(productId);
    });
  });
}

function addToList(productId) {
  if (shoppingLists.length > 0) {
    shoppingLists[0].items.push(productId);
    saveShoppingLists();
    renderShoppingLists();
  } else {
    alert('Create a shopping list first!');
  }
}

function removeFromList(listId, productId) {
  const list = shoppingLists.find(l => l.id === listId);
  if (list) {
    list.items = list.items.filter(id => id !== productId);
    saveShoppingLists();
    renderShoppingLists();
  }
}

function updateAlert(productId) {
  const alert = priceAlerts.find(a => a.productId === productId);
  if (alert) {
    alert.threshold = alert.currentPrice * 0.9;
    renderPriceAlerts();
  }
}

init();